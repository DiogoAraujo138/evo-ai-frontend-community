import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export interface Empresa {
  id: string;
  nome: string;
  slug: string;
  ativa: boolean;
  papel: string;
}

export interface VinculoEmpresa {
  user_id: string;
  papel: string;
}

// `null` quando o servidor não tem multi-empresa ligado (a rota não existe): o app segue como antes.
export async function listarEmpresas(): Promise<Empresa[] | null> {
  try {
    const response = await api.get('/empresas');
    return extractData<Empresa[]>(response) ?? [];
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

export async function criarEmpresa(nome: string, slug?: string): Promise<Empresa> {
  const response = await api.post('/empresas', { nome, slug: slug || undefined });
  return extractData<Empresa>(response);
}

export async function atualizarEmpresa(id: string, dados: Partial<Pick<Empresa, 'nome' | 'ativa'>>): Promise<Empresa> {
  const response = await api.patch(`/empresas/${id}`, dados);
  return extractData<Empresa>(response);
}

export async function listarVinculos(empresaId: string): Promise<VinculoEmpresa[]> {
  const response = await api.get(`/empresas/${empresaId}/usuarios`);
  return extractData<VinculoEmpresa[]>(response) ?? [];
}

export async function vincularUsuario(empresaId: string, email: string, papel: string): Promise<VinculoEmpresa> {
  const response = await api.post(`/empresas/${empresaId}/usuarios`, { email, papel });
  return extractData<VinculoEmpresa>(response);
}

export async function desvincularUsuario(empresaId: string, userId: string): Promise<void> {
  await api.delete(`/empresas/${empresaId}/usuarios/${userId}`);
}
