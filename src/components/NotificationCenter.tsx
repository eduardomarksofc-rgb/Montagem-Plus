import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Trash2, Clock, Inbox, AlertCircle, Info, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToCollection, markNotificationAsRead, deleteDocument } from '../firebase/firestore';
import { cn } from '@/src/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToCollection('notificacoes', (data) => {
      setNotifications(data.filter(n => n.usuarioId === user.id).sort((a, b) => b.criadoEm?.seconds - a.criadoEm?.seconds));
    }, 'usuarioId', user.id);
    return () => unsub?.();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.lida).length;

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'urgente': return <Flame size={16} className="text-red-500" />;
      case 'alerta': return <AlertCircle size={16} className="text-amber-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.lida);
    for (const n of unread) {
      await markNotificationAsRead(n.id);
    }
  };

  const clearAll = async () => {
    if (confirm('Deseja limpar todas as notificações?')) {
      for (const n of notifications) {
        await deleteDocument('notificacoes', n.id);
      }
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 rounded-[18px] bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 hover:text-blue-500 hover:bg-blue-50 transition-all active:scale-95 relative"
      >
        <Bell size={18} strokeWidth={3} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 sm:w-96 bg-white/90 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-slate-200 border border-white z-[101] overflow-hidden flex flex-col max-h-[500px]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight">Notificações</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unreadCount} não lidas</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleMarkAllRead} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors" title="Marcar todas como lidas">
                    <Check size={16} />
                  </button>
                  <button onClick={clearAll} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors" title="Limpar todas">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Inbox size={40} className="mx-auto text-slate-100 mb-3" />
                    <p className="text-sm font-bold text-slate-300">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className={cn(
                        "p-4 rounded-2xl transition-all cursor-pointer flex gap-3 group relative overflow-hidden",
                        n.lida ? "opacity-60" : "bg-blue-50/30 hover:bg-blue-50"
                      )}
                    >
                      {!n.lida && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        n.tipo === 'urgente' ? 'bg-red-50' : n.tipo === 'alerta' ? 'bg-amber-50' : 'bg-blue-50'
                      )}>
                        {getIcon(n.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className="text-xs font-black text-slate-900 truncate pr-4">{n.titulo}</h4>
                          <span className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Clock size={8} /> {n.criadoEm?.seconds ? formatDistanceToNow(new Date(n.criadoEm.seconds * 1000), { addSuffix: true, locale: ptBR }) : 'Agora'}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 line-clamp-2 leading-relaxed">
                          {n.mensagem}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors"
                >
                  Fechar Central
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
