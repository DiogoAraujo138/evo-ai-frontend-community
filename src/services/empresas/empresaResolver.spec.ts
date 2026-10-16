import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEmpresaAtual, setEmpresaAtual } from '@/lib/empresaAtual';
import { carregarEmpresas, limparCacheEmpresas, multiEmpresaDesligado } from './empresaResolver';

const listar = vi.hoisted(() => vi.fn());
vi.mock('./empresasService', () => ({ listarEmpresas: () => listar() }));

const emp = (id: string, ativa = true) => ({ id, nome: id, slug: id, ativa, papel: 'agent' });

describe('empresaResolver', () => {
  beforeEach(() => {
    limparCacheEmpresas();
    localStorage.clear();
  });
  afterEach(() => vi.clearAllMocks());

  it('compartilha uma única chamada entre quem pede ao mesmo tempo', async () => {
    listar.mockResolvedValue([emp('a'), emp('b')]);

    const [x, y] = await Promise.all([carregarEmpresas(), carregarEmpresas()]);

    expect(listar).toHaveBeenCalledTimes(1);
    expect(x).toBe(y);
  });

  it('fixa a empresa ativa: mantém a guardada, senão a primeira ativa', async () => {
    setEmpresaAtual('b');
    listar.mockResolvedValue([emp('a'), emp('b')]);
    await carregarEmpresas();
    expect(getEmpresaAtual()).toBe('b');

    limparCacheEmpresas();
    setEmpresaAtual('zzz');
    await carregarEmpresas();
    expect(getEmpresaAtual()).toBe('a');
  });

  it('guarda o resultado: a segunda chamada não vai ao servidor', async () => {
    listar.mockResolvedValue([emp('a')]);
    await carregarEmpresas();
    await carregarEmpresas();

    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('servidor sem multi-empresa (null): marca como desligado e esquece a escolha antiga', async () => {
    setEmpresaAtual('velha');
    listar.mockResolvedValue(null);

    expect(multiEmpresaDesligado()).toBe(false);
    await carregarEmpresas();

    expect(multiEmpresaDesligado()).toBe(true);
    expect(getEmpresaAtual()).toBeNull();
  });

  it('limpar o cache força nova consulta (novo login)', async () => {
    listar.mockResolvedValue([emp('a')]);
    await carregarEmpresas();
    limparCacheEmpresas();
    await carregarEmpresas();

    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('falha de rede não fica gravada: a próxima tentativa consulta de novo', async () => {
    listar.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce([emp('a')]);

    await expect(carregarEmpresas()).rejects.toThrow('rede');
    await expect(carregarEmpresas()).resolves.toHaveLength(1);
  });
});
