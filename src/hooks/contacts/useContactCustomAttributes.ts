import { useEffect, useState } from 'react';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import { AttributeModel } from '@/types/settings';
import type { CustomAttributeDefinition } from '@/types/settings';

// Large enough that no realistic account is cut off by the API's default page size.
const PAGE_SIZE = 200;

/**
 * Loads the custom attribute definitions of contacts (filter fields and optional table
 * columns). Fetches once, the first time `enabled` is true.
 */
export const useContactCustomAttributes = (enabled = true): CustomAttributeDefinition[] => {
  const [definitions, setDefinitions] = useState<CustomAttributeDefinition[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    let active = true;

    customAttributesService
      .getCustomAttributes(AttributeModel.CONTACT_ATTRIBUTE, PAGE_SIZE)
      .then(response => {
        const data = response?.data;
        if (active) setDefinitions(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.warn('Erro ao carregar atributos personalizados de contatos:', error);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [enabled, loaded]);

  return definitions;
};
