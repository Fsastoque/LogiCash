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
    tipo: 'egreso_variable',
    categoria_id: '',
    cuenta_id: '',
    cuenta_destino_id: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  const accountOptions = useMemo(() => {
    return accounts.map(acc => (
      <SelectItem key={acc.id} value={acc.id}>{acc.nombre}</SelectItem>
    ));
  }, [accounts]);

  const destinationAccountOptions = useMemo(() => {
    return accounts
      .filter(acc => String(acc.id) !== formData.cuenta_id)
      .map(acc => (
        <SelectItem key={acc.id} value={String(acc.id)}>{acc.nombre}</SelectItem>
      ));
  }, [accounts, formData.cuenta_id]);

  const selectedAccount = accounts.find(
    acc => String(acc.id) === String(formData.cuenta_id)
  );

  useEffect(() => {
    // Reset category selection when changing type to avoid cross-type mismatch
    setFormData(prev => ({ 
      ...prev, 
      categoria_id: '',
      cuenta_destino_id: prev.tipo === 'traslado' ? prev.cuenta_destino_id : ''
    }));
  }, [formData.tipo]);


  const categoryOptions = useMemo(() => {
    return categories
      .filter(cat => {        
        if (formData.tipo === 'egreso_fijo') {
          return cat.es_fijo === true;
        }
        if (formData.tipo === 'egreso_variable') {
          return cat.es_fijo === false || cat.es_fijo === null || cat.es_fijo === undefined;
        }
        return true;  
      })
      .map(cat => (
        <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
      ));
  }, [categories, formData.tipo]);

  /*const categoryOptions = useMemo(() => {
    return categories.map(cat => (
      <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
    ));
  }, [categories]);*/

  const selectedCategory = categories.find(
    cat => String(cat.id) === String(formData.categoria_id)
  );

  const [savingSettings, setSavingSettings] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);

  /*useEffect(() => {
    // Reset form data when accounts or categories change to ensure matched selection
    if (accounts.length > 0 && !formData.cuenta_id) {
      // Don't auto-select to avoid accidental entries, but ensure empty state is clean
    }
  }, [accounts, categories]);*/

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

    if (formData.tipo === 'traslado') {
      if (!formData.cuenta_id || !formData.cuenta_destino_id) {
        warning('Datos incompletos', 'Por favor seleccione cuenta de origen y de destino');
        return;
      }
      if (formData.cuenta_id === formData.cuenta_destino_id) {
        warning('Cuentas idénticas', 'La cuenta de origen y destino deben ser diferentes');
        return;
      }
    } else {    
      if (!formData.cuenta_id || !formData.categoria_id) {
        warning('Datos incompletos', 'Por favor seleccione cuenta y categoría');
        return;
      }
    }

    setLoading(true);
    try {
      const montoNum = parseFloat(formData.monto);

      if (formData.tipo === 'traslado') {
        // Find or create "Traslado de Fondos" category
        let trasladoCatId = '';
        const existingCat = categories.find(c => c.nombre === 'Traslado de Fondos');
        if (existingCat) {
          trasladoCatId = existingCat.id;
        } else {
          const { data: newCat, error: catError } = await supabase
            .from('categorias')
            .insert([{ nombre: 'Traslado de Fondos', user_id: user.id, es_fijo: null }])
            .select()
            .single();
          if (catError) throw catError;
          trasladoCatId = newCat.id;
        }

        const accountOrigen = accounts.find(a => String(a.id) === formData.cuenta_id);
        const accountDestino = accounts.find(a => String(a.id) === formData.cuenta_destino_id);

        if (!accountOrigen || !accountDestino) {
          throw new Error('No se encontraron las cuentas seleccionadas');
        }

        const descBase = formData.descripcion ? ` - ${formData.descripcion}` : '';

        // 1. Insert Egreso Transaction (Origin)
        const { error: insertEgresoErr } = await supabase.from('transacciones').insert([{
          monto: montoNum,
          descripcion: `Traslado a ${accountDestino.nombre}${descBase}`,
          tipo: 'egreso',
          categoria_id: trasladoCatId,
          cuenta_id: accountOrigen.id,
          fecha: formData.fecha,
          user_id: user.id
        }]);
        if (insertEgresoErr) throw insertEgresoErr;

        // 2. Insert Ingreso Transaction (Destination)
        const { error: insertIngresoErr } = await supabase.from('transacciones').insert([{
          monto: montoNum,
          descripcion: `Traslado desde ${accountOrigen.nombre}${descBase}`,
          tipo: 'ingreso',
          categoria_id: trasladoCatId,
          cuenta_id: accountDestino.id,
          fecha: formData.fecha,
          user_id: user.id
        }]);
        if (insertIngresoErr) throw insertIngresoErr;

        // 3. Update Account Balances
        const newBalanceOrigen = Number(accountOrigen.saldo_actual) - montoNum;
        const newBalanceDestino = Number(accountDestino.saldo_actual) + montoNum;

        const { error: updateOrigenErr } = await supabase
          .from('cuentas')
          .update({ saldo_actual: newBalanceOrigen })
          .eq('id', accountOrigen.id);
        if (updateOrigenErr) throw updateOrigenErr;

        const { error: updateDestinoErr } = await supabase
          .from('cuentas')
          .update({ saldo_actual: newBalanceDestino })
          .eq('id', accountDestino.id);
        if (updateDestinoErr) throw updateDestinoErr;

        success('Traslado Completado', 'El movimiento de fondos se ha procesado con éxito.');
      } else {

      const dbTipo = (formData.tipo === 'egreso_fijo' || formData.tipo === 'egreso_variable' || formData.tipo === 'egreso') 
        ? 'egreso' 
        : 'ingreso';
      
      // 1. Insert transaction
      const { error: insertErr } = await supabase.from('transacciones').insert([{
        monto: montoNum,
        descripcion: formData.descripcion,
        tipo: dbTipo,
        categoria_id: formData.categoria_id,
        cuenta_id: formData.cuenta_id,
        fecha: formData.fecha,
        user_id: user.id
      }]);

      console.log("data:", insertErr);

      if (insertErr) throw insertErr;

      // 2. Update account balance
      const accountId = formData.cuenta_id;
      const account = accounts.find(a => a.id === accountId);
      
      if (account) {
        const isIncome = dbTipo === 'ingreso';
        const newBalance = isIncome 
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
    }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <SelectItem value="egreso_fijo">Egreso Fijo</SelectItem>
              <SelectItem value="egreso_variable">Egreso Variable</SelectItem>
              <SelectItem value="ingreso">Ingreso</SelectItem>
              <SelectItem value="egreso">Egreso (Gral)</SelectItem>
              <SelectItem value="traslado">Traslado entre Cuentas</SelectItem>
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
            className="bg-zinc-950 border-zinc-800 w-full"
            value={formData.monto}
            onChange={(e) => setFormData(prev => ({...prev, monto: e.target.value}))}
          />
        </div>
      </div>
      {formData.tipo === 'traslado' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase">Cuenta Origen</Label>
            <Select 
              value={formData.cuenta_id} 
              onValueChange={(v) => {
                if (v) setFormData(prev => ({...prev, cuenta_id: v}));
              }}
              disabled={isDataLoading}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800 w-full text-left">
                <SelectValue placeholder={isDataLoading ? "Cargando..." : "Seleccionar origen"} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {accountOptions}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase">Cuenta Destino</Label>
            <Select 
              value={formData.cuenta_destino_id} 
              onValueChange={(v) => {
                if (v) setFormData(prev => ({...prev, cuenta_destino_id: v}));
              }}
              disabled={isDataLoading || !formData.cuenta_id}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800 w-full text-left">
                <SelectValue placeholder={isDataLoading ? "Cargando..." : !formData.cuenta_id ? "Primero selecciona origen" : "Seleccionar destino"} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {destinationAccountOptions}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <>
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
      </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase">Fecha</Label>
          <Input 
            type="date"
            required
            className="bg-zinc-950 border-zinc-800 w-full"
            value={formData.fecha}
            onChange={(e) => setFormData(prev => ({...prev, fecha: e.target.value}))}
          />
        </div>

      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase">Descripción</Label>
        <Input 
          placeholder={formData.tipo === 'traslado' ? "Ej. Retiro de cajero" : "Ej. Compra de supermercado"}
          className="bg-zinc-950 border-zinc-800 w-full"
          value={formData.descripcion}
          onChange={(e) => setFormData(prev => ({...prev, descripcion: e.target.value}))}
        />
      </div>
       </div>

      <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
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
