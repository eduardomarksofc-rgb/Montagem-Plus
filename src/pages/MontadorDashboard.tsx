import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  Package, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  Play, 
  CheckSquare, 
  History,
  ChevronRight,
  Loader2,
  Search,
  X as XIcon,
  LogOut
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { subscribeToCollection, updateDocument, logActivity, sendNotification, getCollection } from '@/src/firebase/firestore';
import { useAuth } from '@/src/context/AuthContext';
import { serverTimestamp } from 'firebase/firestore';
import { Camera, Image as ImageIcon, Check, Calendar } from 'lucide-react';
import { NotificationCenter } from '@/src/components/NotificationCenter';
import { RescheduleModal } from '@/src/components/RescheduleModal';
import { GlobalSearch } from '@/src/components/GlobalSearch';

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

const isDeliveryWarning = (deliveryDateStr: string, assemblyDateStr: string) => {
  if (!deliveryDateStr || !assemblyDateStr) return false;
  try {
    const d1 = new Date(deliveryDateStr + 'T00:00:00');
    const d2 = new Date(assemblyDateStr + 'T00:00:00');
    const timeDiff = d2.getTime() - d1.getTime();
    const diffDays = Math.round(timeDiff / (1000 * 3600 * 24));
    return diffDays < 0 || diffDays > 3;
  } catch {
    return false;
  }
};

