import React from 'react';
import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@evoapi/design-system';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useLanguage } from '@/hooks/useLanguage';

// Seletor de empresa no cabeçalho. Só aparece com multi-empresa ligado e mais de uma empresa disponível.
export const EmpresaSwitcher: React.FC = () => {
  const { habilitado, empresas, atual, trocar } = useEmpresa();
  const { t } = useLanguage('layout');

  const ativas = empresas.filter(e => e.ativa);
  if (!habilitado || ativas.length < 2 || !atual) return null;

  return (
    <div className="flex items-center gap-2" data-testid="empresa-switcher">
      <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
      <Select value={atual.id} onValueChange={id => id !== atual.id && trocar(id)}>
        <SelectTrigger className="h-8 w-[180px]" aria-label={t('company.label')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ativas.map(e => (
            <SelectItem key={e.id} value={e.id}>
              {e.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default EmpresaSwitcher;
