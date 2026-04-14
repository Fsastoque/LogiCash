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
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Ahorros',
    saldo_actual: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('cuentas').insert([{
        ...formData,
        user_id: user.id,
        saldo_actual: parseFloat(formData.saldo_actual || '0')
      }]);

      if (error) throw error;

      toast.success('Cuenta creada');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-mono uppercase tracking-widest">Nueva Cuenta</DialogTitle>
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

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-500">Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? 'Creando...' : 'Crear Cuenta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
