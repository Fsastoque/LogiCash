import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: any[];
  categories: any[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  accounts,
  categories
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    monto: '',
    descripcion: '',
    tipo: 'egreso',
    categoria_id: '',
    cuenta_id: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Track if modal was already open to prevent over-fetching/resets
  const [lastOpenState, setLastOpenState] = useState(false);

  useEffect(() => {
    if (isOpen && !lastOpenState) {
      // Just opened
      setFormData({
        monto: '',
        descripcion: '',
        tipo: 'egreso',
        categoria_id: '',
        cuenta_id: '',
        fecha: new Date().toISOString().split('T')[0]
      });
    }
    setLastOpenState(isOpen);
  }, [isOpen, lastOpenState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.cuenta_id || !formData.categoria_id) {
      toast.error('Debe seleccionar cuenta y categoría');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('transacciones').insert([{
        ...formData,
        user_id: user.id,
        monto: parseFloat(formData.monto)
      }]);

      if (error) throw error;

      // Update account balance (simplified logic)
      const account = accounts.find(a => a.id === formData.cuenta_id);
      if (account) {
        const newBalance = formData.tipo === 'ingreso' 
          ? Number(account.saldo_actual) + parseFloat(formData.monto)
          : Number(account.saldo_actual) - parseFloat(formData.monto);
        
        await supabase.from('cuentas').update({ saldo_actual: newBalance }).eq('id', account.id);
      }

      toast.success('Transacción registrada');
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
          <DialogTitle className="text-xl font-bold font-mono uppercase tracking-widest">Nueva Transacción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase">Tipo</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(v) => setFormData(prev => ({...prev, tipo: v}))}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="egreso" className="capitalize">Egreso</SelectItem>
                  <SelectItem value="ingreso" className="capitalize">Ingreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase">Monto</Label>
              <Input 
                type="number" 
                step="0.01"
                required
                className="bg-zinc-950 border-zinc-800"
                value={formData.monto}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({...prev, monto: val}));
                }}
              />
            </div>
          </div>

          <div className="space-y-2" key={`acc-wrapper-${accounts.length}`}>
            <Label className="text-zinc-400 text-xs uppercase">Cuenta</Label>
            <Select 
              value={formData.cuenta_id} 
              onValueChange={(v) => setFormData(prev => ({...prev, cuenta_id: v}))}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2" key={`cat-wrapper-${categories.length}`}>
            <Label className="text-zinc-400 text-xs uppercase">Categoría</Label>
            <Select 
              value={formData.categoria_id} 
              onValueChange={(v) => setFormData(prev => ({...prev, categoria_id: v}))}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase">Descripción</Label>
            <Input 
              className="bg-zinc-950 border-zinc-800"
              value={formData.descripcion}
              onChange={(e) => {
                const val = e.target.value;
                setFormData(prev => ({...prev, descripcion: val}));
              }}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-500">Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
