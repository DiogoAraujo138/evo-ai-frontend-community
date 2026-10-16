import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmpresaSwitcher } from './EmpresaSwitcher';

const estado = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock('@/contexts/EmpresaContext', () => ({ useEmpresa: () => estado.valor }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

const emp = (id: string, nome: string) => ({ id, nome, slug: nome, ativa: true, papel: 'agent' });

describe('EmpresaSwitcher', () => {
  it('não aparece com multi-empresa desligado', () => {
    estado.valor = { habilitado: false, empresas: [], atual: null, trocar: vi.fn() };
    const { container } = render(<EmpresaSwitcher />);

    expect(container.firstChild).toBeNull();
  });

  it('não aparece com uma empresa só (nada para trocar)', () => {
    estado.valor = { habilitado: true, empresas: [emp('a', 'Alfa')], atual: emp('a', 'Alfa'), trocar: vi.fn() };
    const { container } = render(<EmpresaSwitcher />);

    expect(container.firstChild).toBeNull();
  });

  it('aparece com mais de uma empresa e mostra a atual', () => {
    estado.valor = {
      habilitado: true,
      empresas: [emp('a', 'Alfa'), emp('b', 'Beta')],
      atual: emp('a', 'Alfa'),
      trocar: vi.fn(),
    };
    render(<EmpresaSwitcher />);

    expect(screen.getByTestId('empresa-switcher')).toBeTruthy();
    expect(screen.getByText('Alfa')).toBeTruthy();
  });
});
