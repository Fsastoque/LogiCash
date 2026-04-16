import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

interface Category {
  id: string;
  nombre: string;
}

interface Transaction {
  monto: number;
  fecha: string;
  categoria_id: string;
  tipo: 'ingreso' | 'egreso';
}

export const AnnualSummary: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  const months = Array.from({ length: 12 }, (_, i) => i);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      
      const { data: catData } = await supabase
        .from('categorias')
        .select('id, nombre')
        .order('nombre');
      
      if (catData) setCategories(catData);

      const start = format(startOfYear(new Date()), 'yyyy-MM-dd');
      const end = format(endOfYear(new Date()), 'yyyy-MM-dd');

      const { data: transData } = await supabase
        .from('transacciones')
        .select('monto, fecha, categoria_id, tipo')
        .gte('fecha', start)
        .lte('fecha', end);

      if (transData) {
        const matrix: Record<string, number[]> = {};
        catData?.forEach(cat => {
          matrix[cat.id] = new Array(12).fill(0);
        });

        transData.forEach((t: Transaction) => {
          if (t.categoria_id && matrix[t.categoria_id]) {
            const month = new Date(t.fecha).getMonth();
            const value = Number(t.monto);
            matrix[t.categoria_id][month] += t.tipo === 'egreso' ? -value : value;
          }
        });

        setData(matrix);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) return <div className="p-8 text-center text-zinc-500 font-mono text-xs animate-pulse">Analizando flujos financieros...</div>;

  return (
    <Card className="w-full shadow-2xl border-zinc-800 bg-zinc-900 overflow-hidden">
      <CardHeader className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        <CardTitle className="text-sm font-semibold flex items-center justify-between text-zinc-100">
          <span className="uppercase tracking-widest">Consolidado Anual {currentYear}</span>
          <Badge variant="outline" className="font-mono text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700">MATRIZ_DATOS</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full whitespace-nowrap overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="w-[180px] font-bold sticky left-0 bg-zinc-900 z-10 text-zinc-500 uppercase text-[10px] tracking-widest border-r border-zinc-800">Categoría</TableHead>
                {months.map(m => (
                  <TableHead key={m} className="text-center min-w-[100px] uppercase text-[9px] tracking-tighter font-bold text-zinc-500">
                    {format(new Date(currentYear, m), 'MMMM', { locale: es })}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold text-zinc-500 uppercase text-[10px] tracking-widest border-l border-zinc-800">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(cat => (
                <TableRow key={cat.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-all group">
                  <TableCell className="font-medium sticky left-0 bg-zinc-900 z-10 border-r border-zinc-800 text-zinc-300 text-xs group-hover:bg-zinc-800/50 transition-colors">{cat.nombre}</TableCell>
                  {months.map(m => {
                    const val = data[cat.id]?.[m] || 0;
                    return (
                      <TableCell key={m} className={`text-right font-mono text-[11px] ${val < 0 ? 'text-rose-500' : val > 0 ? 'text-emerald-400' : 'text-zinc-700'}`}>
                        {val !== 0 ? val.toLocaleString('de-DE', { minimumFractionDigits: 0 }) : '—'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-bold font-mono text-xs border-l border-zinc-800 text-zinc-100 bg-zinc-900/30 group-hover:bg-zinc-800/50 transition-colors">
                    {(data[cat.id]?.reduce((a, b) => a + b, 0) || 0).toLocaleString('de-DE')}
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-12 text-zinc-600 italic font-mono text-xs">
                    SISTEMA_VACIO: No se detectaron registros para el periodo actual.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
