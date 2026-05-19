import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Clock, MapPin, User, ChevronRight, Package, AlertCircle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  assemblies: any[];
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, assemblies }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const term = search.toLowerCase();
    const filtered = assemblies.filter(a => 
      a.cliente?.toLowerCase().includes(term) ||
      a.produto?.toLowerCase().includes(term) ||
      a.endereco?.toLowerCase().includes(term) ||
      a.responsavelNome?.toLowerCase().includes(term) ||
      a.status?.toLowerCase().includes(term)
    ).slice(0, 10);

    setResults(filtered);
  }, [search, assemblies]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col pt-4 px-4 sm:pt-20 items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/20"
          >
            {/* Search Header */}
            <div className="p-6 border-b border-slate-100 flex items-center gap-4">
              <Search className="text-blue-500 shrink-0" size={24} strokeWidth={2.5} />
              <input
                ref={inputRef}
                placeholder="Buscar cliente, produto ou montagem..."
                className="flex-1 bg-transparent text-lg font-bold text-slate-800 outline-none placeholder:text-slate-400"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                aria-label="Encerrar busca"
              >
                <X size={18} />
              </button>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {!search ? (
                <div className="py-24 text-center flex flex-col items-center">
                   <motion.div 
                     animate={{ 
                       scale: [1, 1.05, 1],
                       opacity: [0.5, 0.8, 0.5]
                     }}
                     transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                     className="w-24 h-24 rounded-[40px] bg-blue-500/5 flex items-center justify-center text-blue-500/20 mb-8 border border-blue-500/10 shadow-inner"
                   >
                      <Search size={48} strokeWidth={1.5} />
                   </motion.div>
                   <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Busca Inteligente</h3>
                   <p className="text-sm font-medium text-slate-400 max-w-[220px] mx-auto leading-relaxed">Encontre clientes, produtos ou montagens rapidamente</p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-24 text-center flex flex-col items-center">
                   <div className="w-24 h-24 rounded-[40px] bg-red-50/50 flex items-center justify-center text-red-300 mb-6 border border-red-100">
                      <AlertCircle size={40} strokeWidth={1.5} />
                   </div>
                   <p className="text-slate-400 font-bold">Nenhum resultado encontrado</p>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Tente termos mais genéricos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-4 mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultados Sugeridos</p>
                  </div>
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        navigate(`/agenda?q=${encodeURIComponent(result.cliente)}`);
                        onClose();
                      }}
                      className="w-full p-5 rounded-[32px] hover:bg-slate-50/80 flex items-center gap-4 transition-all group active:scale-[0.98] border border-transparent hover:border-slate-100 hover:shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white flex flex-col items-center justify-center text-slate-400 shadow-sm border border-slate-100 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-all">
                         <div className="text-[8px] font-black uppercase tracking-tighter leading-none mb-0.5">{result.horario?.split(':')[0]}h</div>
                         <div className="text-[10px] font-black leading-none">{result.horario?.split(':')[1]}</div>
                      </div>
                      
                      <div className="flex-1 text-left">
                        <h4 className="font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{result.cliente}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[120px] sm:max-w-none">{result.produto}</span>
                           <div className="w-1 h-1 rounded-full bg-slate-200" />
                           <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[120px] sm:max-w-none">{result.endereco}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                         <StatusBadge status={result.status} />
                         <ChevronRight size={14} className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))}
                  
                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        navigate(`/agenda?q=${encodeURIComponent(search)}`);
                        onClose();
                      }}
                      className="w-full h-14 flex items-center justify-center gap-3 text-blue-500 font-black text-[10px] uppercase tracking-widest bg-blue-50/30 rounded-[28px] hover:bg-blue-50 transition-all group border border-blue-500/5 shadow-sm"
                    >
                      Pesquisa Completa na Agenda
                      <ChevronRight size={14} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Top Indicator for Mobile Drag Handle */}
            <div className="h-1.5 w-12 bg-slate-100 rounded-full mx-auto mb-4 mt-2 sm:hidden" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
