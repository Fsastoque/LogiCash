import React from 'react';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Target, PlusCircle, TrendingUp, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Goal {
  id: string;
  nombre: string;
  monto_objetivo: number;
  monto_actual: number;
  color?: string;
  fecha_limite?: string;
}

interface SavingsGoalsProps {
  goals: Goal[];
  onAddGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  isPrivate?: boolean;
}

export const SavingsGoals: React.FC<SavingsGoalsProps> = ({ goals, onAddGoal, onEditGoal, isPrivate }) => {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Target className="w-4 h-4" />
          Metas de Ahorro (Sinking Funds)
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onAddGoal}
          className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
        >
          <PlusCircle className="w-3 h-3 mr-1" /> Nueva Meta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal, i) => {
          const progress = Math.min(Math.round((goal.monto_actual / goal.monto_objetivo) * 100), 100);
          
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card 
                onClick={() => onEditGoal(goal)}
                className="bg-zinc-900 border-zinc-800 hover:border-indigo-500/30 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div 
                  className="absolute top-0 left-0 w-1 h-full" 
                  style={{ backgroundColor: goal.color || '#4f46e5' }} 
                />
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-bold text-zinc-100">{goal.nombre}</CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono bg-zinc-950/50 border-zinc-800">
                      {progress}%
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Progreso</p>
                      <p className="text-lg font-bold text-zinc-100 tabular-nums">
                        {isPrivate ? '••••••' : `$${goal.monto_actual.toLocaleString('de-DE')}`}
                        <span className="text-zinc-600 font-normal text-xs ml-1">
                          / {isPrivate ? '••••••' : `$${goal.monto_objetivo.toLocaleString('de-DE')}`}
                        </span>
                      </p>
                    </div>
                    <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Progress value={progress} className="h-1.5 bg-zinc-800" />
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                      <span>Iniciado</span>
                      <span>Meta: {goal.fecha_limite ? new Date(goal.fecha_limite).toLocaleDateString() : 'Pendiente'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {goals.length === 0 && (
          <div className="lg:col-span-3 h-40 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 space-y-3">
            <Target className="w-8 h-8 opacity-20" />
            <p className="text-xs font-mono uppercase tracking-widest">Define tu próxima meta de ahorro</p>
            <Button 
              onClick={onAddGoal} 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 h-9 rounded-full transition-all shadow-lg shadow-indigo-500/20 uppercase text-[10px]"
            >
              Comenzar Ahora
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
