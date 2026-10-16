import type { AxiosInstance } from 'axios';
import { EMPRESA_HEADER, getEmpresaAtual } from '@/lib/empresaAtual';

// Junta a empresa ativa a toda chamada dos serviços de negócio (CRM, Flow, Core, Processor).
// Sem empresa escolhida não manda nada: o servidor em modo de uma empresa só ignora o cabeçalho.
export function applyEmpresaInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use(config => {
    const empresa = getEmpresaAtual();
    if (empresa && !config.headers[EMPRESA_HEADER]) {
      config.headers[EMPRESA_HEADER] = empresa;
    }
    return config;
  });
}
