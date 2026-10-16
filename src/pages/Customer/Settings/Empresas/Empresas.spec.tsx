import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Empresas from './Empresas';

const svc = vi.hoisted(() => ({
  listarEmpresas: vi.fn(),
  criarEmpresa: vi.fn(),
  atualizarEmpresa: vi.fn(),
  listarVinculos: vi.fn(),
  vincularUsuario: vi.fn(),
  desvincularUsuario: vi.fn(),
}));
const ctx = vi.hoisted(() => ({ habilitado: true }));

vi.mock('@/services/empresas/empresasService', () => svc);
vi.mock('@/contexts/EmpresaContext', () => ({ useEmpresa: () => ({ habilitado: ctx.habilitado }) }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const emp = (id: string, nome: string, ativa = true) => ({ id, nome, slug: nome.toLowerCase(), ativa, papel: 'super_admin' });

describe('Gestão de empresas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctx.habilitado = true;
    svc.listarEmpresas.mockResolvedValue([emp('1', 'Alfa'), emp('2', 'Beta', false)]);
    svc.listarVinculos.mockResolvedValue([{ user_id: 'u1', papel: 'agent', nome: 'Ana', email: 'ana@exemplo.invalid' }]);
  });

  it('com multi-empresa desligado só explica', () => {
    ctx.habilitado = false;
    render(<Empresas />);

    expect(screen.getByTestId('empresas-desligado')).toBeTruthy();
    expect(svc.listarEmpresas).not.toHaveBeenCalled();
  });

  it('lista as empresas e marca a inativa', async () => {
    render(<Empresas />);

    expect(await screen.findByTestId('empresa-alfa')).toBeTruthy();
    expect(screen.getByTestId('empresa-beta').textContent).toContain('companies.inactive');
  });

  it('cria uma empresa pelo nome e recarrega a lista', async () => {
    svc.criarEmpresa.mockResolvedValue(emp('3', 'Gama'));
    render(<Empresas />);
    await screen.findByTestId('empresa-alfa');

    fireEvent.change(screen.getByLabelText('companies.namePlaceholder'), { target: { value: '  Gama  ' } });
    fireEvent.click(screen.getByText('companies.create'));

    await waitFor(() => expect(svc.criarEmpresa).toHaveBeenCalledWith('Gama'));
    await waitFor(() => expect(svc.listarEmpresas).toHaveBeenCalledTimes(2));
  });

  it('ativa ou desativa a empresa', async () => {
    svc.atualizarEmpresa.mockResolvedValue(emp('1', 'Alfa', false));
    render(<Empresas />);
    await screen.findByTestId('empresa-alfa');

    fireEvent.click(screen.getAllByText('companies.deactivate')[0]);

    await waitFor(() => expect(svc.atualizarEmpresa).toHaveBeenCalledWith('1', { ativa: false }));
  });

  it('abre os usuários, vincula por e-mail e remove', async () => {
    svc.vincularUsuario.mockResolvedValue({ user_id: 'u2', papel: 'agent' });
    svc.desvincularUsuario.mockResolvedValue(undefined);
    render(<Empresas />);
    await screen.findByTestId('empresa-alfa');

    fireEvent.click(screen.getAllByText('companies.users')[0]);
    expect(await screen.findByText('Ana')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('companies.emailPlaceholder'), { target: { value: 'novo@exemplo.invalid' } });
    fireEvent.click(screen.getByText('companies.add'));
    await waitFor(() => expect(svc.vincularUsuario).toHaveBeenCalledWith('1', 'novo@exemplo.invalid', 'agent'));

    fireEvent.click(screen.getByText('companies.remove'));
    await waitFor(() => expect(svc.desvincularUsuario).toHaveBeenCalledWith('1', 'u1'));
  });
});
