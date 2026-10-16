import axios from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { applyEmpresaInterceptor } from './empresaInterceptor';
import { EMPRESA_HEADER, setEmpresaAtual } from '@/lib/empresaAtual';

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
  afterEach(() => localStorage.clear());

  it('envia a empresa ativa em toda chamada', async () => {
    setEmpresaAtual('emp-42');
    const { data } = await instancia().get('/contacts');

    expect(cabecalho(data)).toBe('emp-42');
  });

  it('não manda cabeçalho quando não há empresa escolhida (servidor de uma empresa só)', async () => {
    const { data } = await instancia().get('/contacts');

    expect(cabecalho(data) ?? undefined).toBeUndefined();
  });

  it('respeita uma empresa informada explicitamente na chamada', async () => {
    setEmpresaAtual('emp-42');
    const { data } = await instancia().get('/contacts', { headers: { [EMPRESA_HEADER]: 'emp-outra' } });

    expect(cabecalho(data)).toBe('emp-outra');
  });
});
