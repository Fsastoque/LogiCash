import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LogOut, Wallet, TrendingUp, TrendingDown, PlusCircle,
  CreditCard, ArrowUpRight, ArrowDownRight, Menu as MenuIcon,
  ChevronDown, BarChart3, Calendar, Settings, Trash2,
  Eye, EyeOff, FileDown, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNotify } from '../hooks/useNotify';
import { Logo } from './Logo';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ExportService } from '../lib/ExportService';
import { SavingsGoals } from './SavingsGoals';
import { AnnualSummary } from './AnnualSummary';
import { TransactionModal } from './TransactionModal';
import { AccountModal } from './AccountModal';
import { CategoryModal } from './CategoryModal';
import { GoalModal } from './GoalModal';
import { ConfirmDialog } from './ConfirmDialog';

const LoadingFallback = () => (
  <div className="p-12 text-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest animate-pulse">
    Cargando Componente...
  </div>
);

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { success, error, warning } = useNotify();
  const [profile, setProfile] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ ingresos: 0, egresos: 0, egresosFijos: 0, egresosVariables: 0 });
  const [fixedBudgetPercent, setFixedBudgetPercent] = useState(50);
  const [variableBudgetPercent, setVariableBudgetPercent] = useState(30);
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);
  const [showAnnualSummary, setShowAnnualSummary] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(true);
  const [showTotalCapital, setShowTotalCapital] = useState(false);

  // Modal states
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);

  const currentMonthName = format(new Date(), 'MMMM', { locale: es });

  const fetchData = async () => {
    if (!user) return;

    // Fetch Profile, Accounts, Categories and Goals in parallel
    const [profRes, accRes, catRes, goalRes] = await Promise.all([
      supabase.from('perfiles').select('*').eq('id', user.id).single(),
      supabase.from('cuentas').select('*').eq('user_id', user.id).order('nombre'),
      supabase.from('categorias').select('*').eq('user_id', user.id).order('nombre'),
      supabase.from('metas_ahorro').select('*').eq('user_id', user.id).order('created_at')
    ]);

    if (profRes.data) setProfile(profRes.data);
    if (accRes.data) setAccounts(accRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (goalRes.data) setMetas(goalRes.data);

    // Fetch Recent Transactions (last 10)
    const { data: recentData } = await supabase
      .from('transacciones')
      .select(`
        *,
        cuenta:cuentas(nombre),
        categoria:categorias(nombre, es_fijo)
      `)
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentData) setRecentTransactions(recentData);

    // Fetch Monthly Stats
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const { data: transData } = await supabase
      .from('transacciones')
      .select('monto, tipo, categorias(nombre, es_fijo)')
      .eq('user_id', user.id)
      .gte('fecha', start)
      .lte('fecha', end);

    if (transData) {
      // Exclude transfers from monthly incomes/expenses calculations
      const filteredTrans = (transData as any[]).filter(t => t.categorias?.nombre !== 'Traslado de Fondos');
      const ing = filteredTrans.filter(t => t.tipo === 'ingreso').reduce((acc, t) => acc + Number(t.monto), 0);
      const egrFijo = filteredTrans.filter(t => t.tipo === 'egreso' && t.categorias?.es_fijo === true).reduce((acc, t) => acc + Number(t.monto), 0);
      const egrVar = filteredTrans.filter(t => t.tipo === 'egreso' && t.categorias?.es_fijo === false).reduce((acc, t) => acc + Number(t.monto), 0);
      const egrGral = filteredTrans.filter(t => t.tipo === 'egreso' && t.categorias?.es_fijo !== true && t.categorias?.es_fijo !== false).reduce((acc, t) => acc + Number(t.monto), 0);

      setStats({ 
        ingresos: ing, 
        egresos: egrFijo + egrVar + egrGral,
        egresosFijos: egrFijo,
        egresosVariables: egrVar
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const requestDeleteTransaction = (transaction: any) => {
    setTransactionToDelete(transaction);
    setConfirmDeleteOpen(true);
  };

  const executeDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    setDeletingId(transactionToDelete.id);
    setConfirmDeleteOpen(false);

    try {
      // 1. Revert balance impact
      const account = accounts.find(a => a.id === transactionToDelete.cuenta_id);
      if (account) {
        const montoNum = Number(transactionToDelete.monto);
        const newBalance = transactionToDelete.tipo === 'ingreso'
          ? Number(account.saldo_actual) - montoNum
          : Number(account.saldo_actual) + montoNum;

        const { error: accError } = await supabase
          .from('cuentas')
          .update({ saldo_actual: newBalance })
          .eq('id', account.id);

        if (accError) throw accError;
      }

      // 2. Delete transaction
      const { error: delError } = await supabase
        .from('transacciones')
        .delete()
        .eq('id', transactionToDelete.id);

      if (delError) throw delError;

      success('Transacción eliminada', 'El saldo ha sido revertido correctamente.');
      fetchData();
    } catch (err: any) {
      error('Fallo al eliminar', err);
    } finally {
      setDeletingId(null);
      setTransactionToDelete(null);
    }
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    if (type === 'pdf') {
      ExportService.exportToPDF(recentTransactions, stats, profile);
    } else {
      ExportService.exportToExcel(recentTransactions);
    }
    success(`Exportación Iniciada`, `Generando reporte en formato ${type.toUpperCase()}`);
  };

  const handleSignOut = async () => {
    try {
      // Small delay to allow menu to close gracefully and avoid Base UI context issues
      await new Promise(resolve => setTimeout(resolve, 100));
      await signOut();
    } catch (err: any) {
      error('Error al salir', err);
    }
  };

  const totalBalanceFromAccounts = accounts.reduce((sum, acc) => sum + Number(acc.saldo_actual), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="bg-zinc-950/50 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />

            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-900 hover:text-zinc-100 h-9 px-3 text-zinc-400">
                  Bóveda <ChevronDown className="w-3 h-3 ml-1" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100 w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500">Gestión de Activos</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedAccount(null);
                        setIsAccModalOpen(true);
                      }}
                      className="cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" /> Nueva Cuenta
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedGoal(null);
                        setIsGoalModalOpen(true);
                      }}
                      className="cursor-pointer"
                    >
                      <Target className="w-4 h-4 mr-2" /> Nueva Meta de Ahorro
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsCatModalOpen(true)}
                      className="cursor-pointer"
                    >
                      <Settings className="w-4 h-4 mr-2" /> Categorías
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-900 hover:text-zinc-100 h-9 px-3 text-zinc-400">
                  Informes <ChevronDown className="w-3 h-3 ml-1" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100 w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500">Análisis y Exportación</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={() => setShowAnnualSummary(!showAnnualSummary)}
                      className="cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {showAnnualSummary ? 'Ocultar Consolidado' : 'Dashboard Anual'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer text-indigo-400">
                      <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer text-emerald-400">
                      <FileDown className="w-4 h-4 mr-2" /> Exportar Excel
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-900/50 hover:text-zinc-100 h-9 w-9 text-zinc-400">
                  <MenuIcon className="w-5 h-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100 w-56" align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500">Acciones</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedAccount(null);
                        setIsAccModalOpen(true);
                      }}
                    >
                      <PlusCircle className="w-4 h-4 mr-2" /> Nueva Cuenta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsGoalModalOpen(true)}>
                      <Target className="w-4 h-4 mr-2" /> Nueva Meta de Ahorro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsCatModalOpen(true)}>
                      <Settings className="w-4 h-4 mr-2" /> Categorías
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem onClick={() => setShowAnnualSummary(!showAnnualSummary)}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {showAnnualSummary ? 'Ocultar Consolidado' : 'Ver Dashboard Anual'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')} className="text-indigo-400">
                      <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('excel')} className="text-emerald-400">
                      <FileDown className="w-4 h-4 mr-2" /> Exportar Excel
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsPrivate(!isPrivate);
                if (!isPrivate) {
                  warning('Modo Privacidad', 'Saldos sensibles ocultos');
                } else {
                  success('Modo Público', 'Saldos visibles de nuevo');
                }
              }}
              className={`transition-colors h-9 w-9 ${isPrivate ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-zinc-200'}`}
            >
              {isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5 transition-transform" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-zinc-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                <div className="text-[10px] font-bold text-zinc-400">
                  {user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100 w-56" align="end">
                <div className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Mi Perfil</p>
                    <p className="text-xs leading-none text-zinc-500">{user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem className="cursor-not-allowed opacity-50">
                  <Settings className="w-4 h-4 mr-2" /> Ajustes de Ahorro
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={handleSignOut} className="text-rose-500 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Main Balance & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-zinc-900 border-zinc-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-600/20 transition-colors" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Saldo Consolidado</CardTitle>
                <Wallet className="w-4 h-4 text-indigo-400" strokeWidth={1.5} />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tracking-tighter text-zinc-100">
                  {isPrivate ? '••••••••' : `$${(profile?.saldo_total || 0).toLocaleString('de-DE')}`}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[10px]">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> 2.5%
                  </Badge>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">vs mes anterior</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Ingresos {currentMonthName}</CardTitle>
                  <TrendingUp className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">
                    {isPrivate ? '••••••' : `+$${stats.ingresos.toLocaleString('de-DE')}`}
                  </div>
                  <div className="w-full bg-zinc-800 h-1 mt-4 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[65%]" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Gastos {currentMonthName}</CardTitle>
                  <TrendingDown className="w-4 h-4 text-rose-500" strokeWidth={1.5} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rose-500">
                    {isPrivate ? '••••••' : `-$${stats.egresos.toLocaleString('de-DE')}`}
                  </div>
                  <div className="w-full bg-zinc-800 h-1 mt-4 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full transition-all duration-500" 
                      style={{ width: `${Math.min((stats.egresos / (stats.ingresos || 1)) * 100, 100)}%` }} 
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

         {/* Expense Types & Budget Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
              Presupuesto Mensual
              {((stats.egresosFijos > (stats.ingresos * fixedBudgetPercent / 100)) || (stats.egresosVariables > (stats.ingresos * variableBudgetPercent / 100))) && (
                <Badge className="bg-rose-500 text-white border-none animate-pulse text-[9px] px-2 py-0">ALERTA DE TOPE</Badge>
              )}
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowBudgetSettings(!showBudgetSettings)}
              className="text-[10px] uppercase font-bold tracking-tighter text-zinc-500 hover:text-indigo-400"
            >
              <Settings className="w-3 h-3 mr-1" /> {showBudgetSettings ? 'Cerrar Ajustes' : 'Ajustar Límites'}
            </Button>
          </div>

          <AnimatePresence>
            {showBudgetSettings && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 gap-6 grid grid-cols-1 sm:grid-cols-2 overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
                    <span>Tope Gastos Fijos</span>
                    <span className="text-indigo-400">{fixedBudgetPercent}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={fixedBudgetPercent} 
                    onChange={(e) => setFixedBudgetPercent(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
                    <span>Tope Gastos Variables</span>
                    <span className="text-indigo-400">{variableBudgetPercent}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={variableBudgetPercent} 
                    onChange={(e) => setVariableBudgetPercent(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Fixed Expenses Card */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className={`bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden relative group ${stats.egresosFijos > (stats.ingresos * fixedBudgetPercent / 100) ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-indigo-500'}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Gastos Fijos</p>
                      <h3 className={`text-2xl font-mono font-bold ${stats.egresosFijos > (stats.ingresos * fixedBudgetPercent / 100) ? 'text-rose-400' : 'text-zinc-100'}`}>
                        {isPrivate ? '••••••' : `$${stats.egresosFijos.toLocaleString('de-DE')}`}
                      </h3>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500 text-right">
                      TOPE: {fixedBudgetPercent}% <br/>
                      <span className="text-[9px] font-mono">
                        ${((stats.ingresos * fixedBudgetPercent) / 100).toLocaleString('de-DE')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] uppercase font-bold text-zinc-500">Ejecución</span>
                      <span className={`text-[10px] font-bold ${stats.egresosFijos > (stats.ingresos * fixedBudgetPercent / 100) ? 'text-rose-500' : 'text-indigo-400'}`}>
                        {Math.round((stats.egresosFijos / (Math.max(stats.ingresos * fixedBudgetPercent / 100, 1) || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden p-[1px]">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${stats.egresosFijos > (stats.ingresos * fixedBudgetPercent / 100) ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min((stats.egresosFijos / (Math.max(stats.ingresos * fixedBudgetPercent / 100, 1) || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {stats.egresosFijos > (stats.ingresos * fixedBudgetPercent / 100) && (
                    <div className="mt-3 flex items-center gap-1.5 text-rose-500">
                      <PlusCircle className="w-3 h-3 rotate-45" />
                      <span className="text-[9px] font-bold uppercase tracking-tight">Presupuesto Fijo Excedido</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Variable Expenses Card */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <Card className={`bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden relative group ${stats.egresosVariables > (stats.ingresos * variableBudgetPercent / 100) ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-emerald-500'}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Gastos Variables</p>
                      <h3 className={`text-2xl font-mono font-bold ${stats.egresosVariables > (stats.ingresos * variableBudgetPercent / 100) ? 'text-rose-400' : 'text-zinc-100'}`}>
                        {isPrivate ? '••••••' : `$${stats.egresosVariables.toLocaleString('de-DE')}`}
                      </h3>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500 text-right">
                      TOPE: {variableBudgetPercent}% <br/>
                      <span className="text-[9px] font-mono">
                        ${((stats.ingresos * variableBudgetPercent) / 100).toLocaleString('de-DE')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] uppercase font-bold text-zinc-500">Ejecución</span>
                      <span className={`text-[10px] font-bold ${stats.egresosVariables > (stats.ingresos * variableBudgetPercent / 100) ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {Math.round((stats.egresosVariables / (Math.max(stats.ingresos * variableBudgetPercent / 100, 1) || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden p-[1px]">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${stats.egresosVariables > (stats.ingresos * variableBudgetPercent / 100) ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min((stats.egresosVariables / (Math.max(stats.ingresos * variableBudgetPercent / 100, 1) || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {stats.egresosVariables > (stats.ingresos * variableBudgetPercent / 100) && (
                    <div className="mt-3 flex items-center gap-1.5 text-rose-500">
                      <PlusCircle className="w-3 h-3 rotate-45" />
                      <span className="text-[9px] font-bold uppercase tracking-tight">Presupuesto Variable Excedido</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Total Capital Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl border-l-4 border-l-indigo-600">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Capital Total Acumulado</p>
                <div className="flex items-center gap-4">
                  <h3 className="text-3xl font-mono font-bold text-zinc-100 tracking-tighter">
                    {showTotalCapital ? `$${totalBalanceFromAccounts.toLocaleString('de-DE')}` : '••••••••'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTotalCapital(!showTotalCapital)}
                    className="h-8 w-8 text-zinc-500 hover:text-zinc-100 transition-colors"
                  >
                    {showTotalCapital ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Virtual Credit Cards Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="w-4 h-4" strokeWidth={1.5} />
              Mis Cuentas Virtuales
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((acc, i) => (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card
                  onClick={() => {
                    setSelectedAccount(acc);
                    setIsAccModalOpen(true);
                  }}
                  className="bg-zinc-900 border-zinc-800 overflow-hidden relative group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-transparent opacity-50" />
                  <div className="absolute top-0 right-0 p-4">
                    <div className="w-10 h-6 bg-zinc-800 rounded-md border border-zinc-700 flex items-center justify-center">
                      <div className="w-4 h-4 bg-zinc-700 rounded-full opacity-50" />
                    </div>
                  </div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-zinc-400 text-xs font-mono uppercase tracking-widest">{acc.nombre}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 pt-4">
                    <div className="text-3xl font-bold text-zinc-100 tracking-tight mb-6">
                      {isPrivate ? '••••••' : `$${Number(acc.saldo_actual).toLocaleString('de-DE')}`}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-mono text-zinc-500">**** **** **** {Math.floor(Math.random() * 9000) + 1000}</div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[9px]">
                        <ArrowUpRight className="w-2 h-2 mr-1" /> 1.2%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {accounts.length === 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAccount(null);
                  setIsAccModalOpen(true);
                }}
                className="h-[180px] w-full border-dashed border-zinc-800 bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 transition-all"
              >
                <div className="text-center">
                  <PlusCircle className="w-6 h-6 mb-2 mx-auto" strokeWidth={1.5} />
                  Agregar Cuenta
                </div>
              </Button>
            )}
          </div>
        </section>

        {/* Savings Goals Section */}
        <SavingsGoals
          goals={metas}
          onAddGoal={() => {
            setSelectedGoal(null);
            setIsGoalModalOpen(true);
          }}
          onEditGoal={(goal) => {
            setSelectedGoal(goal);
            setIsGoalModalOpen(true);
          }}
          isPrivate={isPrivate}
        />

        {/* Annual Summary Section (Conditional) */}
        <AnimatePresence>
          {showAnnualSummary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <AnnualSummary />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Transactions Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4" strokeWidth={1.5} />
              Últimos Movimientos
            </h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950/50 border-b border-zinc-800">
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Fecha</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Categoría</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-widest text-right">Monto</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-widest hidden sm:table-cell">Cuenta</th>                  
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-zinc-500 tracking-widest text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-mono text-zinc-400">
                          {format(parseISO(tx.fecha), 'dd MMM', { locale: es })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tx.categoria?.nombre === 'Traslado de Fondos' ? (
                          <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[9px] uppercase font-bold py-0 h-4 min-h-0">Traslado</Badge>
                        ) : tx.tipo === 'ingreso' ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase font-bold py-0 h-4 min-h-0">Ingreso</Badge>
                        ) : (
                          <Badge variant="outline" className={tx.categoria?.es_fijo ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px] uppercase font-bold py-0 h-4 min-h-0" : "bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] uppercase font-bold py-0 h-4 min-h-0"}>
                            {tx.categoria?.es_fijo ? 'Fijo' : 'Variable'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-zinc-200">
                          {tx.categoria?.nombre || 'General'}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                          {tx.descripcion || 'Sin descripción'}
                        </div>
                        <div className="sm:hidden text-[9px] text-indigo-400 mt-1">
                          {tx.cuenta?.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-bold font-mono ${tx.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {tx.tipo === 'ingreso' ? '+' : '-'}${Number(tx.monto).toLocaleString('de-DE')}
                        </span>
                      </td>                      
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell text-center">
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                          {tx.cuenta?.nombre}
                        </span>
                      </td>                      
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === tx.id}
                          onClick={() => requestDeleteTransaction(tx)}
                          className="text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 h-8 w-8 transition-all"
                        >
                          <Trash2 className={`w-4 h-4 ${deletingId === tx.id ? 'animate-pulse' : ''}`} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {recentTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-600 font-mono text-xs italic">
                        No hay movimientos registrados recientemente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-8 z-30">
          <Button
            size="lg"
            onClick={() => setIsTransModalOpen(true)}
            className="rounded-full shadow-2xl shadow-indigo-500/40 bg-indigo-600 hover:bg-indigo-700 px-6 h-14 transition-all hover:scale-105 active:scale-95 text-white font-bold border-none"
          >
            <PlusCircle className="w-5 h-5 mr-2 text-white" strokeWidth={2.5} />
            Transacción
          </Button>
        </div>
      </main>

      {/* Modals */}
      <TransactionModal
        isOpen={isTransModalOpen}
        onClose={() => setIsTransModalOpen(false)}
        onSuccess={fetchData}
        accounts={accounts}
        categories={categories}
      />
      <AccountModal
        isOpen={isAccModalOpen}
        onClose={() => {
          setIsAccModalOpen(false);
          setSelectedAccount(null);
        }}
        onSuccess={fetchData}
        account={selectedAccount}
      />
      <CategoryModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        onSuccess={fetchData}
      />
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSuccess={fetchData}
        goal={selectedGoal}
      />
      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setTransactionToDelete(null);
        }}
        onConfirm={executeDeleteTransaction}
        title="Eliminar Transacción"
        description="¿Estás seguro de que deseas eliminar este movimiento? Esta acción revertirá automáticamente el impacto en el saldo de la cuenta asociada."
        confirmText="Eliminar Movimiento"
        cancelText="No, Mantener"
        variant="danger"
        isLoading={!!deletingId}
      />
    </div>
  );
};
