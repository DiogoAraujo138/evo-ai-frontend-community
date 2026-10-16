import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmpresaProvider, escolherEmpresa, useEmpresa } from './EmpresaContext';
import { getEmpresaAtual, setEmpresaAtual } from '@/lib/empresaAtual';

const listar = vi.fn();
vi.mock('@/services/empresas/empresasService', () => ({ listarEmpresas: () => listar() }));
vi.mock('./AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const emp = (id: string, nome: string, ativa = true) => ({ id, nome, slug: nome.toLowerCase(), ativa, papel: 'agent' });

function Sonda() {
  const { habilitado, atual, empresas } = useEmpresa();
  return (
    <div>
      <span data-testid="hab">{String(habilitado)}</span>
      <span data-testid="atual">{atual?.nome ?? '-'}</span>
      <span data-testid="qtd">{empresas.length}</span>
    </div>
  );
}

const montar = () =>
  render(
    <EmpresaProvider>
      <Sonda />
    </EmpresaProvider>,
  );

describe('escolherEmpresa', () => {
  it('mantém a guardada se ainda for do usuário', () => {
    expect(escolherEmpresa([emp('a', 'A'), emp('b', 'B')], 'b')?.id).toBe('b');
  });

  it('cai na primeira ativa quando a guardada não vale mais', () => {
    expect(escolherEmpresa([emp('a', 'A'), emp('b', 'B')], 'zzz')?.id).toBe('a');
    expect(escolherEmpresa([emp('a', 'A', false), emp('b', 'B')], 'a')?.id).toBe('b');
  });

  it('devolve nulo sem empresa ativa', () => {
    expect(escolherEmpresa([], null)).toBeNull();
    expect(escolherEmpresa([emp('a', 'A', false)], null)).toBeNull();
  });
});

describe('EmpresaProvider', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.clearAllMocks());

  it('com multi-empresa ligado, escolhe e guarda a empresa', async () => {
    listar.mockResolvedValue([emp('a', 'Alfa'), emp('b', 'Beta')]);
    montar();

    await waitFor(() => expect(screen.getByTestId('hab').textContent).toBe('true'));
    expect(screen.getByTestId('atual').textContent).toBe('Alfa');
    expect(getEmpresaAtual()).toBe('a');
  });

  it('respeita a empresa guardada', async () => {
    setEmpresaAtual('b');
    listar.mockResolvedValue([emp('a', 'Alfa'), emp('b', 'Beta')]);
    montar();

    await waitFor(() => expect(screen.getByTestId('atual').textContent).toBe('Beta'));
  });

  it('servidor sem multi-empresa (rota 404): segue desligado e limpa a escolha antiga', async () => {
    setEmpresaAtual('velha');
    listar.mockResolvedValue(null);
    montar();

    await waitFor(() => expect(screen.getByTestId('hab').textContent).toBe('false'));
    expect(getEmpresaAtual()).toBeNull();
  });

  it('falha ao listar não derruba o app', async () => {
    listar.mockRejectedValue(new Error('rede'));
    montar();

    await waitFor(() => expect(screen.getByTestId('hab').textContent).toBe('false'));
    expect(screen.getByTestId('qtd').textContent).toBe('0');
  });
});
