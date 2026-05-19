import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  MapPin, 
  Package, 
  Clock, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  User,
  Filter,
  Users,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  ArrowUpDown,
  History as HistoryIcon,
  X,
  Calendar
} from 'lucide-react';
import { subscribeToCollection, deleteDocument, updateDocument, sendNotification } from '@/src/firebase/firestore';
import { StatusBadge, type AssemblyStatus } from '@/src/components/StatusBadge';
import { AssemblyForm } from '@/src/components/AssemblyForm';
import { RescheduleModal } from '@/src/components/RescheduleModal';
import { useAuth } from '../context/AuthContext';
import { cn } from '@/src/lib/utils';
import { startOfWeek, endOfWeek, isWithinInterval, addDays, format, isToday, isTomorrow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

export const AgendaPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [montadores, setMontadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [montadorFilter, setMontadorFilter] = useState<string>('todos');
  const [timeFilter, setTimeFilter] = useState<'todos' | 'hoje' | 'amanha' | 'semana'>('todos');
  const [priorityFilter, setPriorityFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'horario' | 'prioridade'>('horario');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedAssembly, setSelectedAssembly] = useState<any>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const unsubAssemblies = subscribeToCollection('montagens', (data) => {
      // Filter if user is montador
      const dataToProcess = user?.tipo === 'montador' 
        ? data.filter(a => a.responsavelId === user.montadorId || a.responsavelId === user.id)
        : data;

      setAssemblies(dataToProcess);
      setLoading(false);
    });

    const unsubUsers = subscribeToCollection('usuarios', (data) => {
      setMontadores(data.filter(u => u.tipo === 'montador' && u.ativo));
    });

    return () => {
      unsubAssemblies?.();
      unsubUsers?.();
    };
  }, [user]);

  const filteredAssemblies = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = addDays(today, 1);
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    return assemblies.filter(a => {
      const assemblyDate = new Date(a.data + 'T00:00:00');
      
      const matchSearch = (a.cliente?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                        (a.produto?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                        (a.endereco?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());
      
      const matchStatus = statusFilter === 'todos' || a.status === statusFilter;
      const matchMontador = montadorFilter === 'todos' || a.responsavelId === montadorFilter;
      const matchPriority = priorityFilter === 'todos' || a.prioridade === priorityFilter;
      
      let matchTime = true;
      if (timeFilter === 'hoje') matchTime = isToday(assemblyDate);
      else if (timeFilter === 'amanha') matchTime = isTomorrow(assemblyDate);
      else if (timeFilter === 'semana') matchTime = isWithinInterval(assemblyDate, { start: weekStart, end: weekEnd });

      return matchSearch && matchStatus && matchMontador && matchTime && matchPriority;
    }).sort((a, b) => {
      if (sortBy === 'prioridade') {
        const priorityScore: any = { 'urgente': 4, 'alta': 3, 'média': 2, 'baixa': 1 };
        return priorityScore[b.prioridade] - priorityScore[a.prioridade];
      }
      const dateA = new Date(`${a.data}T${a.horario}`);
      const dateB = new Date(`${b.data}T${b.horario}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [assemblies, debouncedSearch, statusFilter, montadorFilter, timeFilter, priorityFilter, sortBy]);

  const groupedAssemblies = useMemo(() => {
    const groups: { [key: string]: any[] } = {
      'Hoje': [],
      'Amanhã': [],
      'Próximos': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrow = today + (24 * 60 * 60 * 1000);

    filteredAssemblies.forEach(a => {
      const assemblyDate = new Date(a.data + 'T00:00:00').getTime();
      if (assemblyDate === today) {
        groups['Hoje'].push(a);
      } else if (assemblyDate === tomorrow) {
        groups['Amanhã'].push(a);
      } else {
        groups['Próximos'].push(a);
      }
    });

    return groups;
  }, [filteredAssemblies]);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta montagem?')) {
      await deleteDocument('montagens', id);
      setActionMenuId(null);
    }
  };

  const handleEdit = (assembly: any) => {
    setSelectedAssembly(assembly);
    setIsFormOpen(true);
    setActionMenuId(null);
  };

  const updateStatus = async (id: string, status: AssemblyStatus) => {
    await updateDocument('montagens', id, { status });
    const assembly = assemblies.find(a => a.id === id);
    if (assembly && assembly.responsavelId) {
      await sendNotification(
        assembly.responsavelId,
        'Status Atualizado',
        `O status da sua montagem para ${assembly.cliente} foi alterado para ${status}.`,
        'info'
      );
    }
    setActionMenuId(null);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'baixa': return 'bg-slate-100 text-slate-500';
      case 'média': return 'bg-blue-100 text-blue-600';
      case 'alta': return 'bg-amber-100 text-amber-600';
      case 'urgente': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Agenda</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-1.5">Cronograma Geral</p>
        </div>
        {user?.tipo === 'admin' && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setSelectedAssembly(null); setIsFormOpen(true); }}
            className="w-12 h-12 bg-blue-600 rounded-[18px] flex items-center justify-center text-white shadow-lg shadow-blue-600/20"
          >
            <Plus size={24} strokeWidth={3} />
          </motion.button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="space-y-4">
        {/* Compact Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-all" size={18} />
          <input
            placeholder="Cliente ou produto..."
            className="w-full h-11 bg-white border border-slate-100 rounded-2xl pl-11 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm shadow-sm outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Primary Row: Time Filters */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 p-1 bg-white border border-slate-100 rounded-2xl w-fit shrink-0">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'hoje', label: 'Hoje' },
              { id: 'amanha', label: 'Amanhã' },
              { id: 'semana', label: 'Semana' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  timeFilter === t.id ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsFilterSheetOpen(true)}
            className="h-10 px-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm active:scale-95 transition-all"
          >
            <Filter size={14} className="text-blue-500" />
            Filtros
          </button>
        </div>

        {/* Secondary Row: Status Filters (Simplified) */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { id: 'todos', label: 'Todos Status' },
            { id: 'em andamento', label: 'Em Andamento' },
            { id: 'pendência', label: 'Pendências' },
            { id: 'agendada', label: 'Agendadas' }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={cn(
                "px-4 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 border",
                statusFilter === s.id 
                  ? "bg-blue-50 border-blue-100 text-blue-600" 
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {loading ? (
          Array(2).fill(0).map((_, i) => (
             <div key={i} className="space-y-4">
                <div className="h-5 w-20 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-32 bg-white rounded-[32px] animate-pulse border border-slate-100" />
             </div>
          ))
        ) : filteredAssemblies.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] text-center border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 mb-3">
              <CalendarDays size={32} />
            </div>
            <p className="text-slate-400 font-bold text-sm">Nenhum evento encontrado</p>
          </div>
        ) : (
          Object.entries(groupedAssemblies).map(([title, items]) => (items as any[]).length > 0 && (
            <div key={title} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{title}</h2>
                <div className="h-px flex-1 bg-slate-50" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{(items as any[]).length} SERVIÇOS</span>
              </div>

              <div className="space-y-3">
                {(items as any[]).map((assembly) => (
                  <motion.div
                    layout
                    key={assembly.id}
                    className="bg-white rounded-[28px] border border-slate-100 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className={cn(
                      "h-1.5 w-full rounded-t-[28px]",
                      assembly.status === 'concluída' ? 'bg-emerald-500' : 
                      assembly.status === 'pendência' ? 'bg-red-500' : 
                      assembly.status === 'em andamento' ? 'bg-blue-500' : 'bg-slate-200'
                    )} />

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm border",
                            assembly.status === 'concluída' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                            assembly.status === 'pendência' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-500'
                          )}>
                            {assembly.status === 'concluída' ? (
                              <CheckCircle2 size={20} />
                            ) : assembly.status === 'pendência' ? (
                              <AlertTriangle size={20} />
                            ) : (
                              <span className="text-[13px] font-black leading-none">{assembly.horario.split(':')[0]}h</span>
                            )}
                          </div>
                          <div className="min-w-0 pr-2">
                             <h3 className="font-black text-slate-900 text-sm leading-tight truncate">{assembly.cliente}</h3>
                             <div className="flex items-center gap-2 mt-1">
                               <StatusBadge status={assembly.status} />
                               <span className={cn(
                                 "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                 getPriorityColor(assembly.prioridade)
                               )}>
                                 {assembly.prioridade}
                               </span>
                             </div>
                          </div>
                        </div>

                        <div className="relative">
                          <button 
                            onClick={() => setActionMenuId(actionMenuId === assembly.id ? null : assembly.id)}
                            className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          <AnimatePresence>
                            {actionMenuId === assembly.id && (
                              <>
                                <div className="fixed inset-0 z-[140]" onClick={() => setActionMenuId(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8, originX: 0.9, originY: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                  className="absolute right-0 top-11 w-44 bg-white/80 backdrop-blur-2xl rounded-[22px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-white p-1 z-[150] ring-1 ring-slate-900/5 overflow-hidden"
                                >
                                  <div className="p-1 space-y-0.5">
                                    <button 
                                      onClick={() => handleEdit(assembly)} 
                                      className="w-full flex items-center justify-between h-10 px-3 hover:bg-slate-900/5 rounded-xl transition-all text-slate-700 active:scale-[0.98]"
                                    >
                                      <span className="font-bold text-[10px] uppercase tracking-widest">Editar</span>
                                      <Edit2 size={12} className="text-blue-500" />
                                    </button>
                                    
                                    <button 
                                      onClick={() => {
                                        setSelectedAssembly(assembly);
                                        setIsRescheduleOpen(true);
                                        setActionMenuId(null);
                                      }} 
                                      className="w-full flex items-center justify-between h-10 px-3 hover:bg-slate-900/5 rounded-xl transition-all text-slate-700 active:scale-[0.98]"
                                    >
                                      <span className="font-bold text-[10px] uppercase tracking-widest">Reagendar</span>
                                      <Calendar size={12} className="text-amber-500" />
                                    </button>
                                  </div>

                                  <div className="h-px bg-slate-100/50 mx-2" />
                                  
                                  <div className="p-1.5 pt-2">
                                    <p className="text-[8px] uppercase font-black text-slate-300 ml-2 mb-1.5 tracking-[0.1em]">Status</p>
                                    <div className="grid grid-cols-2 gap-1">
                                      {(['agendada', 'concluída', 'pendência', 'reagendada'] as AssemblyStatus[]).map(s => (
                                        <button 
                                          key={s}
                                          onClick={() => updateStatus(assembly.id, s)}
                                          className={cn(
                                            "h-8 flex items-center justify-center rounded-lg text-[7px] font-black uppercase tracking-tight transition-all",
                                            assembly.status === s 
                                              ? "bg-slate-900 text-white shadow-sm" 
                                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                          )}
                                        >
                                          {s}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {user?.tipo === 'admin' && (
                                    <>
                                      <div className="h-px bg-slate-100/50 mx-2" />
                                      <div className="p-1">
                                        <button 
                                          onClick={() => handleDelete(assembly.id)} 
                                          className="w-full flex items-center justify-between h-9 px-3 hover:bg-red-50 text-red-500 rounded-xl transition-all active:scale-[0.98]"
                                        >
                                          <span className="font-bold text-[9px] uppercase tracking-widest">Excluir</span>
                                          <Trash2 size={12} className="opacity-50" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/30">
                        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500 shrink-0 border border-slate-100">
                          <Package size={16} />
                        </div>
                        <div className="min-w-0 pr-2">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Produto</p>
                          <p className="text-[11px] font-bold text-slate-700 leading-tight truncate">{assembly.produto}</p>
                        </div>
                        <div className="h-5 w-px bg-slate-100 mx-auto shrink-0" />
                        <div className="flex items-center gap-1.5 shrink-0 pl-1">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-[11px] font-black text-slate-900">{assembly.horario}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
                          <MapPin size={12} className="shrink-0" />
                          <span className="text-[10px] font-semibold truncate leading-none">{assembly.endereco}</span>
                        </div>
                        {assembly.responsavelNome && (
                          <div className="shrink-0 flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg">
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-[8px] font-black shrink-0 uppercase">{assembly.responsavelNome.charAt(0)}</div>
                            <span className="text-[9px] font-black uppercase tracking-tight text-blue-600 truncate max-w-[80px]">{assembly.responsavelNome.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Advanced Filters Bottom Sheet */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterSheetOpen(false)}
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
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Filtros</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Refine a Visualização</p>
                  </div>
                  <button 
                    onClick={() => setIsFilterSheetOpen(false)} 
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Priority */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['todos', 'baixa', 'média', 'alta', 'urgente'].map(p => (
                        <button
                          key={p}
                          onClick={() => setPriorityFilter(p)}
                          className={cn(
                            "px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                            priorityFilter === p ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-500"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ordem</label>
                    <div className="flex gap-2">
                       {[
                         { id: 'horario', label: 'Horário', icon: Clock },
                         { id: 'prioridade', label: 'Prioridade', icon: ArrowUpDown }
                       ].map(s => (
                         <button
                           key={s.id}
                           onClick={() => setSortBy(s.id as any)}
                           className={cn(
                             "flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                             sortBy === s.id ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-100 text-slate-500"
                           )}
                         >
                           <s.icon size={14} />
                           {s.label}
                         </button>
                       ))}
                    </div>
                  </div>

                  {/* Montadores */}
                  {user?.tipo === 'admin' && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montador</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                          className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm outline-none appearance-none"
                          value={montadorFilter}
                          onChange={e => setMontadorFilter(e.target.value)}
                        >
                          <option value="todos">Todos Montadores</option>
                          {montadores.map(m => (
                            <option key={m.id} value={m.id}>{m.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/10 mt-2"
                  >
                    Confirmar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AssemblyForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setSelectedAssembly(null); }}
        initialData={selectedAssembly}
      />

      <RescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => { setIsRescheduleOpen(false); setSelectedAssembly(null); }}
        assembly={selectedAssembly}
      />
    </div>
  );
};
