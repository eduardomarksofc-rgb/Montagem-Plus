import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/context/AuthContext';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  MapPin, 
  User as UserIcon, 
  X,
  Package,
  TrendingUp,
  SlidersHorizontal,
  Phone,
  HelpCircle,
  Hash,
  Info
} from 'lucide-react';
import { subscribeToCollection } from '@/src/firebase/firestore';
import { StatusBadge, AssemblyStatus } from '@/src/components/StatusBadge';
import { format, isToday } from 'date-fns';

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

const formatFullDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

export const VendasDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssembly, setSelectedAssembly] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('todas');

  useEffect(() => {
    const unsub = subscribeToCollection('montagens', (data) => {
      // Sort by date descending then time descending so recent ones come first
      const sorted = [...data].sort((a, b) => {
        const dateA = a.data || '';
        const dateB = b.data || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.horario || '').localeCompare(a.horario || '');
      });
      setAssemblies(sorted);
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Filters calculation
  const stats = {
    total: assemblies.length,
    active: assemblies.filter(a => ['agendada', 'em andamento', 'reagendada'].includes(a.status)).length,
    completed: assemblies.filter(a => a.status === 'concluída').length,
    alert: assemblies.filter(a => a.status === 'pendência' || (a.dataEntrega && isDeliveryWarning(a.dataEntrega, a.data))).length
  };

  // Filters by status tab & search string
  const filteredAssemblies = assemblies.filter(a => {
    // 1. Tab filter
    if (activeTab === 'agendadas' && a.status !== 'agendada' && a.status !== 'reagendada') return false;
    if (activeTab === 'andamento' && a.status !== 'em andamento') return false;
    if (activeTab === 'concluídas' && a.status !== 'concluída') return false;
    if (activeTab === 'pendências' && a.status !== 'pendência') return false;

    // 2. Search filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const clientMatch = (a.cliente || '').toLowerCase().includes(q);
      const productMatch = (a.produto || '').toLowerCase().includes(q);
      const addressMatch = (a.endereco || '').toLowerCase().includes(q);
      return clientMatch || productMatch || addressMatch;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-12 h-12 rounded-[18px] bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg ring-2 ring-white/50"
          >
            {user?.nome.charAt(0)}
          </motion.div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-none tracking-tight">
              {getGreeting()}, <span className="text-indigo-600">{user?.nome.split(' ')[0]}</span>
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">
                Equipe de Vendas • Somente Leitura
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Glassmorphism Quick Search View */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 focus-within:text-indigo-500 transition-colors" size={18} />
        <input
          type="text"
          placeholder="Buscar por cliente, produto ou endereço..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-13 bg-white border border-slate-100/80 rounded-2xl pl-12 pr-10 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white transition-all font-bold text-sm outline-none shadow-sm placeholder:text-slate-400"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-4.5 rounded-[24px] border border-slate-100 flex flex-col justify-between shadow-xs">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ativas</span>
          <span className="text-2xl font-black text-slate-900 mt-1">{stats.active}</span>
        </div>
        <div className="bg-emerald-500/5 p-4.5 rounded-[24px] border border-emerald-500/10 flex flex-col justify-between shadow-xs">
          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Concluídas</span>
          <span className="text-2xl font-black text-emerald-700 mt-1">{stats.completed}</span>
        </div>
        <div className="bg-amber-500/5 p-4.5 rounded-[24px] border border-amber-500/10 flex flex-col justify-between shadow-xs">
          <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Alertas / Pend.</span>
          <span className="text-2xl font-black text-amber-700 mt-1">{stats.alert}</span>
        </div>
      </div>

      {/* Android/iOS Premium Scrollable Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2 pt-1 border-b border-slate-100">
        {[
          { id: 'todas', label: 'Todas' },
          { id: 'agendadas', label: 'Agendadas' },
          { id: 'andamento', label: 'Andando' },
          { id: 'concluídas', label: 'Concluídas' },
          { id: 'pendências', label: 'Pendências' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 transition-all border ${
              activeTab === tab.id 
                ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                : 'bg-white border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Assembly Orders Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-extrabold text-slate-950 text-base tracking-tight">Status de Montagens</h3>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{filteredAssemblies.length} ordens</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredAssemblies.length === 0 ? (
          <div className="bg-white p-12 rounded-[40px] text-center border border-dashed border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
              <Package size={28} />
            </div>
            <p className="text-slate-400 font-bold mb-1">Nenhuma montagem encontrada</p>
            <p className="text-[10px] text-slate-400">Tente ajustar seus filtros ou busca.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredAssemblies.map((assembly, idx) => {
              const deliveryWarning = assembly.dataEntrega && isDeliveryWarning(assembly.dataEntrega, assembly.data);
              return (
                <motion.div
                  key={assembly.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                  onClick={() => setSelectedAssembly(assembly)}
                  className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-xs hover:shadow-lg hover:shadow-slate-200/40 transition-all cursor-pointer active:scale-[0.99] group overflow-hidden relative"
                >
                  {/* Left accent matching status */}
                  <div className={`absolute top-0 left-0 w-1.2 h-full ${
                    assembly.status === 'concluída' ? 'bg-emerald-500' :
                    assembly.status === 'pendência' ? 'bg-red-500' :
                    assembly.status === 'em andamento' ? 'bg-indigo-500' :
                    assembly.status === 'reagendada' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />

                  <div className="flex items-center justify-between mb-3.5">
                    <StatusBadge status={assembly.status} />
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={12} />
                      <span className="text-[11px] font-black">{assembly.horario || '00:00'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Cliente</span>
                    <h4 className="text-base font-black text-slate-900 leading-tight truncate">{assembly.cliente}</h4>
                    
                    <div className="flex items-center gap-2 pt-1 font-bold text-xs text-slate-500">
                      <Package size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{assembly.produto || 'Sem Produto Especificado'}</span>
                    </div>
                  </div>

                  {/* Dates Row & Deadlines */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4 p-2.5 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Entrega</span>
                      <span className="text-xs font-black text-slate-700 mt-0.5">
                        {assembly.dataEntrega ? formatShortDate(assembly.dataEntrega) : 'Não inf.'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Montagem</span>
                      <span className={`text-xs font-black mt-0.5 ${deliveryWarning ? 'text-red-600' : 'text-slate-800'}`}>
                        {assembly.data ? formatShortDate(assembly.data) : 'Agendar'}
                        {deliveryWarning && ' ⚠️'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3.5 mt-3.5 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <UserIcon size={11} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-0.5">Montador</span>
                        <span className="text-[10px] font-bold text-slate-600 leading-none">
                          {assembly.responsavelNome || 'Pendente de Atribuição'}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRight size={16} strokeWidth={3} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assembly Read Only Detail Slip up view */}
      <AnimatePresence>
        {selectedAssembly && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAssembly(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[40px] shadow-2xl flex flex-col max-h-[90vh] pb-8"
            >
              {/* iOS style Bar Indicator */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />

              <div className="px-8 overflow-y-auto space-y-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Inspecionar Ordem</h3>
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-1">Sessão Segura de Leitura</p>
                  </div>
                  <button 
                    onClick={() => setSelectedAssembly(null)} 
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Status Indicator Bar */}
                <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Status no sistema</span>
                  <StatusBadge status={selectedAssembly.status} />
                </div>

                {/* Client Profile Section */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Cliente Solicitante</span>
                  <div className="bg-slate-50 p-4.5 rounded-[24px] border border-slate-100">
                    <p className="text-base font-black text-slate-900">{selectedAssembly.cliente || 'Sem Nome'}</p>
                    {selectedAssembly.telefone && (
                      <div className="flex items-center gap-1.5 mt-2 text-slate-500 font-bold text-xs">
                        <Phone size={13} className="text-indigo-500" />
                        <span>{selectedAssembly.telefone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Section */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Especificações do Produto</span>
                  <div className="bg-slate-50 p-4.5 rounded-[24px] border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Package size={20} />
                    </div>
                    <span className="text-sm font-black text-slate-800 leading-tight">{selectedAssembly.produto || 'Não informado'}</span>
                  </div>
                </div>

                {/* Operation Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Previsão Entrega</span>
                    <span className="text-xs font-black text-slate-800">
                      {selectedAssembly.dataEntrega ? formatFullDate(selectedAssembly.dataEntrega) : 'Pendente'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Montagem Agendada</span>
                    <span className="text-xs font-black text-slate-800">
                      {selectedAssembly.data ? formatFullDate(selectedAssembly.data) : 'Pendente'}
                    </span>
                  </div>
                </div>

                {/* Warnings regarding delivery / assembly timeframe */}
                {selectedAssembly.dataEntrega && selectedAssembly.data && (
                  <div className={`p-4 rounded-2xl flex items-start gap-3 border text-xs font-semibold ${
                    isDeliveryWarning(selectedAssembly.dataEntrega, selectedAssembly.data)
                      ? 'bg-amber-50/70 border-amber-100 text-amber-800'
                      : 'bg-emerald-50/70 border-emerald-100 text-emerald-800'
                  }`}>
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-extrabold text-[9px] uppercase tracking-wider">Prazo Operacional de Montagem</p>
                      <p className="mt-0.5 text-[11px] font-bold leading-relaxed">
                        {isDeliveryWarning(selectedAssembly.dataEntrega, selectedAssembly.data)
                          ? 'Atenção! O intervalo recomendado de montagem até 3 dias após a entrega foi ultrapassado.'
                          : 'Janela operacional regular. Montagem dentro do prazo limite recomendado de 3 dias.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Endereço de Entrega</span>
                  <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 flex items-start gap-2 text-slate-650 text-xs font-bold leading-relaxed">
                    <MapPin size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                    <span>{selectedAssembly.endereco || 'Sem endereço registrado'}</span>
                  </div>
                </div>

                {/* Assignment Info */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Staff / Montador Responsável</span>
                  <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                      <UserIcon size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-705 leading-none">
                        {selectedAssembly.responsavelNome || 'Pendente de Atribuição'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View-Only Warning badge */}
                <div className="pt-2 text-center">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em] bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                    Acesso de Leitura Lock • Não Editável
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
