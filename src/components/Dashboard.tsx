import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, Wallet, TrendingUp, TrendingDown, PlusCircle, 
  CreditCard, ArrowUpRight, ArrowDownRight, Zap, Menu, 
  ChevronDown, BarChart3, Calendar, Settings 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// Lazy load feature components
const AnnualSummary = lazy(() => import('./AnnualSummary').then(m => ({ default: m.AnnualSummary })));
const TransactionModal = lazy(() => import('./TransactionModal').then(m => ({ default: m.TransactionModal })));
const AccountModal = lazy(() => import('./AccountModal').then(m => ({ default: m.AccountModal })));
const CategoryModal = lazy(() => import('./CategoryModal').then(m => ({ default: m.CategoryModal })));

const LoadingFallback = () => (
  <div className="p-12 text-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest animate-pulse">
    Cargando Componente...
  </div>
);

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState({ ingresos: 0, egresos: 0 });
  const [showAnnualSummary, setShowAnnualSummary] = useState(false);
  
  // Modal states
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const currentMonthName = format(new Date(), 'MMMM', { locale: es });

  const fetchData = async () => {
    if (!user) return;

    // Fetch Profile, Accounts and Categories in parallel for efficiency and consistency
    const [profRes, accRes, catRes] = await Promise.all([
      supabase.from('perfiles').select('*').eq('id', user.id).single(),
      supabase.from('cuentas').select('*').eq('user_id', user.id).order('nombre'),
      supabase.from('categorias').select('*').eq('user_id', user.id).order('nombre')
    ]);

    if (profRes.data) setProfile(profRes.data);
    if (accRes.data) setAccounts(accRes.data);
    if (catRes.data) setCategories(catRes.data);

    // Fetch Monthly Stats
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const { data: transData } = await supabase
      .from('transacciones')
      .select('monto, tipo')
      .eq('user_id', user.id)
      .gte('fecha', start)
      .lte('fecha', end);
    
    if (transData) {
      const ing = transData.filter(t => t.tipo === 'ingreso').reduce((acc, t) => acc + Number(t.monto), 0);
      const egr = transData.filter(t => t.tipo === 'egreso').reduce((acc, t) => acc + Number(t.monto), 0);
      setStats({ ingresos: ing, egresos: egr });
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="bg-zinc-950/50 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <h1 className="text-xl font-bold tracking-tighter text-zinc-100 font-mono">LogiCash</h1>
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900">
                    <Menu className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100 w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500">Cuentas</DropdownMenuLabel>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedAccount(null);
                        setIsAccModalOpen(true);
                      }} 
                      className="cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" /> Agregar Cuenta
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <CreditCard className="w-4 h-4 mr-2" /> Ver Todas
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500">Reportes</DropdownMenuLabel>
                    <DropdownMenuItem 
                      onClick={() => setShowAnnualSummary(!showAnnualSummary)} 
                      className="cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" /> 
                      {showAnnualSummary ? 'Ocultar Consolidado' : 'Ver Consolidado Anual'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Calendar className="w-4 h-4 mr-2" /> Histórico de Años
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem 
                    onClick={() => setIsCatModalOpen(true)}
                    className="cursor-pointer"
                  >
                    <Settings className="w-4 h-4 mr-2" /> Categorías
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900">
                    Cuentas <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500">Gestión de Cuentas</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem 
                      onClick={() => {
                        console.log('Opening Account Modal');
                        setSelectedAccount(null);
                        setIsAccModalOpen(true);
                      }} 
                      className="cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" /> Agregar Cuenta
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <CreditCard className="w-4 h-4 mr-2" /> Ver Todas
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900">
                    Reportes <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500">Análisis Financiero</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem 
                      onClick={() => {
                        console.log('Toggling Annual Summary', !showAnnualSummary);
                        setShowAnnualSummary(!showAnnualSummary);
                      }} 
                      className="cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" /> 
                      {showAnnualSummary ? 'Ocultar Consolidado' : 'Ver Consolidado Anual'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Calendar className="w-4 h-4 mr-2" /> Histórico de Años
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsCatModalOpen(true)}
                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              >
                Categorías
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 font-mono hidden sm:inline-block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
              <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Salir
            </Button>
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
                  ${(profile?.saldo_total || 0).toLocaleString('de-DE')}
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
                    +${stats.ingresos.toLocaleString('de-DE')}
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
                    -${stats.egresos.toLocaleString('de-DE')}
                  </div>
                  <div className="w-full bg-zinc-800 h-1 mt-4 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full w-[40%]" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

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
                      ${Number(acc.saldo_actual).toLocaleString('de-DE')}
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

        {/* Annual Summary Section (Conditional) */}
        <AnimatePresence>
          {showAnnualSummary && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Suspense fallback={<LoadingFallback />}>
                <AnnualSummary />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

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
      <Suspense fallback={null}>
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
      </Suspense>
    </div>
  );
};
