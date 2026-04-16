import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchCategories();
    }
  }, [isOpen, user]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user?.id)
      .order('nombre', { ascending: true });
    
    if (data) setCategories(data);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategory.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('categorias')
        .insert([{ nombre: newCategory.trim(), user_id: user.id }]);

      if (error) throw error;

      toast.success('Categoría añadida');
      setNewCategory('');
      fetchCategories();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Categoría eliminada');
      fetchCategories();
      onSuccess();
    } catch (error: any) {
      toast.error('No se puede eliminar: puede estar en uso');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-mono uppercase tracking-widest">Gestionar Categorías</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label className="text-zinc-400 text-xs uppercase sr-only">Nueva Categoría</Label>
              <Input 
                placeholder="Nombre de la categoría..."
                className="bg-zinc-950 border-zinc-800"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4" />
            </Button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-zinc-800 group"
              >
                <span className="text-sm">{cat.nombre}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-zinc-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm italic">
                No hay categorías creadas
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="ghost" onClick={onClose} className="text-zinc-500">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
