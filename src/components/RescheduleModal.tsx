import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, MessageSquare, AlertCircle, Save, Loader2 } from 'lucide-react';
import { updateDocument, logActivity, sendNotification, getCollection } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { serverTimestamp } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  assembly: any;
}

const REASONS = [
  'Cliente ausente',
  'Produto não chegou',
  'Falta peça',
  'Chuva / Condições climáticas',
  'Solicitação do cliente',
  'Problemas logísticos',
  'Outro'
];

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ isOpen, onClose, assembly }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data: '',
    horario: '',
    motivo: '',
    observacao: ''
  });

  React.useEffect(() => {
    if (isOpen && assembly) {
      setFormData({
        data: assembly.data || '',
        horario: assembly.horario || '',
        motivo: '',
        observacao: ''
      });
    }
  }, [isOpen, assembly]);

  if (!assembly) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data || !formData.horario || !formData.motivo) return;

    setLoading(true);
    try {
      const oldData = assembly.data;
      const oldHorario = assembly.horario;

      await updateDocument('montagens', assembly.id, {
        data: formData.data,
        horario: formData.horario,
        status: 'reagendada',
        atualizadoEm: serverTimestamp()
      });

      // Log the activity
      await logActivity(
        assembly.id,
        user?.id || '',
        user?.nome || 'Sistema',
        'reagendamento',
        `Reagendado de ${oldData} às ${oldHorario} para ${formData.data} às ${formData.horario}. Motivo: ${formData.motivo}. ${formData.observacao}`
      );

      // Notify Admins
      const allUsers = await getCollection('usuarios') as any[];
      const admins = allUsers?.filter(u => u.tipo === 'admin') || [];
      for (const admin of admins) {
        await sendNotification(
          admin.id,
          'Montagem Reagendada',
          `${user?.nome} reagendou a montagem de ${assembly.cliente} para ${formData.data} às ${formData.horario}.`,
          'alerta'
        );
      }

      // Notify Montador (if re-scheduled by admin)
      if (user?.tipo === 'admin' && assembly.responsavelId) {
        await sendNotification(
          assembly.responsavelId,
          'Sua Montagem foi Reagendada',
          `A montagem de ${assembly.cliente} foi reagendada para ${formData.data} às ${formData.horario}.`,
          'info'
        );
      }

      onClose();
    } catch (error) {
      console.error('Erro ao reagendar:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white rounded-t-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />

            <div className="px-8 pb-12 pt-2 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Reagendar</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-1">Ajuste de Cronograma</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Cliente</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{assembly.cliente}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Data</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      <input
                        type="date"
                        required
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm appearance-none outline-none"
                        value={formData.data}
                        onChange={e => setFormData({ ...formData, data: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Novo Horário</label>
                    <div className="relative group">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      <input
                        type="time"
                        required
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm appearance-none outline-none"
                        value={formData.horario}
                        onChange={e => setFormData({ ...formData, horario: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo</label>
                  <div className="relative">
                    <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    <select
                      required
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm appearance-none outline-none"
                      value={formData.motivo}
                      onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                    >
                      <option value="">Selecione o motivo</option>
                      {REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-3.5 text-slate-400" size={14} />
                    <textarea
                      placeholder="Detalhes opcionais..."
                      className="w-full h-20 bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 pt-2.5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm outline-none resize-none"
                      value={formData.observacao}
                      onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-14 border border-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.motivo}
                    className="h-14 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Save size={14} />
                        Confirmar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
