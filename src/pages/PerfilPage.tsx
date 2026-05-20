import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/src/context/AuthContext';
import { User, Settings, Shield, Bell, HelpCircle, LogOut, ChevronRight, Moon, Users, Settings2, ShieldCheck, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PerfilPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Minha Conta',
      items: [
        { icon: User, label: 'Dados Pessoais', color: 'bg-blue-50 text-blue-500', value: user?.email },
        { icon: ShieldCheck, label: 'Segurança & Biometria', color: 'bg-emerald-50 text-emerald-500' },
        { icon: Bell, label: 'Notificações Push', color: 'bg-amber-50 text-amber-500' },
      ]
    },
    {
      title: 'Preferências',
      items: [
        { icon: Moon, label: 'Modo Escuro', color: 'bg-indigo-50 text-indigo-500', beta: true },
        { icon: HelpCircle, label: 'Suporte & Ajuda', color: 'bg-slate-50 text-slate-500' },
      ]
    }
  ];

  const adminItems = [
    { icon: Users, label: 'Gerenciar Equipe', color: 'bg-purple-50 text-purple-500', path: '/equipe' },
    { icon: Settings2, label: 'Configurações do Sistema', color: 'bg-cyan-50 text-cyan-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Profile Header */}
      <div className="text-center pt-4">
        <div className="relative w-28 h-28 mx-auto mb-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full h-full rounded-[40px] bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-blue-500/20 ring-4 ring-white"
          >
            {user?.nome.charAt(0)}
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center text-blue-500 cursor-pointer"
          >
            <Settings size={20} />
          </motion.div>
        </div>
        
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{user?.nome}</h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg">
            <Shield size={12} className={user?.tipo === 'admin' ? 'text-blue-500' : user?.tipo === 'vendas' ? 'text-indigo-500' : 'text-slate-400'} />
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
              {user?.tipo === 'admin' ? 'Administrador Especialista' : user?.tipo === 'vendas' ? 'Equipe de Vendas' : 'Montador Oficial'}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Section */}
      {user?.tipo === 'admin' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administração</h3>
          </div>
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mx-1 ring-1 ring-slate-100">
            {adminItems.map((item, i) => (
              <button 
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className={ `w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-all active:bg-slate-100 ${i !== adminItems.length - 1 ? 'border-b border-slate-50' : ''}` }
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shadow-sm`}>
                    <item.icon size={22} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-slate-800 text-sm">{item.label}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Operacional</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Sections */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <div className="flex items-center gap-2 px-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{section.title}</h3>
          </div>
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mx-1 ring-1 ring-slate-100">
            {section.items.map((item, i) => (
              <button 
                key={item.label}
                className={`w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors ${i !== section.items.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl ${item.color} flex items-center justify-center`}>
                    <item.icon size={20} strokeWidth={2} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                       <span className="font-black text-slate-700 text-sm">{item.label}</span>
                       {item.beta && (
                         <span className="px-1.5 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-black uppercase rounded-md">BETA</span>
                       )}
                    </div>
                    {item.value && <span className="text-xs text-slate-400 font-medium">{item.value}</span>}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="px-1">
        <button 
          onClick={logout}
          className="w-full h-16 bg-white border border-slate-100 text-red-500 rounded-[32px] font-black tracking-tight flex items-center justify-center gap-3 active:bg-red-50 transition-all shadow-sm hover:shadow-md hover:border-red-100"
        >
          <LogOut size={22} strokeWidth={3} />
          Sair da Conta
        </button>
      </div>

      <div className="text-center pt-4">
        <div className="inline-flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Montagem+ Premium Edition</p>
          <p className="text-[9px] text-slate-300 font-bold">Software v1.2.0 • Build 2026</p>
        </div>
      </div>
    </div>
  );
};
