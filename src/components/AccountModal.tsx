import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: any; // Optional account for editing
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSuccess, account }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Ahorros',
    saldo_actual: ''
  });

  // Initialize form when account changes
  React.useEffect(() => {
    if (account) {
      setFormData({
        nombre: account.nombre,
        tipo: account.tipo,
        saldo_actual: account.saldo_actual.toString()
      });
    } else {
      setFormData({
        nombre: '',
        tipo: 'Ahorros',
        saldo_actual: ''
      });
    }
  }, [account, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      if (account) {
        // Update
        const { error } = await supabase
          .from('cuentas')
          .update({
            ...formData,
            saldo_actual: parseFloat(formData.saldo_actual || '0')
          })
          .eq('id', account.id);
        if (error) throw error;
        toast.success('Cuenta actualizada');
      } else {
        // Insert
        const { error } = await supabase.from('cuentas').insert([{
          ...formData,
          user_id: user.id,
          saldo_actual: parseFloat(formData.saldo_actual || '0')
        }]);
        if (error) throw error;
        toast.success('Cuenta creada');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!account || !confirm('¿Estás seguro de eliminar esta cuenta? Se eliminarán también sus transacciones.')) return;
    setDeleteLoading(true);

    try {
      // Transactions will be deleted by cascade if RLS/Foreign keys are set up correctly, 
      // but let's be explicit if needed. Usually Supabase handles this if configured.
      const { error } = await supabase
        .from('cuentas')
        .delete()
        .eq('id', account.id);

      if (error) throw error;

      toast.success('Cuenta eliminada');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-mono uppercase tracking-widest">
            {account ? 'Editar Cuenta' : 'Nueva Cuenta'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase">Nombre de la Cuenta</Label>
            <Input 
              placeholder="Ej: Nequi, Banco X, Efectivo"
              required
              className="bg-zinc-950 border-zinc-800"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase">Tipo</Label>
            <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectItem value="Ahorros">Ahorros</SelectItem>
                <SelectItem value="Corriente">Corriente</SelectItem>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                <SelectItem value="Inversión">Inversión</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase">Saldo Inicial</Label>
            <Input 
              type="number" 
              step="0.01"
              required
              className="bg-zinc-950 border-zinc-800"
              value={formData.saldo_actual}
              onChange={(e) => setFormData({...formData, saldo_actual: e.target.value})}
            />
          </div>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
            {account && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={deleteLoading}
                className="w-full sm:w-auto sm:mr-auto order-3 sm:order-1 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : 'Eliminar Cuenta'}
              </Button>
            )}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose} 
                className="w-full sm:w-auto text-zinc-500 order-2 sm:order-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] order-1 sm:order-2"
              >
                {loading ? 'Procesando...' : (account ? 'Guardar Cambios' : 'Crear Cuenta')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
