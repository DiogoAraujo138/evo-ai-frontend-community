import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import { getEmpresaAtual, limparEmpresaAtual, setEmpresaAtual } from '@/lib/empresaAtual';
import { listarEmpresas, type Empresa } from '@/services/empresas/empresasService';

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

// Decide a empresa ativa: a guardada, se ainda for do usuário; senão a primeira (ou a única).
export function escolherEmpresa(empresas: Empresa[], guardada: string | null): Empresa | null {
  const ativas = empresas.filter(e => e.ativa);
  return ativas.find(e => e.id === guardada) ?? ativas[0] ?? null;
}

export const EmpresaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [habilitado, setHabilitado] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [atual, setAtual] = useState<Empresa | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setHabilitado(false);
      setEmpresas([]);
      setAtual(null);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    listarEmpresas()
      .then(lista => {
        if (cancelado) return;
        if (lista === null) {
          // Servidor sem multi-empresa: não manda cabeçalho nenhum.
          limparEmpresaAtual();
          setHabilitado(false);
          return;
        }
        const escolhida = escolherEmpresa(lista, getEmpresaAtual());
        if (escolhida) setEmpresaAtual(escolhida.id);
        else limparEmpresaAtual();
        setEmpresas(lista);
        setAtual(escolhida);
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

  // Enquanto não sabemos a empresa, nada de negócio deve rodar: sairia sem o cabeçalho e levaria erro.
  if (isAuthenticated && carregando) return <LoadingScreen fullScreen showLogo />;

  return <EmpresaContext.Provider value={valor}>{children}</EmpresaContext.Provider>;
};

export const useEmpresa = () => useContext(EmpresaContext);
