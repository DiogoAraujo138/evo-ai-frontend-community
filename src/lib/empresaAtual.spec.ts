import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPRESA_HEADER, getEmpresaAtual, limparEmpresaAtual, setEmpresaAtual } from './empresaAtual';

describe('empresaAtual', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('guarda, devolve e limpa a empresa ativa', () => {
    expect(getEmpresaAtual()).toBeNull();
    setEmpresaAtual('emp-1');
    expect(getEmpresaAtual()).toBe('emp-1');
    limparEmpresaAtual();
    expect(getEmpresaAtual()).toBeNull();
  });

  it('usa o mesmo cabeçalho que o Flow e o CRM esperam', () => {
    expect(EMPRESA_HEADER).toBe('X-Evo-Tenant-Id');
  });

  it('não quebra quando o navegador bloqueia o armazenamento', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(getEmpresaAtual()).toBeNull();
    expect(() => setEmpresaAtual('emp-1')).not.toThrow();
  });
});
