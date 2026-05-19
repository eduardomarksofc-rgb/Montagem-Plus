import React, { useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, History, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Reset scroll on navigation
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  
  const allTabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' },
    { id: 'pendencias', label: 'Pendências', icon: AlertCircle, path: '/pendencias', role: 'admin' },
    { id: 'historico', label: 'Histórico', icon: History, path: '/historico' },
    { id: 'perfil', label: 'Perfil', icon: User, path: '/perfil' },
  ];

  const tabs = allTabs.filter(tab => !tab.role || tab.role === user?.tipo);

  return (
    <div className="min-h-screen pb-24 bg-[#FAFAFA] relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-600">
      <main className="max-w-md mx-auto px-6 pt-8 md:px-8">
        <Outlet />
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-[100] px-6 pb-8 pointer-events-none max-w-md mx-auto">
        <nav className="h-18 bg-white/95 backdrop-blur-md rounded-[32px] pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex justify-around items-center px-6 border border-white/50 ring-1 ring-black/5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.path}
              className="relative py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all group"
            >
              {({ isActive }) => (
                <div
                  className={cn(
                    "flex flex-col items-center gap-1.2 transition-all duration-200",
                    isActive ? "text-blue-600 scale-105" : "text-slate-400"
                  )}
                >
                  <div className="relative">
                    <tab.icon 
                      size={22} 
                      strokeWidth={isActive ? 2.5 : 2}
                      className={cn(
                        "transition-all duration-200",
                        isActive ? "drop-shadow-sm" : ""
                      )} 
                    />
                    {isActive && (
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-600 rounded-full border border-white shadow-sm" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-[0.05em] transition-all duration-200",
                    isActive ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                  )}>
                    {tab.label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};
