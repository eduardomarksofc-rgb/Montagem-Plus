import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateUser } from '../firebase/firestore';

interface User {
  id: string;
  nome: string;
  usuario: string;
  tipo: 'admin' | 'montador';
  cidade: string;
  ativo: boolean;
  montadorId?: string; // Optional link to the montadores entity
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (usuario: string, senha: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('montagem_plus_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (usuario: string, senha: string): Promise<boolean> => {
    try {
      // First check hardcoded master for dev ease
      if (usuario === 'mestre' && senha === '123456') {
        const masterUser: User = {
          id: 'admin_master',
          nome: 'Administrador Master',
          usuario: 'mestre',
          tipo: 'admin',
          cidade: 'Geral',
          ativo: true
        };
        setUser(masterUser);
        localStorage.setItem('montagem_plus_user', JSON.stringify(masterUser));
        return true;
      }

      // Query Firestore for user
      const userData = await validateUser(usuario, senha);
      
      if (userData) {
        // validateUser should return the doc data. We need the ID too.
        // Assuming userData has the data and we might need to adjust firestore.ts slightly to return ID
        const loggedUser = userData as User;
        setUser(loggedUser);
        localStorage.setItem('montagem_plus_user', JSON.stringify(loggedUser));
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('montagem_plus_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
