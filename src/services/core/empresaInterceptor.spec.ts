import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyEmpresaInterceptor } from './empresaInterceptor';
import { EMPRESA_HEADER, getEmpresaAtual, setEmpresaAtual } from '@/lib/empresaAtual';

const auth = vi.hoisted(() => ({ logado: true }));
const resolver = vi.hoisted(() => ({ carregar: vi.fn(), desligado: vi.fn() }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({ getAuthHeader: () => (auth.logado ? { Authorization: 'Bearer x' } : null) }) },
}));
vi.mock('@/services/empresas/empresaResolver', () => ({
  carregarEmpresas: () => resolver.carregar(),
  multiEmpresaDesligado: () => resolver.desligado(),
}));

// Captura a requisição sem rede: o adapter devolve os cabeçalhos da própria config.
function instancia() {
  const inst = axios.create({
    adapter: async config => ({ data: config.headers, status: 200, statusText: 'OK', headers: {}, config }),
  });
  applyEmpresaInterceptor(inst);
  return inst;
}

const cabecalho = (headers: unknown): unknown => {
  const h = headers as { get?: (n: string) => unknown } & Record<string, unknown>;
  return h.get ? h.get(EMPRESA_HEADER) : h[EMPRESA_HEADER];
};

describe('applyEmpresaInterceptor', () => {
  beforeEach(() => {
    auth.logado = true;
    resolver.desligado.mockReturnValue(false);
    resolver.carregar.mockImplementation(async () => {
      setEmpresaAtual('emp-escolhida');
      return [];
    });
  });
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('envia a empresa ativa sem esperar nada quando já há uma', async () => {
    setEmpresaAtual('emp-42');
    const { data } = await instancia().get('/contacts');

    expect(cabecalho(data)).toBe('emp-42');
    expect(resolver.carregar).not.toHaveBeenCalled();
  });

  it('sem empresa escolhida e logado, ESPERA a escolha e envia a empresa (nada de 400 no primeiro load)', async () => {
    const { data } = await instancia().get('/contacts');

    expect(resolver.carregar).toHaveBeenCalledTimes(1);
    expect(cabecalho(data)).toBe('emp-escolhida');
  });

  it('não espera nada quando o usuário não está logado', async () => {
    auth.logado = false;
    const { data } = await instancia().get('/contacts');

    expect(resolver.carregar).not.toHaveBeenCalled();
    expect(cabecalho(data) ?? undefined).toBeUndefined();
  });

  it('servidor sem multi-empresa: não espera e não manda cabeçalho', async () => {
    resolver.desligado.mockReturnValue(true);
    const { data } = await instancia().get('/contacts');

    expect(resolver.carregar).not.toHaveBeenCalled();
    expect(cabecalho(data) ?? undefined).toBeUndefined();
  });

  it('a própria listagem de empresas não espera (evita deadlock)', async () => {
    await instancia().get('/empresas');
    await instancia().get('/empresas/abc/usuarios');

    expect(resolver.carregar).not.toHaveBeenCalled();
  });

  it('falha ao listar não derruba a chamada: segue sem cabeçalho', async () => {
    resolver.carregar.mockRejectedValue(new Error('rede'));
    const { data } = await instancia().get('/contacts');

    expect(cabecalho(data) ?? undefined).toBeUndefined();
    expect(getEmpresaAtual()).toBeNull();
  });

  it('respeita uma empresa informada explicitamente na chamada', async () => {
    setEmpresaAtual('emp-42');
    const { data } = await instancia().get('/contacts', { headers: { [EMPRESA_HEADER]: 'emp-outra' } });

    expect(cabecalho(data)).toBe('emp-outra');
  });
});
