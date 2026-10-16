import type { AxiosInstance } from 'axios';
import { EMPRESA_HEADER, getEmpresaAtual } from '@/lib/empresaAtual';

// A própria listagem de empresas não pode esperar pela empresa (deadlock) nem levar cabeçalho de escolha.
const ROTA_DE_EMPRESAS = /^\/?empresas(\/|\?|$)/;

async function usuarioAutenticado(): Promise<boolean> {
  // import tardio: evita ciclo api -> interceptor -> authStore -> api na carga dos módulos
  const { useAuthStore } = await import('@/store/authStore');
  return !!useAuthStore.getState().getAuthHeader();
}

// Junta a empresa ativa a toda chamada dos serviços de negócio (CRM, Flow, Core, Processor).
// Se ainda não há empresa escolhida e o usuário está logado, a chamada ESPERA a escolha (uma única
// listagem compartilhada) em vez de sair sem cabeçalho e levar 400. Servidor de uma empresa só: nada muda.
export function applyEmpresaInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use(async config => {
    if (ROTA_DE_EMPRESAS.test(config.url ?? '')) return config;

    let empresa = getEmpresaAtual();
    if (!empresa) {
      const { carregarEmpresas, multiEmpresaDesligado } = await import('@/services/empresas/empresaResolver');
      if (!multiEmpresaDesligado() && (await usuarioAutenticado())) {
        try {
          await carregarEmpresas();
        } catch {
          // sem a lista a chamada segue sem cabeçalho; o servidor decide
        }
        empresa = getEmpresaAtual();
      }
    }
    if (empresa && !config.headers[EMPRESA_HEADER]) {
      config.headers[EMPRESA_HEADER] = empresa;
    }
    return config;
  });
}
