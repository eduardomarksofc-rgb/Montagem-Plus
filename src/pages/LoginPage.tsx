import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(usuario, senha);
      if (success) {
        navigate('/');
      } else {
        setError('Usuário ou senha incorretos');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar entrar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-ios-bg)] p-6 relative overflow-hidden">
      {/* Background blobs for depth */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="glass p-8 rounded-[32px] shadow-2xl shadow-black/5 relative z-10">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
              className="w-20 h-20 bg-[var(--color-ios-blue)] rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4"
            >
              <LayoutDashboard size={40} className="text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Montagem+</h1>
            <p className="text-[var(--color-ios-gray)] text-sm mt-1">Controle Profissional</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Usuário</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[var(--color-ios-blue)] transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full h-14 bg-white/50 border border-slate-200 rounded-2xl pl-12 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-ios-blue)] transition-all placeholder:text-slate-400"
                  placeholder="Nome de usuário"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[var(--color-ios-blue)] transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full h-14 bg-white/50 border border-slate-200 rounded-2xl pl-12 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-ios-blue)] transition-all placeholder:text-slate-400"
                  placeholder="Sua senha"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100"
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              className="w-full h-14 bg-[var(--color-ios-blue)] text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25 hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                'Entrar'
              )}
            </motion.button>
          </form>

          <footer className="mt-8 text-center">
            <p className="text-xs text-slate-400 font-medium">
              &copy; 2026 Montagem+ Sistema
            </p>
          </footer>
        </div>
      </motion.div>
    </div>
  );
};
