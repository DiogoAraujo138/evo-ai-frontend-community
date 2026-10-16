import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { escolherEmpresa, getEmpresaAtual, setEmpresaAtual } from '@/lib/empresaAtual';
import type { Empresa } from '@/services/empresas/empresasService';
import { carregarEmpresas, limparCacheEmpresas } from '@/services/empresas/empresaResolver';

export { escolherEmpresa };

interface EmpresaContextValue {
  /** true quando o servidor tem multi-empresa ligado. Falso: nada muda no app. */
  habilitado: boolean;
  carregando: boolean;
  empresas: Empresa[];
  atual: Empresa | null;
  /** Troca a empresa e recarrega a página, para nenhum dado da anterior ficar em tela ou em cache. */
  trocar: (id: string) => void;
}

const EmpresaContext = createContext<EmpresaContextValue>({
  habilitado: false,
  carregando: false,
  empresas: [],
  atual: null,
  trocar: () => undefined,
});

// Não bloqueia a árvore: as chamadas de dados já esperam a empresa no interceptor (empresaInterceptor).
// Este provider só expõe a lista e a empresa atual para a interface (seletor, tela de empresas).
export const EmpresaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [habilitado, setHabilitado] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [atual, setAtual] = useState<Empresa | null>(null);

  useEffect(() => {
    limparCacheEmpresas();
    if (!isAuthenticated) {
      setHabilitado(false);
      setEmpresas([]);
      setAtual(null);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    carregarEmpresas()
      .then(lista => {
        if (cancelado) return;
        if (lista === null) {
          setHabilitado(false);
          return;
        }
        setEmpresas(lista);
        setAtual(escolherEmpresa(lista, getEmpresaAtual()));
        setHabilitado(true);
      })
      .catch(() => {
        if (!cancelado) setHabilitado(false);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [isAuthenticated]);

  const trocar = useCallback((id: string) => {
    setEmpresaAtual(id);
    window.location.reload();
  }, []);

  const valor = useMemo(
    () => ({ habilitado, carregando, empresas, atual, trocar }),
    [habilitado, carregando, empresas, atual, trocar],
  );

  return <EmpresaContext.Provider value={valor}>{children}</EmpresaContext.Provider>;
};

export const useEmpresa = () => useContext(EmpresaContext);
