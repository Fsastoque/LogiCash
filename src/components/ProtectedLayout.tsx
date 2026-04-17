import React, { lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Zap } from 'lucide-react';
import { motion } from 'motion/react';

const AuthForm = lazy(() => import('./AuthForm').then(m => ({ default: m.AuthForm })));

export const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <div className="flex flex-col items-center gap-8">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.2)]"
          >
            <Zap className="w-9 h-9 text-white fill-current" />
          </motion.div>
          <div className="space-y-2 text-center">
            <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">
              Iniciando Protocolos
            </div>
            <div className="w-32 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">
            Sincronizando...
          </div>
        </div>
      }>
        <AuthForm />
      </Suspense>
    );
  }

  return <>{children}</>;
};
