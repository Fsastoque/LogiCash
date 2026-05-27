import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../hooks/useNotify';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ChevronRight, LogOut } from 'lucide-react';

export const UpdatePasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signOut, setIsRecovering } = useAuth();
  const { success, error, warning } = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      warning('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      warning('Contraseñas no coinciden', 'Por favor, asegúrate de escribir la misma contraseña en ambos campos.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      success('Contraseña actualizada', 'Tu clave de seguridad ha sido restablecida con éxito.');
      setIsRecovering(false);
    } catch (err: any) {
      error('Fallo al actualizar clave', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (err: any) {
      error('Error al cerrar sesión', err);
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
          SECURITY
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
          <Logo className="mb-6 scale-125" iconOnly />
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            Nueva Contraseña
          </h2>
          <p className="text-zinc-500 text-sm mt-2 font-medium tracking-wide text-center">
            Establece tus credenciales de acceso seguro para LogiCash
          </p>
        </div>

        {/* Auth Card (Minimalist & Glass) */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 shadow-2xl relative">
          {/* Subtle top glow */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2 group">
                <Label htmlFor="password" className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-indigo-400">
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-indigo-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Escribe tu nueva contraseña" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-black/40 border-zinc-800/50 text-zinc-100 pl-11 pr-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 rounded-2xl transition-all placeholder:text-zinc-700 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="confirmPassword" className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-indigo-400">
                  Confirmar Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-indigo-400" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="Repite tu contraseña" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 bg-black/40 border-zinc-800/50 text-zinc-100 pl-11 pr-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 rounded-2xl transition-all placeholder:text-zinc-700 text-sm"
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
                    <span>ACTUALIZANDO...</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="normal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 w-full"
                  >
                    <span>CAMBIAR CONTRASEÑA</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
            <button 
              onClick={handleCancel}
              disabled={loading}
              className="group flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors font-semibold text-xs uppercase tracking-wider"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cancelar y Salir
            </button>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="mt-12 text-center space-y-2 opacity-30 group hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-mono">
            LogiCash Security Hub
          </p>
        </div>
      </motion.div>
    </div>
  );
};
