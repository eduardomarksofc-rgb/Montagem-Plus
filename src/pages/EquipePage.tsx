import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, Shield, MapPin, Phone, Settings, AlertCircle } from 'lucide-react';
import { subscribeToCollection } from '@/src/firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';

export const EquipePage: React.FC = () => {
  const [montadores, setMontadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToCollection('usuarios', (data) => {
      setMontadores(data.filter(u => u.tipo === 'montador'));
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Equipe</h1>
        {user?.tipo === 'admin' && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/equipe/gerenciar')}
            className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
          >
            <Settings size={24} />
          </motion.button>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-white rounded-[28px] animate-pulse" />)
        ) : montadores.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] text-center border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">Nenhum montador encontrado</p>
          </div>
        ) : (
          montadores.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-4 rounded-[28px] border border-slate-100 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black shadow-inner ${member.ativo ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                  {member.nome.charAt(0)}
                </div>
                <div>
                  <h4 className={`text-sm font-bold mb-0.5 ${member.ativo ? 'text-slate-900' : 'text-slate-400'}`}>{member.nome}</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Montador Profissional</p>
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${member.ativo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            </motion.div>
          ))
        )}
      </div>

      {user?.tipo === 'admin' && (
        <div className="p-6 bg-white rounded-[32px] border border-slate-100 space-y-4 shadow-sm">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Shield size={18} className="text-indigo-500" />
            Painel de Controle
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Você possui acesso administrativo. Pode adicionar, editar ou desativar membros da equipe clicando no ícone de engrenagem acima.
          </p>
        </div>
      )}
    </div>
  );
};
