import { useMemo } from 'react';
import BaseFilter from '@/components/base/BaseFilter';
import { CONTACT_FILTER_TYPES, DEFAULT_BASE_FILTER } from '@/types/core';
import type { BaseFilter as ContactFilter, FilterType } from '@/types/core';
import type { CustomAttributeDefinition } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';
import { useContactFilterOptions } from '@/hooks/contacts/useContactFilterOptions';
import { customAttributeFilterType, isFilterableCustomAttribute } from './contactCustomAttributes';

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
  const { labels, companies } = useContactFilterOptions({ enabled: open });

  const filterTypes = useMemo<FilterType[]>(() => {
    const standard = CONTACT_FILTER_TYPES.map(filterType => {
      if (filterType.attributeKey === 'labels') return { ...filterType, options: labels };
      if (filterType.attributeKey === 'company') return { ...filterType, options: companies };
      return filterType;
    });
    const custom = customAttributes.filter(isFilterableCustomAttribute).map(customAttributeFilterType);
    return [...standard, ...custom];
  }, [labels, companies, customAttributes]);

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
