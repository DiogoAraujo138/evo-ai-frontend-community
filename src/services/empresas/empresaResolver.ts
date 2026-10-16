import { escolherEmpresa, getEmpresaAtual, limparEmpresaAtual, setEmpresaAtual } from '@/lib/empresaAtual';
import { listarEmpresas, type Empresa } from './empresasService';

// Carrega as empresas do usuário UMA vez (compartilhando a chamada em andamento) e já fixa a empresa ativa.
// Quem chega primeiro, o interceptor de uma chamada de dados ou o EmpresaProvider, dispara; os outros esperam.
// Resultado `null` = servidor sem multi-empresa (a rota não existe).
let emAndamento: Promise<Empresa[] | null> | null = null;
let resultado: { lista: Empresa[] | null } | null = null;

function aplicar(lista: Empresa[] | null): void {
  if (lista === null) {
    limparEmpresaAtual();
    return;
  }
  const escolhida = escolherEmpresa(lista, getEmpresaAtual());
  if (escolhida) setEmpresaAtual(escolhida.id);
  else limparEmpresaAtual();
}

export function carregarEmpresas(): Promise<Empresa[] | null> {
  if (resultado) return Promise.resolve(resultado.lista);
  if (!emAndamento) {
    emAndamento = listarEmpresas()
      .then(lista => {
        aplicar(lista);
        resultado = { lista };
        return lista;
      })
      .finally(() => {
        emAndamento = null;
      });
  }
  return emAndamento;
}

/** Esquece o que foi carregado (login, logout): a próxima chamada busca de novo. */
export function limparCacheEmpresas(): void {
  resultado = null;
  emAndamento = null;
}

/** true quando já sabemos que o servidor não tem multi-empresa (nada a esperar nem a enviar). */
export function multiEmpresaDesligado(): boolean {
  return resultado !== null && resultado.lista === null;
}
