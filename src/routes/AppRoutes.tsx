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
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-ios-bg)]">
        <div className="w-12 h-12 border-4 border-[var(--color-ios-blue)] border-t-transparent rounded-full animate-spin" />
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
