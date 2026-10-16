import { OPERATOR_TYPES_3 } from '@/types/core';
import type { FilterOperatorType, FilterType } from '@/types/core';
import type { CustomAttributeDefinition } from '@/types/settings';

const operator = (key: string): FilterOperatorType => ({ key, label: `filter.operators.${key}`, value: key });

const PRESENCE_OPERATORS = ['is_present', 'is_not_present'].map(operator);
const COMPARABLE_OPERATORS = ['equal_to', 'not_equal_to', 'is_greater_than', 'is_less_than', ...['is_present', 'is_not_present']].map(operator);

// 'checkbox' is left out of the filter: its boolean values need their own options and are
// not part of this first version. Every other display type can be queried by the backend.
export const isFilterableCustomAttribute = (definition: CustomAttributeDefinition): boolean =>
  definition.attribute_display_type !== 'checkbox';

/** Builds the filter-row definition for a contact custom attribute. */
export const customAttributeFilterType = (definition: CustomAttributeDefinition): FilterType => {
  const common = {
    attributeKey: definition.attribute_key,
    attributeI18nKey: definition.attribute_key,
    attributeLabel: definition.attribute_display_name || definition.attribute_key,
    attribute_type: 'custom' as const,
    attributeModel: definition.attribute_model,
  };

  switch (definition.attribute_display_type) {
    case 'number':
    case 'currency':
    case 'percent':
      return { ...common, inputType: 'number', dataType: 'number', filterOperators: COMPARABLE_OPERATORS };
    case 'date':
    case 'datetime':
      return { ...common, inputType: 'date', dataType: 'date', filterOperators: COMPARABLE_OPERATORS };
    default:
      return {
        ...common,
        inputType: 'plain_text',
        dataType: 'text',
        filterOperators: [...OPERATOR_TYPES_3, ...PRESENCE_OPERATORS],
      };
  }
};

/** Value of a custom attribute on a contact, as text for a table cell ('' when unset). */
export const formatCustomAttributeValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};
