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
  accounts: propsAccounts,
  categories: propsCategories
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Local copies that only update when data is actually present
  const [localAccounts, setLocalAccounts] = useState<any[]>([]);
  const [localCategories, setLocalCategories] = useState<any[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    monto: '',
    descripcion: '',
    tipo: 'egreso',
    categoria_id: '',
    cuenta_id: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Update local lists only if they have data
  useEffect(() => {
    if (propsAccounts && propsAccounts.length > 0) setLocalAccounts(propsAccounts);
    if (propsCategories && propsCategories.length > 0) setLocalCategories(propsCategories);
    
    if (propsAccounts?.length > 0 && propsCategories?.length > 0) {
      setIsDataLoaded(true);
    }
  }, [propsAccounts, propsCategories]);

  // Reset form ONLY on explicit open
  useEffect(() => {
    if (isOpen) {
      setFormData({
        monto: '',
        descripcion: '',
        tipo: 'egreso',
        categoria_id: '',
        cuenta_id: '',
        fecha: new Date().toISOString().split('T')[0]
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.cuenta_id || !formData.categoria_id) {
      toast.error('Por favor seleccione cuenta y categoría');
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

      // Update account balance
      const account = localAccounts.find(a => String(a.id) === String(formData.cuenta_id));
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
        
        {!isDataLoaded ? (
          <div className="py-20 text-center text-zinc-500 font-mono text-xs animate-pulse">
            SINCRONIZANDO RECURSOS...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase">Tipo</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(v) => setFormData(prev => ({...prev, tipo: v}))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 capitalize w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="egreso">Egreso</SelectItem>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase">Monto</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="bg-zinc-950 border-zinc-800"
                  value={formData.monto}
                  onChange={(e) => setFormData(prev => ({...prev, monto: e.target.value}))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase">Cuenta</Label>
              <Select 
                value={formData.cuenta_id} 
                onValueChange={(v) => setFormData(prev => ({...prev, cuenta_id: v}))}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 w-full text-left">
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {localAccounts.map(acc => (
                    <SelectItem key={acc.id} value={String(acc.id)}>{acc.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase">Categoría</Label>
              <Select 
                value={formData.categoria_id} 
                onValueChange={(v) => setFormData(prev => ({...prev, categoria_id: v}))}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 w-full text-left">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {localCategories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase">Descripción</Label>
              <Input 
                placeholder="Ej. Compra de supermercado"
                className="bg-zinc-950 border-zinc-800"
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({...prev, descripcion: e.target.value}))}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-500">Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                {loading ? 'Guardando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
