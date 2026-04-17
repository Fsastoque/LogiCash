import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Target, Calendar, MinusCircle, PlusCircle } from 'lucide-react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal?: any;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSuccess, goal }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [monto_objetivo, setMontoObjetivo] = useState('');
  const [monto_actual, setMontoActual] = useState('');
  const [fecha_limite, setFechaLimite] = useState('');
  const [color, setColor] = useState('#4f46e5');

  useEffect(() => {
    if (goal) {
      setNombre(goal.nombre);
      setMontoObjetivo(goal.monto_objetivo.toString());
      setMontoActual(goal.monto_actual.toString());
      setFechaLimite(goal.fecha_limite || '');
      setColor(goal.color || '#4f46e5');
    } else {
      setNombre('');
      setMontoObjetivo('');
      setMontoActual('0');
      setFechaLimite('');
      setColor('#4f46e5');
    }
  }, [goal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const payload = {
        user_id: user.id,
        nombre,
        monto_objetivo: Number(monto_objetivo),
        monto_actual: Number(monto_actual),
        fecha_limite: fecha_limite || null,
        color
      };

      if (goal) {
        const { error } = await supabase
          .from('metas_ahorro')
          .update(payload)
          .eq('id', goal.id);
        if (error) throw error;
        toast.success('Meta actualizada');
      } else {
        const { error } = await supabase
          .from('metas_ahorro')
          .insert([payload]);
        if (error) throw error;
        toast.success('Meta creada con éxito');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!goal || !window.confirm('¿Eliminar esta meta?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('metas_ahorro')
        .delete()
        .eq('id', goal.id);
      if (error) throw error;
      toast.success('Meta eliminada');
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
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Target className="w-5 h-5 text-indigo-500" />
            {goal ? 'Editar Meta' : 'Nueva Meta de Ahorro'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Nombre del Objetivo</Label>
              <Input
                id="nombre"
                placeholder="Ej. Viaje a Japón"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="progreso" className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Monto Actual</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                  <Input
                    id="progreso"
                    type="number"
                    value={monto_actual}
                    onChange={(e) => setMontoActual(e.target.value)}
                    required
                    className="bg-zinc-950 border-zinc-800 pl-7 text-emerald-400 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="objetivo" className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Meta Final</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                  <Input
                    id="objetivo"
                    type="number"
                    value={monto_objetivo}
                    onChange={(e) => setMontoObjetivo(e.target.value)}
                    required
                    className="bg-zinc-950 border-zinc-800 pl-7 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha" className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha Límite (Opcional)
              </Label>
              <Input
                id="fecha"
                type="date"
                value={fecha_limite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Identificador de Color</Label>
              <div className="flex gap-3 pt-1">
                {['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {goal && (
              <Button type="button" variant="ghost" onClick={handleDelete} className="text-rose-500 hover:bg-rose-500/10 h-11 px-4 text-xs uppercase font-bold tracking-widest">
                Eliminar
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="border-zinc-800 h-11 px-6 text-xs uppercase font-bold tracking-widest">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 h-11 px-8 text-xs uppercase font-bold tracking-widest">
                {loading ? 'Procesando...' : (goal ? 'Guardar Cambios' : 'Inicializar Meta')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
