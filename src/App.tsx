import React, { useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { SplashScreen } from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <AnimatePresence>
            {showSplash && (
              <SplashScreen onComplete={() => setShowSplash(false)} />
            )}
          </AnimatePresence>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}


