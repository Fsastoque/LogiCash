import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotify } from '../hooks/useNotify';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: any[];
  categories: any[];
}

// Sub-component to encapsulate the form state and logic
// This ensures that state is isolated and resets correctly when the modal opens/closes
const TransactionForm: React.FC<{
  accounts: any[];
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ accounts, categories, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { success, error, warning } = useNotify();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    monto: '',
    descripcion: '',
    tipo: 'egreso',
    categoria_id: '',
    cuenta_id: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  const accountOptions = useMemo(() => {
    return accounts.map(acc => (
      <SelectItem key={acc.id} value={acc.id}>{acc.nombre}</SelectItem>
    ));
  }, [accounts]);

  const selectedAccount = accounts.find(
    acc => String(acc.id) === String(formData.cuenta_id)
  );

  const categoryOptions = useMemo(() => {
    return categories.map(cat => (
      <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
    ));
  }, [categories]);

  const selectedCategory = categories.find(
    cat => String(cat.id) === String(formData.categoria_id)
  );

  const [savingSettings, setSavingSettings] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    // Reset form data when accounts or categories change to ensure matched selection
    if (accounts.length > 0 && !formData.cuenta_id) {
      // Don't auto-select to avoid accidental entries, but ensure empty state is clean
    }
  }, [accounts, categories]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      const { data: profile } = await supabase.from('perfiles').select('ahorro_porcentaje').eq('id', user.id).single();
      const { data: metas } = await supabase.from('metas_ahorro').select('*').eq('user_id', user.id);
      if (profile) setSavingSettings(profile);
      if (metas) setGoals(metas);
    };
    fetchSettings();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.cuenta_id || !formData.categoria_id) {
      warning('Datos incompletos', 'Por favor seleccione cuenta y categoría');
      return;
    }

    setLoading(true);
    try {
      const montoNum = parseFloat(formData.monto);
      
      // 1. Insert transaction
      const { error: insertErr } = await supabase.from('transacciones').insert([{
        ...formData,
        user_id: user.id,
        monto: montoNum
      }]);

      console.log("data:", insertErr);

      if (insertErr) throw insertErr;

      // 2. Update account balance
      const accountId = formData.cuenta_id;
      const account = accounts.find(a => a.id === accountId);
      
      if (account) {
        const newBalance = formData.tipo === 'ingreso' 
          ? Number(account.saldo_actual) + montoNum
          : Number(account.saldo_actual) - montoNum;
        
        await supabase.from('cuentas').update({ saldo_actual: newBalance }).eq('id', account.id);
      }

      // 3. Automatic Saving Logic
      if (formData.tipo === 'ingreso' && savingSettings?.ahorro_porcentaje > 0 && goals.length > 0) {
        const ahorroMonto = (montoNum * savingSettings.ahorro_porcentaje) / 100;
        // Apply to the first goal for simplicity in this version
        const targetGoal = goals[0];
        if (targetGoal) {
          const { error: goalErr } = await supabase
            .from('metas_ahorro')
            .update({ monto_actual: Number(targetGoal.monto_actual) + ahorroMonto })
            .eq('id', targetGoal.id);
          
          if (!goalErr) {
            success(`Ahorro automático`, `$${ahorroMonto.toLocaleString()} asignados a "${targetGoal.nombre}"`);
          }
        }
      }

      success('Gasto Registrado', 'La transacción se ha procesado con éxito.');
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Fallo en transacción', err);
    } finally {
      setLoading(false);
    }
  };

  const isDataLoading = accounts.length === 0 || categories.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase">Tipo</Label>
          <Select 
            value={formData.tipo} 
            onValueChange={(v) => {
              if (v) setFormData(prev => ({...prev, tipo: v}));
            }}
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
          onValueChange={(v) => {
            console.log("valor seleccionado:", v);
            if (v) setFormData(prev => ({...prev, cuenta_id: v}));
          }}
          disabled={isDataLoading}
        >
          <SelectTrigger className="bg-zinc-950 border-zinc-800 w-full text-left">
            <SelectValue>  {selectedAccount?.nombre || (isDataLoading ? "Cargando..." : "Seleccionar cuenta")} </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            {accountOptions}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase">Categoría</Label>
        <Select 
          value={formData.categoria_id} 
          onValueChange={(v) => {
            console.log("valor seleccionado categoria:", v);
            if (v) setFormData(prev => ({...prev, categoria_id: v}));
          }}
          disabled={isDataLoading}
        >
          <SelectTrigger className="bg-zinc-950 border-zinc-800 w-full text-left">
            <SelectValue>  {selectedCategory?.nombre || (isDataLoading ? "Cargando..." : "Seleccionar categoría")} </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            {categoryOptions}
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
  );
};

export const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  accounts,
  categories
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-mono uppercase tracking-widest">Nueva Transacción</DialogTitle>
        </DialogHeader>
        {/* We only mount the form when modal is open to ensure clean state and isolated cycles */}
        {isOpen && (
          <TransactionForm 
            accounts={accounts}
            categories={categories}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