export const MontadorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isPendencyModalOpen, setIsPendencyModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedAssembly, setSelectedAssembly] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [pendencyData, setPendencyData] = useState({
    tipo: '',
    descricao: '',
    observacao: ''
  });
  const [completionData, setCompletionData] = useState({
    observacao: '',
    foto: '' as string,
    checklist: {
      concluido: true,
      clientePresente: false,
      produtoConferido: false
    }
  });

  useEffect(() => {
    if (!user?.id) return;
    
    // Subscribe to assemblies specifically for this montador
    const unsub = subscribeToCollection('montagens', (data) => {
      setAssemblies(data.filter(a => a.responsavelId === user.montadorId || a.responsavelId === user.id));
      setLoading(false);
    }, 'responsavelId', user.montadorId || user.id);
    
    return () => unsub?.();
  }, [user]);

  const updateStatus = async (id: string, newStatus: string) => {
    await updateDocument('montagens', id, { 
      status: newStatus,
      atualizadoEm: serverTimestamp()
    });
    
    const assembly = assemblies.find(a => a.id === id);
    await logActivity(
      id,
      user?.id || '',
      user?.nome || '',
      'status',
      `Alterou status para: ${newStatus}`
    );
  };

  const notifyAdmins = async (titulo: string, mensagem: string, tipo: 'info' | 'alerta' | 'urgente' = 'info') => {
    const users = await getCollection('usuarios') as any[];
    const admins = users?.filter(u => u.tipo === 'admin') || [];
    for (const admin of admins) {
      await sendNotification(admin.id, titulo, mensagem, tipo);
    }
  };

  const handlePendency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssembly || !pendencyData.tipo || !pendencyData.descricao.trim()) return;

    await updateDocument('montagens', selectedAssembly.id, {
      status: 'pendência',
      tipoPendencia: pendencyData.tipo,
      descricaoPendencia: pendencyData.descricao,
      observacaoPendencia: pendencyData.observacao,
      criadoPor: user?.id,
      criadoPorNome: user?.nome,
      atualizadoEm: serverTimestamp()
    });

    await notifyAdmins(
      'Nova Pendência Reportada',
      `${user?.nome} reportou uma pendência (${pendencyData.tipo}) para o cliente ${selectedAssembly.cliente}.`,
      'urgente'
    );

    await logActivity(
      selectedAssembly.id,
      user?.id || '',
      user?.nome || '',
      'pendência',
      `Relatou pendência: ${pendencyData.tipo}`
    );

    setIsPendencyModalOpen(false);
    setPendencyData({ tipo: '', descricao: '', observacao: '' });
    setSelectedAssembly(null);
  };

  const compressImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Adjust quality to keep under 1MB
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        // Compress before setting state
        const compressed = await compressImage(base64);
        setCompletionData({ ...completionData, foto: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssembly) return;

    await updateDocument('montagens', selectedAssembly.id, {
      status: 'concluída',
      observacaoFinal: completionData.observacao,
      checklistFinal: completionData.checklist,
      fotoFinal: completionData.foto, // Base64 for now
      concluidoEm: serverTimestamp(),
      concluidoPor: user?.id,
      concluidoPorNome: user?.nome,
      atualizadoEm: serverTimestamp()
    });

    await notifyAdmins(
      'Montagem Concluída',
      `${user?.nome} finalizou a montagem para o cliente ${selectedAssembly.cliente}.`,
      'info'
    );

    await logActivity(
      selectedAssembly.id,
      user?.id || '',
      user?.nome || '',
      'conclusão',
      'Montagem concluída com sucesso'
    );

    setIsCompleteModalOpen(false);
    setCompletionData({
      observacao: '',
      foto: '',
      checklist: { concluido: true, clientePresente: false, produtoConferido: false }
    });
    setSelectedAssembly(null);
  };

  const filteredAssemblies = assemblies.filter(a => {
    const matchSearch = (a.cliente?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                      (a.produto?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                      (a.endereco?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());
    return matchSearch;
  }).sort((a, b) => {
    // Prioridade absoluta para status "em andamento"
    if (a.status === 'em andamento' && b.status !== 'em andamento') return -1;
    if (a.status !== 'em andamento' && b.status === 'em andamento') return 1;
    return a.data.localeCompare(b.data) || (a.horario?.localeCompare(b.horario) || 0);
  });

  const stats = {
    today: filteredAssemblies.filter(a => a.data === new Date().toISOString().split('T')[0]).length,
    pending: filteredAssemblies.filter(a => a.status === 'pendência').length,
    completed: filteredAssemblies.filter(a => a.status === 'concluída').length,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Welcome Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[18px] bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg ring-2 ring-white/50">
            {user?.nome?.charAt(0)}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              {getGreeting()}, <span className="text-blue-500">{user?.nome?.split(' ')[0]}</span> 👋
            </h1>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 leading-none">Montador Oficial</span>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Hoje', value: stats.today, color: 'text-blue-500', icon: Calendar },
          { label: 'Pendentes', value: stats.pending, color: 'text-amber-500', icon: AlertCircle },
          { label: 'Feitas', value: stats.completed, color: 'text-emerald-500', icon: CheckCircle2 },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-3 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
            <span className={cn("text-xl font-black leading-none mb-1", stat.color)}>{stat.value}</span>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider leading-none">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Main Task List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Suas Montagens</h2>
          <History size={18} className="text-slate-300" />
        </div>

        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-[32px] animate-pulse border border-slate-100" />
          ))
        ) : filteredAssemblies.length === 0 ? (
          <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-slate-100">
            <Package className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssemblies.map((assembly) => (
              <motion.div
                layout
                key={assembly.id}
                className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden active:scale-[0.99] transition-transform"
              >
                {/* Status Bar */}
                <div className={`h-1.5 w-full ${
                  assembly.status === 'concluída' ? 'bg-emerald-500' :
                  assembly.status === 'em andamento' ? 'bg-blue-500 animate-pulse' :
                  assembly.status === 'pendência' ? 'bg-amber-500' : 
                  assembly.status === 'reagendada' ? 'bg-amber-400' : 'bg-slate-200'
                }`} />

                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-black text-slate-900 text-base leading-tight truncate">{assembly.cliente}</h3>
                      <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                        <MapPin size={12} className="shrink-0" />
                        <span className="text-[11px] font-semibold truncate leading-none">{assembly.endereco}</span>
                      </div>
                    </div>
                    <div className="bg-blue-50 px-2.5 py-1 rounded-xl flex flex-col items-center shrink-0 border border-blue-100/50">
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter leading-none mb-0.5">Hora</span>
                      <span className="text-xs font-black text-blue-600 leading-none">{assembly.horario}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/30">
                    <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500 shrink-0 border border-slate-100">
                      <Package size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Produto</p>
                      <p className="text-[11px] font-bold text-slate-700 leading-tight truncate">{assembly.produto}</p>
                    </div>
                  </div>

                  {assembly.dataEntrega && (
                    <div className={cn(
                      "flex items-center justify-between p-2.5 px-3 rounded-2xl text-[10px] font-bold border transition-colors",
                      isDeliveryWarning(assembly.dataEntrega, assembly.data) 
                        ? "bg-red-50/70 border-red-100/50 text-red-600" 
                        : "bg-emerald-50/50 border-emerald-100/30 text-emerald-700"
                    )}>
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon size={13} className={isDeliveryWarning(assembly.dataEntrega, assembly.data) ? "text-red-500" : "text-emerald-500"} />
                        <span>Entrega: <strong className="font-extrabold">{formatShortDate(assembly.dataEntrega)}</strong></span>
                      </div>
                      <span className={cn(
                        "text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-sm",
                        isDeliveryWarning(assembly.dataEntrega, assembly.data) ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {isDeliveryWarning(assembly.dataEntrega, assembly.data) ? "Fora do Prazo (3d)" : "No Prazo"}
                      </span>
                    </div>
                  )}

                  {assembly.observacao && (
                    <div className="flex items-start gap-2 text-slate-500 italic px-3 py-2 bg-indigo-50/30 rounded-xl">
                      <MessageSquare size={12} className="mt-0.5 text-indigo-400 shrink-0" />
                      <p className="text-[10px] font-medium leading-normal">{assembly.observacao}</p>
                    </div>
                  )}

                  {assembly.status === 'pendência' && (
                    <div className="flex items-start gap-2 p-2.5 bg-red-50/50 rounded-xl border border-red-100/50">
                      <AlertCircle size={12} className="mt-0.5 text-red-500 shrink-0" />
                      <div>
                        <p className="text-[8px] font-black text-red-600 uppercase tracking-widest">Pendência</p>
                        <p className="text-[10px] font-bold text-red-700">{assembly.motivoPendencia || assembly.tipoPendencia}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {assembly.status === 'agendada' && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateStatus(assembly.id, 'em andamento')}
                        className="flex-1 h-11 bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                      >
                        <Play size={14} fill="currentColor" />
                        Trabalhar
                      </motion.button>
                    )}

                    {assembly.status === 'em andamento' && (
                      <>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setSelectedAssembly(assembly); setIsCompleteModalOpen(true); }}
                          className="flex-1 h-11 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                          <CheckCircle2 size={14} />
                          Finalizar
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setSelectedAssembly(assembly); setIsRescheduleModalOpen(true); }}
                          className="w-11 h-11 border border-slate-100 bg-white text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-50"
                        >
                          <CalendarIcon size={18} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setSelectedAssembly(assembly); setIsPendencyModalOpen(true); }}
                          className="w-11 h-11 border border-slate-100 bg-white text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-50"
                        >
                          <AlertCircle size={18} />
                        </motion.button>
                      </>
                    )}

                    {(assembly.status === 'concluída' || assembly.status === 'pendência' || assembly.status === 'reagendada') && (
                      <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</span>
                         <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                           assembly.status === 'concluída' ? 'bg-emerald-100 text-emerald-600' : 
                           assembly.status === 'reagendada' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                         }`}>
                           {assembly.status}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pendency Modal */}
      <AnimatePresence>
        {isPendencyModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPendencyModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[40px] shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
              
              <div className="px-8 pb-12 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Pendência</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Reportar Problema</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsPendencyModalOpen(false)} 
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
                  >
                    <XIcon size={18} />
                  </button>
                </div>

                <form onSubmit={handlePendency} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                    <select
                      required
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-sm outline-none"
                      value={pendencyData.tipo}
                      onChange={(e) => setPendencyData({ ...pendencyData, tipo: e.target.value })}
                    >
                      <option value="">Selecione o tipo</option>
                      <option value="cliente ausente">Cliente Ausente</option>
                      <option value="peça faltando">Peça Faltando</option>
                      <option value="produto avariado">Produto Avariado</option>
                      <option value="montagem incompleta">Montagem Incompleta</option>
                      <option value="reagendamento">Reagendamento</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="O que aconteceu?"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium resize-none text-sm outline-none"
                      value={pendencyData.descricao}
                      onChange={(e) => setPendencyData({ ...pendencyData, descricao: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação</label>
                    <input
                      placeholder="Mais detalhes..."
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium text-sm outline-none"
                      value={pendencyData.observacao}
                      onChange={(e) => setPendencyData({ ...pendencyData, observacao: e.target.value })}
                    />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    className="w-full h-14 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-2"
                  >
                    Confirmar Pendência
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {/* Completion Modal */}
        {isCompleteModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCompleteModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[40px] shadow-2xl flex flex-col max-h-[95vh]"
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
              
              <div className="px-8 pb-12 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Finalizar</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Conclusão do Serviço</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsCompleteModalOpen(false)} 
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
                  >
                    <XIcon size={18} />
                  </button>
                </div>

                <form onSubmit={handleComplete} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto (Opcional)</label>
                    <div className="relative h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] overflow-hidden flex flex-col items-center justify-center gap-2 group hover:bg-slate-100 transition-colors">
                      {completionData.foto ? (
                        <>
                          <img src={completionData.foto} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/40 to-transparent">
                            <p className="text-[8px] text-white font-black uppercase text-center">Toque para trocar</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                            <Camera size={20} />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 tracking-tight">Anexar foto</p>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Checklist</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'concluido', label: 'Montagem Finalizada' },
                        { id: 'clientePresente', label: 'Assinatura/Presença' },
                        { id: 'produtoConferido', label: 'Sem Avarias' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCompletionData({
                            ...completionData,
                            checklist: { ...completionData.checklist, [item.id]: !completionData.checklist[item.id as keyof typeof completionData.checklist] }
                          })}
                          className={`flex-1 h-11 px-4 rounded-xl border transition-all flex items-center justify-between ${
                            completionData.checklist[item.id as keyof typeof completionData.checklist] 
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                              : 'bg-white border-slate-100 text-slate-500'
                          }`}
                        >
                          <span className="text-[11px] font-bold">{item.label}</span>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            completionData.checklist[item.id as keyof typeof completionData.checklist] ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'
                          }`}>
                            <Check size={12} strokeWidth={4} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação</label>
                    <input
                      placeholder="Detalhes sobre a finalização..."
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm outline-none"
                      value={completionData.observacao}
                      onChange={(e) => setCompletionData({ ...completionData, observacao: e.target.value })}
                    />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    className="w-full h-15 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    Confirmar Conclusão
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => { setIsRescheduleModalOpen(false); setSelectedAssembly(null); }}
        assembly={selectedAssembly}
      />
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        assemblies={assemblies}
      />
    </div>
  );
};
