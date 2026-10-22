import { useMemo } from 'react';
import { CONTACT_FILTER_TYPES } from '@/types/core';
import type { FilterType } from '@/types/core';
import {
  customAttributeFilterType,
  isFilterableCustomAttribute,
} from '@/components/contacts/contactCustomAttributes';
import type { CustomAttributeDefinition } from '@/types/settings';
import { useContactCustomAttributes } from './useContactCustomAttributes';
import { useContactFilterOptions } from './useContactFilterOptions';

/**
 * The filter fields of the contact list: standard fields plus every custom
 * attribute the company defined for contacts. Campaign audience uses the same list.
 * Pass `providedAttributes` when the screen already loaded them.
 */
export function useContactFilterTypes(
  enabled = true,
  providedAttributes?: CustomAttributeDefinition[],
): FilterType[] {
  const loadedAttributes = useContactCustomAttributes(enabled && providedAttributes === undefined);
  const customAttributes = providedAttributes ?? loadedAttributes;
  const { labels, companies } = useContactFilterOptions({ enabled });

  return useMemo<FilterType[]>(() => {
    const standard = CONTACT_FILTER_TYPES.map(filterType => {
      if (filterType.attributeKey === 'labels') return { ...filterType, options: labels };
      if (filterType.attributeKey === 'company') return { ...filterType, options: companies };
      return filterType;
    });
    const custom = customAttributes.filter(isFilterableCustomAttribute).map(customAttributeFilterType);
    return [...standard, ...custom];
  }, [labels, companies, customAttributes]);
}
