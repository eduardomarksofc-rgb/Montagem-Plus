import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { AppLayout } from '@/src/layouts/AppLayout';
import { LoginPage } from '@/src/pages/LoginPage';
import { Dashboard } from '@/src/pages/Dashboard';
import { AgendaPage } from '@/src/pages/AgendaPage';
import { EquipePage } from '@/src/pages/EquipePage';
import { PerfilPage } from '@/src/pages/PerfilPage';
import { ManageMontadoresPage } from '@/src/pages/ManageMontadoresPage';
import { PendenciasPage } from '@/src/pages/PendenciasPage';
import { HistoricoPage } from '@/src/pages/HistoricoPage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7]">
        <div className="relative flex flex-col items-center">
          {/* Pulsing Outer Glow */}
          <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 animate-pulse">
            M+
          </div>
          
          {/* Subtle spinning indicator */}
          <div className="mt-6 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em]">
              Sincronizando...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="equipe" element={<EquipePage />} />
        <Route path="equipe/gerenciar" element={<ManageMontadoresPage />} />
        <Route path="pendencias" element={<PendenciasPage />} />
        <Route path="historico" element={<HistoricoPage />} />
        <Route path="perfil" element={<PerfilPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
