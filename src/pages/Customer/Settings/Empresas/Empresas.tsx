import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@evoapi/design-system';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useEmpresa } from '@/contexts/EmpresaContext';
import {
  atualizarEmpresa,
  criarEmpresa,
  desvincularUsuario,
  listarEmpresas,
  listarVinculos,
  vincularUsuario,
  type Empresa,
  type VinculoEmpresa,
} from '@/services/empresas/empresasService';

const PAPEIS = ['owner', 'admin', 'agent'] as const;

type Vinculo = VinculoEmpresa & { nome?: string | null; email?: string | null };

// Gestão de empresas do grupo: criar, ativar/desativar e vincular usuários. Só aparece com multi-empresa ligado.
const Empresas: React.FC = () => {
  const { t } = useLanguage('layout');
  const { habilitado } = useEmpresa();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [nome, setNome] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<string>('agent');

  const carregar = useCallback(async () => {
    const lista = await listarEmpresas();
    setEmpresas(lista ?? []);
  }, []);

  useEffect(() => {
    // `t` fica fora das dependências de propósito: muda a cada renderização e geraria recarga em laço.
    if (habilitado) carregar().catch(() => toast.error(t('companies.errors.load')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, carregar]);

  const abrir = async (id: string) => {
    if (aberta === id) {
      setAberta(null);
      return;
    }
    setAberta(id);
    try {
      setVinculos((await listarVinculos(id)) as Vinculo[]);
    } catch {
      setVinculos([]);
      toast.error(t('companies.errors.users'));
    }
  };

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    try {
      await criarEmpresa(nome.trim());
      setNome('');
      toast.success(t('companies.created'));
      await carregar();
    } catch {
      toast.error(t('companies.errors.create'));
    }
  };

  const alternarAtiva = async (empresa: Empresa) => {
    try {
      await atualizarEmpresa(empresa.id, { ativa: !empresa.ativa });
      await carregar();
    } catch {
      toast.error(t('companies.errors.update'));
    }
  };

  const vincular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aberta || !email.trim()) return;
    try {
      await vincularUsuario(aberta, email.trim(), papel);
      setEmail('');
      setVinculos((await listarVinculos(aberta)) as Vinculo[]);
      toast.success(t('companies.linked'));
    } catch {
      toast.error(t('companies.errors.link'));
    }
  };

  const desvincular = async (userId: string) => {
    if (!aberta) return;
    try {
      await desvincularUsuario(aberta, userId);
      setVinculos((await listarVinculos(aberta)) as Vinculo[]);
    } catch {
      toast.error(t('companies.errors.unlink'));
    }
  };

  if (!habilitado) {
    return (
      <div className="p-6" data-testid="empresas-desligado">
        <p className="text-sm text-muted-foreground">{t('companies.disabled')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" aria-hidden />
          {t('companies.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('companies.subtitle')}</p>
      </div>

      <form onSubmit={criar} className="flex gap-2" aria-label={t('companies.new')}>
        <Input
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder={t('companies.namePlaceholder')}
          aria-label={t('companies.namePlaceholder')}
        />
        <Button type="submit" disabled={!nome.trim()}>
          {t('companies.create')}
        </Button>
      </form>

      <ul className="flex flex-col gap-3">
        {empresas.map(empresa => (
          <li key={empresa.id} className="border rounded-lg p-4" data-testid={`empresa-${empresa.slug}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold">{empresa.nome}</span>
                <span className="ml-2 text-xs text-muted-foreground">{empresa.slug}</span>
                {!empresa.ativa && <span className="ml-2 text-xs text-destructive">{t('companies.inactive')}</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => abrir(empresa.id)}>
                  {t('companies.users')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => alternarAtiva(empresa)}>
                  {empresa.ativa ? t('companies.deactivate') : t('companies.activate')}
                </Button>
              </div>
            </div>

            {aberta === empresa.id && (
              <div className="mt-4 border-t pt-4 flex flex-col gap-3">
                {vinculos.length === 0 && <p className="text-sm text-muted-foreground">{t('companies.noUsers')}</p>}
                <ul className="flex flex-col gap-2">
                  {vinculos.map(v => (
                    <li key={v.user_id} className="flex items-center justify-between text-sm">
                      <span>
                        {v.nome || v.email || v.user_id}
                        {v.email && v.nome ? <span className="text-muted-foreground"> ({v.email})</span> : null}
                        <span className="ml-2 text-xs text-muted-foreground">{v.papel}</span>
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => desvincular(v.user_id)}>
                        {t('companies.remove')}
                      </Button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={vincular} className="flex gap-2" aria-label={t('companies.addUser')}>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('companies.emailPlaceholder')}
                    aria-label={t('companies.emailPlaceholder')}
                  />
                  <Select value={papel} onValueChange={setPapel}>
                    <SelectTrigger className="w-[130px]" aria-label={t('companies.role')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPEIS.map(p => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={!email.trim()}>
                    {t('companies.add')}
                  </Button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Empresas;
