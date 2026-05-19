import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  X, 
  Save, 
  Loader2, 
  User, 
  Key, 
  Phone,
  UserCircle 
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '@/src/firebase/firestore';
import { serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/src/firebase/config';

export const ManageMontadoresPage: React.FC = () => {
  const [montadores, setMontadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMontador, setEditingMontador] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    usuario: '',
    senha: '',
    telefone: '',
  });

  useEffect(() => {
    // Subscribe to users of type 'montador'
    const unsub = subscribeToCollection('usuarios', (data) => {
      setMontadores(data.filter(u => u.tipo === 'montador').sort((a, b) => a.nome.localeCompare(b.nome)));
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  const validateUsername = async (username: string, excludeId?: string) => {
    const q = query(collection(db, 'usuarios'), where('usuario', '==', username));
    const snap = await getDocs(q);
    if (snap.empty) return true;
    if (excludeId && snap.docs[0].id === excludeId) return true;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const isUnique = await validateUsername(formData.usuario, editingMontador?.id);
      if (!isUnique) {
        setError('Este nome de usuário já está em uso.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        tipo: 'montador',
        ativo: editingMontador ? editingMontador.ativo : true,
        atualizadoEm: serverTimestamp(),
      };

      if (editingMontador) {
        await updateDocument('usuarios', editingMontador.id, payload);
      } else {
        await createDocument('usuarios', {
          ...payload,
          criadoEm: serverTimestamp()
        });
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      setError('Erro ao salvar montador. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', usuario: '', senha: '', telefone: '' });
    setEditingMontador(null);
    setError(null);
  };

  const handleEdit = (m: any) => {
    setEditingMontador(m);
    setFormData({
      nome: m.nome,
      usuario: m.usuario,
      senha: m.senha,
      telefone: m.telefone || '',
    });
    setIsModalOpen(true);
  };

  const toggleStatus = async (montador: any) => {
    await updateDocument('usuarios', montador.id, { ativo: !montador.ativo });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este acesso? O montador não poderá mais entrar no sistema.')) {
      await deleteDocument('usuarios', id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Equipe</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de Acessos</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20"
        >
          <Plus size={24} />
        </motion.button>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse" />)
        ) : montadores.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] text-center border border-dashed border-slate-200">
             <UserCircle className="mx-auto text-slate-200 mb-3" size={48} />
             <p className="text-slate-400 font-bold">Nenhum montador cadastrado</p>
          </div>
        ) : (
          montadores.map((m) => (
            <motion.div
              layout
              key={m.id}
              className="bg-white p-4 rounded-[28px] border border-slate-100 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-inner ${m.ativo ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                  {m.nome.charAt(0)}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${m.ativo ? 'text-slate-900' : 'text-slate-400'}`}>{m.nome}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${m.ativo ? 'text-emerald-500 text-xs' : 'text-slate-300'}`}>
                      @{m.usuario}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{m.ativo ? 'Ativo' : 'Bloqueado'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => toggleStatus(m)}
                  className={`p-2 rounded-xl transition-colors ${m.ativo ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                >
                  {m.ativo ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                </button>
                <button 
                  onClick={() => handleEdit(m)}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-[40px] p-8 z-[201] shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {editingMontador ? 'Editar Dados' : 'Novo Montador'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Acesso Individual</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><X size={20}/></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={18} />
                    <input
                      required
                      placeholder="Nome do montador"
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário / Login</label>
                  <div className="relative group">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={18} />
                    <input
                      required
                      placeholder="Ex: laercio.silva"
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                      value={formData.usuario}
                      onChange={e => setFormData({ ...formData, usuario: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                  <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={18} />
                    <input
                      required
                      type="text"
                      placeholder="Mínimo 4 dígitos"
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                      value={formData.senha}
                      onChange={e => setFormData({ ...formData, senha: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone (Fixo/WhatsApp)</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={18} />
                    <input
                      placeholder="(00) 00000-0000"
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                      value={formData.telefone}
                      onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                    />
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-500 text-[10px] font-black uppercase tracking-widest text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={isSubmitting}
                  className="w-full h-14 bg-blue-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  Confirmar Cadastro
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
