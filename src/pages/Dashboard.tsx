import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/context/AuthContext';
import { LogOut, Bell, Search, Plus, TrendingUp, Clock, CheckCircle2, Calendar, LayoutDashboard, ChevronRight, AlertCircle, MapPin, User as UserIcon, X } from 'lucide-react';
import { subscribeToCollection } from '@/src/firebase/firestore';
import { StatusBadge } from '@/src/components/StatusBadge';
import { AssemblyForm } from '@/src/components/AssemblyForm';
import { GlobalSearch } from '@/src/components/GlobalSearch';
import { useNavigate } from 'react-router-dom';
import { MontadorDashboard } from './MontadorDashboard';
import { VendasDashboard } from './VendasDashboard';
import { NotificationCenter } from '@/src/components/NotificationCenter';
import { isToday, parseISO } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [lastPendency, setLastPendency] = useState<any>(null);

  useEffect(() => {
    const unsub = subscribeToCollection('montagens', (data) => {
      setAssemblies(data);
      // Check for recent active pendencies for notification
      const activePendencies = data.filter(a => a.status === 'pendência');
      if (activePendencies.length > 0) {
        const newest = [...activePendencies].sort((a, b) => b.atualizadoEm?.seconds - a.atualizadoEm?.seconds)[0];
        setLastPendency(newest);
      } else {
        setLastPendency(null);
      }
    });
    return () => unsub?.();
  }, []);

  if (user?.tipo === 'montador') {
    return <MontadorDashboard />;
  }

  if (user?.tipo === 'vendas') {
    return <VendasDashboard />;
  }

  const completedCount = assemblies.filter(a => a.status === 'concluída').length;
  const total = assemblies.length;
  const pendencyCount = assemblies.filter(a => a.status === 'pendência').length;
  const pendencyRate = total > 0 ? ((pendencyCount / total) * 100).toFixed(0) : '0';

  const todayAssemblies = assemblies
    .filter(a => {
      if (!a.data) return false;
      // Handle date format from Firestore (YYYY-MM-DD or Timestamp)
      const dateStr = typeof a.data === 'string' ? a.data : '';
      if (!dateStr) return false;
      return isToday(new Date(`${dateStr}T00:00:00`));
    })
    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-12 h-12 rounded-[18px] bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg ring-2 ring-white/50"
          >
            {user?.nome.charAt(0)}
          </motion.div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-none tracking-tight">
              {getGreeting()}, <span className="text-blue-600">{user?.nome.split(' ')[0]}</span>
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate">
                {user?.tipo === 'admin' ? 'Painel Gestor' : 'Montador Oficial'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-11 h-11 rounded-[18px] bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 hover:text-blue-500 hover:bg-blue-50 transition-all active:scale-95"
          >
            <Search size={18} strokeWidth={3} />
          </button>
          <NotificationCenter />
        </div>
      </div>

      {/* Real-time Pendency Alert */}
      <AnimatePresence>
        {lastPendency && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="bg-red-500 p-6 rounded-[32px] text-white shadow-2xl shadow-red-500/30 flex items-center gap-6 overflow-hidden relative"
          >
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <AlertCircle size={32} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-full">Nova Pendência</span>
                <span className="text-[10px] font-bold text-white/60">• Agora</span>
              </div>
              <h4 className="font-bold text-lg leading-tight">{lastPendency.cliente}</h4>
              <p className="text-white/80 text-sm line-clamp-1">{lastPendency.descricaoPendencia}</p>
              <button 
                onClick={() => navigate('/pendencias')}
                className="mt-3 text-xs font-black uppercase tracking-widest text-white underline decoration-white/30 underline-offset-4"
              >
                Ver Detalhes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Feature Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative h-48 bg-[var(--color-ios-blue)] rounded-[32px] p-8 text-white overflow-hidden shadow-2xl shadow-blue-500/20"
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-black leading-tight tracking-tight">Novos Desafios,<br/>Mais Montagens.</h3>
            <p className="text-white/70 text-sm font-medium mt-2">Sua produtividade em alta.</p>
          </div>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-white text-[var(--color-ios-blue)] px-6 py-3 rounded-2xl font-bold text-sm w-fit shadow-lg shadow-black/5 active:scale-95 transition-all"
          >
            <Plus size={18} strokeWidth={3} />
            Novo Registro
          </button>
        </div>
        <LayoutDashboard className="absolute right-8 bottom-8 text-white/10" size={120} />
      </motion.div>

      {/* Stats Cards Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 p-6 rounded-[32px] text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
              <TrendingUp size={48} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Taxa de Pendência</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black">{pendencyRate}%</span>
              <span className="text-[10px] font-bold text-white/40 mb-1.5 uppercase">Média Geral</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden relative group">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Produtividade</p>
             <div className="flex items-end gap-2">
               <span className="text-4xl font-black text-slate-900">{completedCount}</span>
               <span className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Concluídas</span>
             </div>
             <div className="mt-3 flex -space-x-2">
                {Array(Math.min(3, completedCount)).fill(0).map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-blue-500/10 flex items-center justify-center text-[8px] font-bold text-blue-600">
                    M
                  </div>
                ))}
                {completedCount > 3 && (
                   <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                     +{completedCount - 3}
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Agenda de Hoje Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <h3 className="font-black text-slate-900 text-lg tracking-tight">Agenda de Hoje</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest truncate">Live • Operacional</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/agenda')}
            className="h-10 px-4 bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            Ver Agenda
            <ChevronRight size={12} strokeWidth={3} />
          </button>
        </div>

        <div className="space-y-3">
          {todayAssemblies.length === 0 ? (
            <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-slate-100 flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
                <Calendar size={32} />
              </div>
              <p className="text-slate-400 font-bold">Nenhuma montagem para hoje</p>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="mt-4 text-xs font-black text-blue-500 uppercase tracking-widest hover:underline"
              >
                Agendar Agora
              </button>
            </div>
          ) : (
            todayAssemblies.map((assembly, i) => (
              <motion.div
                key={assembly.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => navigate('/agenda')}
                className="relative bg-white p-4 sm:p-5 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group overflow-hidden active:scale-[0.99]"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <Clock size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Horário</span>
                      <span className="text-sm font-black text-slate-900 leading-none">{assembly.horario}</span>
                    </div>
                  </div>
                  <StatusBadge status={assembly.status} className="mt-1" />
                </div>

                <div className="space-y-3">
                  <div className="px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente & Local</h4>
                    <p className="text-base font-black text-slate-800 leading-tight mb-1 truncate">{assembly.cliente}</p>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin size={12} className="shrink-0" />
                      <p className="text-[11px] font-medium truncate">{assembly.endereco}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <UserIcon size={12} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-0.5">Responsável</span>
                        <span className="text-[10px] font-bold text-slate-600 leading-none">
                          {assembly.responsavelNome || 'Pendente'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <ChevronRight size={16} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AssemblyForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        assemblies={assemblies}
      />
    </div>
  );
};
