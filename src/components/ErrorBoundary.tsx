import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught exception caught by ErrorBoundary:", error, errorInfo);
  }

  private handleRecover = () => {
    localStorage.removeItem('montagem_plus_user');
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-sm bg-white rounded-[40px] p-8 text-center border border-slate-100 shadow-[0_24px_50px_rgba(0,0,0,0.06)] space-y-6">
            
            {/* Elegant warning avatar circle */}
            <div className="w-16 h-16 rounded-[22px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-600">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                Sessão Suspensa
              </h2>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                Recuperação de Interface
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Ocorreu uma inconsistência ao processar os componentes locais. Para restabelecer o aplicativo em segurança, clique para recomeçar abaixo.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/80 text-left overflow-x-auto max-h-24">
                <code className="text-[9px] font-mono text-slate-400 leading-none">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <button
              onClick={this.handleRecover}
              className="w-full h-13 rounded-2xl bg-slate-900 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
              Recuperar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
