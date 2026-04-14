import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Acceso concedido');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Registro exitoso. Verifica tu terminal de correo.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 p-4 selection:bg-indigo-500/30">
      <Card className="w-full max-w-md shadow-2xl border-zinc-800 bg-zinc-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <CardHeader className="space-y-2 pt-8">
          <CardTitle className="text-2xl font-bold text-center text-zinc-100 tracking-tight">
            {isLogin ? 'Iniciar Sesión' : 'Nueva Cuenta'}
          </CardTitle>
          <CardDescription className="text-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
            {isLogin 
              ? 'Protocolo de acceso seguro' 
              : 'Inicializar perfil financiero'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 text-xs uppercase tracking-wider">Identificador (Email)</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="usuario@red.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-indigo-500/20 placeholder:text-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400 text-xs uppercase tracking-wider">Clave de Acceso</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-indigo-500/20"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-8">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wide transition-all shadow-lg shadow-indigo-500/20" type="submit" disabled={loading}>
              {loading ? 'AUTENTICANDO...' : (isLogin ? 'EJECUTAR ACCESO' : 'CREAR PERFIL')}
            </Button>
            <Button 
              variant="link" 
              className="w-full text-zinc-500 hover:text-zinc-300 text-[10px] uppercase tracking-widest" 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? '¿Sin credenciales? Registrarse' : '¿Ya tienes perfil? Acceder'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
