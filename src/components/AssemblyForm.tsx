import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, MapPin, Package, Calendar as CalendarIcon, Clock, MessageSquare, User, Loader2, UserCheck, CheckCircle2 } from 'lucide-react';
import { createDocument, updateDocument, subscribeToCollection, sendNotification, logActivity } from '@/src/firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { cn } from '@/src/lib/utils';

interface AssemblyFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

export const AssemblyForm: React.FC<AssemblyFormProps> = ({ isOpen, onClose, initialData }) => {
  const { user } = useAuth();
  const isReadOnly = user?.tipo === 'montador';
  
  const [formData, setFormData] = useState({
    cliente: '',
    endereco: '',
    produto: '',
    data: '',
    dataEntrega: '',
    horario: '',
    duracao: '01:00',
    prioridade: 'média',
    observacao: '',
    status: 'agendada',
    responsavelId: '',
    responsavelNome: ''
  });

  const [loading, setLoading] = useState(false);
  const [montadores, setMontadores] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowSuccess(false);
      if (initialData) {
        setFormData({
          cliente: initialData.cliente || '',
          endereco: initialData.endereco || '',
          produto: initialData.produto || '',
          data: initialData.data || '',
          dataEntrega: initialData.dataEntrega || '',
          horario: initialData.horario || '',
          duracao: initialData.duracao || '01:00',
          prioridade: initialData.prioridade || 'média',
          observacao: initialData.observacao || '',
          status: initialData.status || 'agendada',
          responsavelId: initialData.responsavelId || '',
          responsavelNome: initialData.responsavelNome || ''
        });
      } else {
        setFormData({
          cliente: '',
          endereco: '',
          produto: '',
          data: '',
          dataEntrega: '',
          horario: '',
          duracao: '01:00',
          prioridade: 'média',
          observacao: '',
          status: 'agendada',
          responsavelId: '',
          responsavelNome: ''
        });
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const unsub = subscribeToCollection('usuarios', (data) => {
      setMontadores(data.filter(m => m.ativo && m.tipo === 'montador'));
    });
    return () => unsub?.();
  }, []);

  const handleDeliveryDateChange = (deliveryDate: string) => {
    setFormData(prev => {
      const updated = { ...prev, dataEntrega: deliveryDate };
      if (deliveryDate && !prev.data) {
        updated.data = deliveryDate;
      }
      return updated;
    });
  };

  const getSuggestedDates = (deliveryDateStr: string) => {
    if (!deliveryDateStr) return [];
    try {
      const dates = [];
      const parts = deliveryDateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      for (let i = 0; i <= 3; i++) {
        const d = new Date(year, month, day);
        d.setDate(d.getDate() + i);
        
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const isoString = `${yyyy}-${mm}-${dd}`;
        
        const label = i === 0 ? 'Mesmo Dia' : `+${i} Dia${i > 1 ? 's' : ''}`;
        const weekday = weekdays[d.getDay()];
        const formattedDate = `${dd}/${mm}`;

        dates.push({
          iso: isoString,
          formatted: formattedDate,
          weekday,
          label
        });
      }
      return dates;
    } catch {
      return [];
    }
  };

  const getDaysDifference = (del: string, ass: string) => {
    if (!del || !ass) return { isValid: true, diff: 0 };
    try {
      const d1 = new Date(del + 'T00:00:00');
      const d2 = new Date(ass + 'T00:00:00');
      const timeDiff = d2.getTime() - d1.getTime();
      const diffDays = Math.round(timeDiff / (1000 * 3600 * 24));
      return {
        isValid: diffDays >= 0 && diffDays <= 3,
        diff: diffDays
      };
    } catch {
      return { isValid: true, diff: 0 };
    }
  };

  const validation = getDaysDifference(formData.dataEntrega, formData.data);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    try {
      const selectedMontador = montadores.find(m => m.id === formData.responsavelId);
      const data = {
        cliente: formData.cliente,
        endereco: formData.endereco,
        produto: formData.produto,
        data: formData.data,
        dataEntrega: formData.dataEntrega,
        horario: formData.horario,
        duracao: formData.duracao,
        prioridade: formData.prioridade,
        observacao: formData.observacao,
        status: formData.status,
        responsavelId: formData.responsavelId,
        responsavelNome: selectedMontador?.nome || formData.responsavelNome || '',
        atualizadoEm: serverTimestamp(),
      };

      if (initialData?.id) {
        await updateDocument('montagens', initialData.id, data);
        await logActivity(
          initialData.id,
          user?.id || '',
          user?.nome || 'Admin',
          'Edição',
          `Alteração nos dados da montagem de ${formData.cliente}`
        );
        if (formData.responsavelId) {
          await sendNotification(
            formData.responsavelId,
            'Montagem Atualizada',
            `A montagem para o cliente ${formData.cliente} foi alterada.`,
            formData.prioridade === 'urgente' ? 'urgente' : 'info'
          );
        }
      } else {
        const createData = {
          ...data,
          criadoEm: serverTimestamp()
        };
        const newId = await createDocument('montagens', createData);
        if (newId) {
          await logActivity(
            newId,
            user?.id || '',
            user?.nome || 'Admin',
            'Criação',
            `Agendamento criado para o cliente ${formData.cliente}`
          );
        }
        if (formData.responsavelId) {
          await sendNotification(
            formData.responsavelId,
            'Nova Montagem Atribuída',
            `Você tem uma nova montagem agendada para ${formData.cliente} em ${formData.data}.`,
            formData.prioridade === 'urgente' ? 'urgente' : 'info'
          );
        }
      }
      
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving assembly:', error);
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-[40px] z-[101] max-h-[94vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />

            <div className="flex items-center justify-between px-8 mb-6 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {isReadOnly ? 'Detalhes' : (initialData ? 'Editar Montagem' : 'Nova Montagem')}
                </h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {initialData ? 'Atualizar Registro' : 'Cadastro de Serviço'}
                </p>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </motion.button>
            </div>

            <form id="assembly-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 space-y-5 pb-12">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    required
                    placeholder="Nome do cliente"
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm disabled:bg-slate-50 disabled:text-slate-500 outline-none"
                    value={formData.cliente}
                    disabled={isReadOnly}
                    onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    required
                    placeholder="Endereço completo"
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm disabled:bg-slate-50 disabled:text-slate-500 outline-none"
                    value={formData.endereco}
                    disabled={isReadOnly}
                    onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável</label>
                  <div className="relative group">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <select
                      required
                      disabled={isReadOnly}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm appearance-none outline-none disabled:bg-slate-50 disabled:text-slate-500"
                      value={formData.responsavelId}
                      onChange={e => setFormData({ ...formData, responsavelId: e.target.value })}
                    >
                      <option value="">Selecione um montador</option>
                      {montadores.map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto</label>
                  <div className="relative group">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      required
                      disabled={isReadOnly}
                      placeholder="O que será montado?"
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm disabled:bg-slate-50 disabled:text-slate-500 outline-none"
                      value={formData.produto}
                      onChange={e => setFormData({ ...formData, produto: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Agendamento e Entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Data de Entrega */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Entrega</label>
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded-md">Previsão</span>
                  </div>
                  <div className="relative group">
                    <input
                      type="date"
                      disabled={isReadOnly}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
                      value={formData.dataEntrega}
                      onChange={e => handleDeliveryDateChange(e.target.value)}
                    />
                  </div>
                </div>

                {/* Data da Montagem */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Montagem</label>
                  <div className="relative group">
                    <input
                      type="date"
                      required
                      disabled={isReadOnly}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
                      value={formData.data}
                      onChange={e => setFormData({ ...formData, data: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* iOS Style Suggestions Capsule Container */}
              <AnimatePresence>
                {formData.dataEntrega && !isReadOnly && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Sugestões de Montagem (Janela de 3 Dias)</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
                      {getSuggestedDates(formData.dataEntrega).map((sug) => {
                        const isSelected = formData.data === sug.iso;
                        return (
                          <motion.button
                            key={sug.iso}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFormData(prev => ({ ...prev, data: sug.iso }))}
                            className={cn(
                              "px-3.5 py-2.5 rounded-2xl flex flex-col items-center justify-center shrink-0 border min-w-[76px] transition-all",
                              isSelected 
                                ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/15" 
                                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            <span className="text-[8px] font-black uppercase tracking-wider leading-none mb-1 opacity-70">{sug.weekday}</span>
                            <span className="text-xs font-black leading-none mb-1">{sug.formatted}</span>
                            <span className={cn(
                              "text-[7px] font-black uppercase tracking-tight px-1 py-0.5 rounded-md leading-none",
                              isSelected ? "bg-white/10 text-white" : "bg-slate-200/50 text-slate-500"
                            )}>
                              {sug.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Validation Warning Alert */}
              <AnimatePresence>
                {formData.dataEntrega && formData.data && !validation.isValid && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "p-3.5 rounded-2xl flex items-start gap-3 text-xs font-semibold leading-relaxed border transition-all shadow-sm",
                      validation.diff < 0 
                        ? "bg-amber-50 border-amber-100 text-amber-700" 
                        : "bg-red-50 border-red-100 text-red-700"
                    )}
                  >
                    <span className="text-base leading-none">⚠️</span>
                    <div>
                      <p className="font-extrabold text-[9px] uppercase tracking-wider">Atenção no Prazo de Montagem</p>
                      <p className="mt-0.5 text-[11px] font-bold">
                        {validation.diff < 0 
                          ? "A data reservada para a montagem é anterior à entrega do produto do cliente."
                          : `Montagem agendada para ${validation.diff} dias após a entrega. O prazo estipulado limite é de 3 dias.`
                        }
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Início & Duração Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início da Montagem</label>
                  <div className="relative group">
                    <input
                      type="time"
                      required
                      disabled={isReadOnly}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
                      value={formData.horario}
                      onChange={e => setFormData({ ...formData, horario: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duração Estimada</label>
                  <div className="relative group">
                    <input
                      type="time"
                      required
                      disabled={isReadOnly}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
                      value={formData.duracao}
                      onChange={e => setFormData({ ...formData, duracao: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'baixa', color: 'bg-slate-100 text-slate-600', active: 'bg-slate-900 border-slate-900 text-white' },
                    { value: 'média', color: 'bg-blue-50 text-blue-600', active: 'bg-blue-600 border-blue-600 text-white' },
                    { value: 'alta', color: 'bg-amber-50 text-amber-600', active: 'bg-amber-500 border-amber-500 text-white' },
                    { value: 'urgente', color: 'bg-red-50 text-red-600', active: 'bg-red-600 border-red-600 text-white' },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setFormData({ ...formData, prioridade: p.value })}
                      className={`h-10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                        formData.prioridade === p.value ? p.active : (p.color + ' border-transparent')
                      } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                      {p.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                  <div className="relative group">
                    <select
                      disabled={isReadOnly}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm appearance-none outline-none disabled:bg-slate-50 disabled:text-slate-500"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="agendada">Agendada</option>
                      <option value="em andamento">Em andamento</option>
                      <option value="concluída">Concluída</option>
                      <option value="pendência">Pendência</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Clock size={14} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação</label>
                  <div className="relative group">
                    <MessageSquare className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      disabled={isReadOnly}
                      placeholder="Detalhes opcionais..."
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm disabled:bg-slate-50 disabled:text-slate-500 outline-none"
                      value={formData.observacao}
                      onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {!isReadOnly && (
                <div className="pt-2">
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.96 }}
                    disabled={loading || showSuccess}
                    className={cn(
                      "w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50",
                      showSuccess ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-slate-900 text-white shadow-slate-900/10"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : showSuccess ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Save size={18} />
                    )}
                    {showSuccess ? 'Sucesso!' : (initialData ? 'Confirmar Alterações' : 'Criar Agendamento')}
                  </motion.button>
                </div>
              )}
            </form>

            <div className="mt-auto" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
