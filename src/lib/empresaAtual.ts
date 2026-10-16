// Empresa ativa do usuário (multi-empresa). Guardada no navegador e enviada em todas as chamadas
// de API no cabeçalho X-Evo-Tenant-Id. O servidor confere se o usuário pode usá-la; aqui é só a escolha.
export const EMPRESA_HEADER = 'X-Evo-Tenant-Id';
const CHAVE = 'chordata.empresa_atual';

export function getEmpresaAtual(): string | null {
  try {
    return localStorage.getItem(CHAVE) || null;
  } catch {
    return null;
  }
}

export function setEmpresaAtual(id: string): void {
  try {
    localStorage.setItem(CHAVE, id);
  } catch {
    // sem localStorage (janela privada): a escolha vale só até recarregar
  }
}

export function limparEmpresaAtual(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // noop
  }
}
