import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../hooks/useNotify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ArrowRight, Mail, Lock, UserPlus, LogIn, ChevronRight } from 'lucide-react';

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error } = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        success('Acceso autorizado', 'Sincronizando bóveda financiera...');
      } else {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        success('Perfil inicializado', 'Verifica tu identidad antes de proceder.');
      }
    } catch (err: any) {
      error('Fallo en autenticación', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#050505] overflow-hidden selection:bg-indigo-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] animate-pulse [animation-delay:2s]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150 mix-blend-overlay" />
      </div>

      {/* Large Decorative Text (Background) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h1 className="text-[25vw] font-black text-white/[0.02] tracking-tighter leading-none transform -rotate-12 translate-y-12">
          LOGICASH
        </h1>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px] px-6 py-12"
      >
        {/* Brand/Logo Area */}
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-14 h-14 bg-indigo-600 rounded-[22px] flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.3)] mb-6 ring-1 ring-indigo-400/30"
          >
            <Zap className="w-8 h-8 text-white fill-current" />
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            LogiCash
          </h2>
          <p className="text-zinc-500 text-sm mt-2 font-medium tracking-wide">
            {isLogin ? 'Control financiero de alto nivel' : 'Únete a la nueva era financiera'}
          </p>
        </div>

        {/* Auth Card (Minimalist & Glass) */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 shadow-2xl relative">
          {/* Subtle top glow */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2 group">
                <Label htmlFor="email" className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-indigo-400">
                  Email Corporativo
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-indigo-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nombre@empresa.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-black/40 border-zinc-800/50 text-zinc-100 pl-11 focus:ring-indigo-500/20 focus:border-indigo-500/40 rounded-2xl transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="password" className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors group-focus-within:text-indigo-400">
                    Contraseña
                  </Label>
                  {isLogin && (
                    <button type="button" className="text-[10px] text-zinc-600 hover:text-indigo-400 uppercase tracking-wider font-bold transition-colors">
                      Olvidé mi clave
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-indigo-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-black/40 border-zinc-800/50 text-zinc-100 pl-11 focus:ring-indigo-500/20 focus:border-indigo-500/40 rounded-2xl transition-all"
                  />
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 border-none group overflow-hidden relative" 
              type="submit" 
              disabled={loading}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>VERIFICANDO...</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="normal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 w-full"
                  >
                    <span>{isLogin ? 'ACCEDER AL SISTEMA' : 'CREAR PERFIL'}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            <p className="text-zinc-500 text-xs">
              {isLogin ? '¿Aún no tienes cuenta?' : '¿Ya eres miembro?'}
            </p>
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="group flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors font-semibold text-sm"
            >
              {isLogin ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Registrarse ahora
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Volver al login
                </>
              )}
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="mt-12 text-center space-y-2 opacity-30 group hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-mono">
            LogiCash Intelligence Systems v1.0.4
          </p>
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest leading-relaxed">
            Conexión cifrada de extremo a extremo <br />
            © 2026 Reservados todos los derechos
          </p>
        </div>
      </motion.div>
    </div>
  );
};
