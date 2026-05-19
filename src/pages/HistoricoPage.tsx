import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  History, 
  User, 
  Package, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ChevronRight,
  X,
  MapPin,
  MessageSquare,
  FileText,
  Camera,
  Users,
  ArrowUpDown
} from 'lucide-react';
import { subscribeToCollection } from '@/src/firebase/firestore';
import { useAuth } from '@/src/context/AuthContext';
import { StatusBadge } from '@/src/components/StatusBadge';
import { cn } from '@/src/lib/utils';
import { AssemblyForm } from '@/src/components/AssemblyForm';

export const HistoricoPage: React.FC = () => {
  const { user } = useAuth();
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [montadores, setMontadores] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('todos');
  const [montadorFilter, setMontadorFilter] = useState<string>('todos');
  const [selectedAssembly, setSelectedAssembly] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const unsubAssemblies = subscribeToCollection('montagens', (data) => {
      // Filter for history (completed or has history)
      const filtered = user?.tipo === 'admin' 
        ? data 
        : data.filter(a => a.responsavelId === user?.montadorId || a.responsavelId === user?.id);
      
      setAssemblies(filtered);
      setLoading(false);
    });

    const unsubUsers = subscribeToCollection('usuarios', (data) => {
      setMontadores(data.filter(u => u.tipo === 'montador' && u.ativo));
    });

    const unsubLogs = subscribeToCollection('historicoAlteracoes', (data) => {
      setLogs(data);
    });

    return () => {
      unsubAssemblies?.();
      unsubUsers?.();
      unsubLogs?.();
    };
  }, [user]);

  const filteredAssemblies = assemblies.filter(a => {
    const matchSearch = (a.cliente?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                      (a.produto?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                      (a.responsavelNome?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());
    const matchPriority = priorityFilter === 'todos' || a.prioridade === priorityFilter;
    const matchMontador = montadorFilter === 'todos' || a.responsavelId === montadorFilter;

    return matchSearch && matchPriority && matchMontador;
  }).sort((a, b) => {
    const dateA = a.atualizadoEm?.seconds || a.criadoEm?.seconds || 0;
    const dateB = b.atualizadoEm?.seconds || b.criadoEm?.seconds || 0;
    return dateB - dateA;
  });

  const getAssemblyLogs = (id: string) => {
    return logs
      .filter(l => l.montagemId === id)
      .sort((a, b) => {
        const dateA = a.dataAlteracao?.seconds || 0;
        const dateB = b.dataAlteracao?.seconds || 0;
        return dateB - dateA;
      });
  };

  const formatLogTime = (logData: any) => {
    if (!logData) return '--:--';
    try {
      if (typeof logData.toDate === 'function') {
        return logData.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
      if (logData.seconds) {
        return new Date(logData.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
      return '--:--';
    } catch (e) {
      return '--:--';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Histórico</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Arquivo Digital de Montagens</p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-all" size={20} />
          <input
            placeholder="Buscar histórico por cliente, produto ou montador..."
            className="w-full h-14 bg-white border border-slate-100 rounded-[24px] pl-14 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-sm shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Priority Filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-100 shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select
              className="flex-1 bg-transparent text-[10px] font-black text-slate-600 outline-none appearance-none uppercase tracking-widest"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
            >
              <option value="todos">Todas Prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="média">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          {user?.tipo === 'admin' && (
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-100 shadow-sm transition-all overflow-hidden">
              <Users size={14} className="text-blue-500" />
              <select
                className="flex-1 bg-transparent text-[10px] font-black text-slate-600 outline-none appearance-none uppercase tracking-widest truncate"
                value={montadorFilter}
                onChange={e => setMontadorFilter(e.target.value)}
              >
                <option value="todos">Todos Montadores</option>
                {montadores.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-slate-100" />)
        ) : filteredAssemblies.length === 0 ? (
          <div className="bg-white p-16 rounded-[40px] text-center border border-dashed border-slate-200">
            <History size={48} className="mx-auto text-slate-100 mb-4" />
            <p className="text-slate-400 font-bold">Nenhum registro encontrado</p>
          </div>
        ) : (
          filteredAssemblies.map((a) => (
            <motion.div
              key={a.id}
              onClick={() => { setSelectedAssembly(a); setIsDetailsOpen(true); }}
              className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                  a.status === 'concluída' ? 'bg-emerald-50 text-emerald-600' : 
                  a.status === 'pendência' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {a.cliente?.charAt(0) || '?'}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-none mb-1">{a.cliente || 'Sem Nome'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{a.produto || 'Sem Produto'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-slate-400 font-medium">{a.data}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                      a.prioridade === 'urgente' ? 'bg-red-50 text-red-600 border-red-100' : 
                      a.prioridade === 'alta' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                    )}>
                      {a.prioridade || 'média'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                <ChevronRight size={18} className="text-slate-300" />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedAssembly && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed inset-x-0 bottom-0 top-[10%] bg-white rounded-t-[40px] z-[201] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Detalhes</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ficha Técnica da Montagem</p>
                </div>
                <button onClick={() => setIsDetailsOpen(false)} className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-32">
                {/* Status and Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={selectedAssembly.status} />
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        selectedAssembly.prioridade === 'urgente' ? 'bg-red-50 text-red-600 border-red-100' : 
                        selectedAssembly.prioridade === 'alta' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                      )}>
                        Prioridade {selectedAssembly.prioridade || 'média'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{selectedAssembly.cliente}</h3>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={16} className="text-blue-500" />
                        <span className="text-sm font-semibold">{selectedAssembly.endereco}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photo if exists */}
                {selectedAssembly.fotoFinal && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comprovação Visual</p>
                    <div className="aspect-video w-full rounded-[32px] overflow-hidden bg-slate-100 border border-slate-100 shadow-inner">
                      <img src={selectedAssembly.fotoFinal} className="w-full h-full object-cover" alt="Conclusão" />
                    </div>
                  </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-[28px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsável</p>
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                         <User size={16} />
                       </div>
                       <span className="text-xs font-bold text-slate-700">{selectedAssembly.responsavelNome}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-[28px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data e Hora</p>
                    <div className="flex items-center gap-2 text-slate-700">
                       <CalendarIcon size={16} className="text-blue-500" />
                       <span className="text-xs font-bold">{selectedAssembly.data} • {selectedAssembly.horario}</span>
                    </div>
                  </div>
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 space-y-4">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-blue-500" />
                      <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Informações Adicionais</h4>
                    </div>
                    
                    <div className="space-y-4 text-sm font-medium text-slate-600">
                      <div>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-wider mb-1">Produto</p>
                        <p className="text-slate-900 font-bold">{selectedAssembly.produto}</p>
                      </div>
                      
                      {selectedAssembly.observacao && (
                        <div>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-wider mb-1">Observação do Agendamento</p>
                          <p className="italic">"{selectedAssembly.observacao}"</p>
                        </div>
                      )}

                      {selectedAssembly.observacaoFinal && (
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider mb-1">Relatório do Montador</p>
                          <p className="text-emerald-900 font-bold">"{selectedAssembly.observacaoFinal}"</p>
                        </div>
                      )}

                      {selectedAssembly.status === 'pendência' && (
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                          <p className="text-[9px] font-black text-red-400 uppercase tracking-wider mb-1">Pendência Detectada</p>
                          <p className="text-red-900 font-bold">{selectedAssembly.tipoPendencia}: {selectedAssembly.descricaoPendencia}</p>
                          {selectedAssembly.observacaoPendencia && <p className="text-xs mt-1 text-red-700/70 italic">"{selectedAssembly.observacaoPendencia}"</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activity Log */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 ml-1">
                    <Clock size={16} className="text-slate-400" />
                    <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Timeline de Atividades</h4>
                  </div>
                  <div className="space-y-3">
                    {getAssemblyLogs(selectedAssembly.id).map((log, idx) => (
                      <div key={log.id} className="relative pl-6 pb-4 last:pb-0">
                        {/* Line */}
                        {idx !== getAssemblyLogs(selectedAssembly.id).length - 1 && (
                          <div className="absolute left-1.5 top-2 bottom-0 w-0.5 bg-slate-100" />
                        )}
                        {/* Dot */}
                        <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white bg-slate-300 shadow-sm" />
                        
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black text-slate-900 uppercase">{log.tipoAlteracao}</span>
                            <span className="text-[9px] text-slate-400 font-bold">
                              {formatLogTime(log.dataAlteracao)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{log.descricao}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mt-0.5">Por {log.usuarioNome}</p>
                        </div>
                      </div>
                    ))}
                    {getAssemblyLogs(selectedAssembly.id).length === 0 && (
                      <p className="text-xs text-slate-300 font-bold italic ml-1">Nenhuma atividade registrada na timeline</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action for Admin - Resolving or editing */}
               {user?.tipo === 'admin' && (
                 <div className="p-8 bg-white border-t border-slate-50">
                   <motion.button
                     whileTap={{ scale: 0.98 }}
                     onClick={() => { 
                       setIsDetailsOpen(false); 
                       // Wait for details to close to avoid z-index/backdrop issues
                       setTimeout(() => setIsEditOpen(true), 100);
                     }}
                     className="w-full h-16 bg-blue-500 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2"
                   >
                     Editar Montagem
                   </motion.button>
                 </div>
               )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AssemblyForm 
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialData={selectedAssembly}
      />
    </div>
  );
};
