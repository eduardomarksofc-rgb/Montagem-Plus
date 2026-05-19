import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './config';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Custom Authentication Logic as requested (Validar login pelo firestore)
export const validateUser = async (usuario: string, senha: string) => {
  const path = 'usuarios';
  try {
    const q = query(
      collection(db, path), 
      where('usuario', '==', usuario),
      where('senha', '==', senha),
      where('ativo', '==', true)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

import { serverTimestamp } from 'firebase/firestore';

export const logActivity = async (montagemId: string, usuarioId: string, usuarioNome: string, tipo: string, descricao: string) => {
  await createDocument('historicoAlteracoes', {
    montagemId,
    usuarioId,
    usuarioNome,
    tipoAlteracao: tipo,
    descricao,
    dataAlteracao: serverTimestamp()
  });
};

export const sendNotification = async (usuarioId: string, titulo: string, mensagem: string, tipo: 'info' | 'alerta' | 'urgente' = 'info') => {
  await createDocument('notificacoes', {
    usuarioId,
    titulo,
    mensagem,
    tipo,
    lida: false,
    criadoEm: serverTimestamp()
  });
};

export const markNotificationAsRead = async (id: string) => {
  await updateDocument('notificacoes', id, { lida: true });
};

// Generic CRUD helpers
export const getCollection = async (path: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, path));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const createDocument = async (path: string, data: any, id?: string) => {
  try {
    if (id) {
      await setDoc(doc(db, path, id), data);
      return id;
    } else {
      const docRef = await addDoc(collection(db, path), data);
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateDocument = async (path: string, id: string, data: any) => {
  try {
    await updateDoc(doc(db, path, id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
};

export const deleteDocument = async (path: string, id: string) => {
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
};

export const subscribeToCollection = (path: string, callback: (data: any[]) => void, filterField?: string, filterValue?: any) => {
  try {
    let q = query(collection(db, path));
    if (filterField && filterValue !== undefined) {
      q = query(collection(db, path), where(filterField, '==', filterValue));
    }
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};
