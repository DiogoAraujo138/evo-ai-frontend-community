import BaseFilter from '@/components/base/BaseFilter';
import { DEFAULT_BASE_FILTER } from '@/types/core';
import type { BaseFilter as ContactFilter } from '@/types/core';
import type { CustomAttributeDefinition } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';
import { useContactFilterTypes } from '@/hooks/contacts/useContactFilterTypes';

interface ContactsAdvancedFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ContactFilter[];
  onFiltersChange: (filters: ContactFilter[]) => void;
  onApplyFilters: (filters: ContactFilter[]) => void;
  onClearFilters: () => void;
  customAttributes: CustomAttributeDefinition[];
}

/**
 * Row-based filter for contacts: the standard fields plus every custom attribute the
 * account defined for contacts. Rows can be combined, so "UF = RS and Categoria = clinica"
 * is a single query. The backend resolves custom attributes by key.
 */
export default function ContactsAdvancedFilter({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  customAttributes,
}: ContactsAdvancedFilterProps) {
  const { t } = useLanguage('contacts');
  const filterTypes = useContactFilterTypes(open, customAttributes);

  return (
    <BaseFilter<ContactFilter>
      open={open}
      onOpenChange={onOpenChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
      onApplyFilters={onApplyFilters}
      onClearFilters={onClearFilters}
      filterTypes={filterTypes}
      defaultFilter={DEFAULT_BASE_FILTER}
      title={t('filter.advanced.title')}
      description={t('filter.advanced.description')}
      translationNamespace="contacts"
    />
  );
}
