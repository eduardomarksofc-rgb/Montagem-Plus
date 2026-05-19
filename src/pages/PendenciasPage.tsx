import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertCircle, 
  User, 
  MapPin, 
  Package, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  ChevronRight,
  Loader2,
  CalendarDays,
  X,
  Save,
  ShieldCheck
} from 'lucide-react';
import { subscribeToCollection, updateDocument, sendNotification } from '@/src/firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/src/context/AuthContext';

export const PendenciasPage: React.FC = () => {
  const { user } = useAuth();
  const [pendencies, setPendencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPendency, setSelectedPendency] = useState<any>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [adminObservation, setAdminObservation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only admins should see this, but we filter for status 'pendência'
    const unsub = subscribeToCollection('montagens', (data) => {
      setPendencies(data.filter(a => a.status === 'pendência').sort((a, b) => b.atualizadoEm?.seconds - a.atualizadoEm?.seconds));
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  const handleResolve = async (newStatus: 'agendada' | 'concluída') => {
    if (!selectedPendency) return;
    setIsSubmitting(true);

    try {
      await updateDocument('montagens', selectedPendency.id, {
        status: newStatus,
        resolvidoPor: user?.id,
        resolvidoPorNome: user?.nome,
        resolvidoEm: serverTimestamp(),
        observacaoAdmin: adminObservation,
        atualizadoEm: serverTimestamp()
      });

      if (selectedPendency.responsavelId) {
        await sendNotification(
          selectedPendency.responsavelId,
          newStatus === 'agendada' ? 'Nova Data para Montagem' : 'Montagem Resolvida',
          `Sua pendência para o cliente ${selectedPendency.cliente} foi marcada como ${newStatus}.`,
          'info'
        );
      }

      setIsResolveModalOpen(false);
      setSelectedPendency(null);
      setAdminObservation('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pendências</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Problemas Relatados em Tempo Real</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-40 bg-white rounded-[32px] animate-pulse border border-slate-100" />)
        ) : pendencies.length === 0 ? (
          <div className="bg-white p-16 rounded-[40px] text-center border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Tudo em ordem!</h3>
            <p className="text-slate-400 font-medium">Nenhuma pendência aberta no momento.</p>
          </div>
        ) : (
          pendencies.map((p) => (
            <motion.div
              layout
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4">
                <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                  {p.tipoPendencia || 'Pendente'}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <User size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 leading-none">{p.cliente}</h4>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Montador: {p.responsavelNome}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Package size={14} className="text-slate-400" />
                  <span className="text-xs font-semibold">{p.produto}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarDays size={14} className="text-slate-400" />
                  <span className="text-xs font-semibold">{p.data} {p.horario}</span>
                </div>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-600 mt-0.5" />
                  <p className="text-sm font-bold text-amber-900 leading-tight">{p.descricaoPendencia}</p>
                </div>
                {p.observacaoPendencia && (
                  <p className="text-xs text-amber-700/70 italic ml-6 font-medium">"{p.observacaoPendencia}"</p>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedPendency(p); setIsResolveModalOpen(true); }}
                className="w-full h-12 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
              >
                Resolver Agora
                <ChevronRight size={14} />
              </motion.button>
            </motion.div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      <AnimatePresence>
        {isResolveModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResolveModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-[40px] p-8 z-[201] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Resolver Pendência</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ação Administrativa</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsResolveModalOpen(false)} 
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação do Admin</label>
                  <textarea
                    rows={3}
                    placeholder="Quais providências foram tomadas?"
                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] p-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium resize-none text-sm"
                    value={adminObservation}
                    onChange={(e) => setAdminObservation(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={isSubmitting}
                    onClick={() => handleResolve('agendada')}
                    className="h-14 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center leading-none"
                  >
                    <CalendarDays size={18} className="mb-1" />
                    Reagendar
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={isSubmitting}
                    onClick={() => handleResolve('concluída')}
                    className="h-14 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center leading-none shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 size={18} className="mb-1" />
                    Concluir
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
