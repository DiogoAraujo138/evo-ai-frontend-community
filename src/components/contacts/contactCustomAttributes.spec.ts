import { describe, expect, it } from 'vitest';
import type { CustomAttributeDefinition } from '@/types/settings';
import {
  customAttributeFilterType,
  formatCustomAttributeValue,
  isFilterableCustomAttribute,
} from './contactCustomAttributes';

const definition = (overrides: Partial<CustomAttributeDefinition>): CustomAttributeDefinition =>
  ({
    id: 'attr-1',
    attribute_key: 'uf',
    attribute_display_name: 'UF',
    attribute_display_type: 'text',
    attribute_model: 'contact_attribute',
    ...overrides,
  }) as CustomAttributeDefinition;

const operatorKeys = (attribute: CustomAttributeDefinition) =>
  customAttributeFilterType(attribute).filterOperators.map(operator => operator.key);

describe('customAttributeFilterType', () => {
  it('uses the user-defined name as the label and the key as the attribute key', () => {
    const filterType = customAttributeFilterType(definition({ attribute_key: 'tipo_pessoa', attribute_display_name: 'Tipo de pessoa' }));

    expect(filterType.attributeKey).toBe('tipo_pessoa');
    expect(filterType.attributeLabel).toBe('Tipo de pessoa');
    expect(filterType.attribute_type).toBe('custom');
  });

  it('falls back to the key when the attribute has no display name', () => {
    expect(customAttributeFilterType(definition({ attribute_display_name: '' })).attributeLabel).toBe('uf');
  });

  it('offers text operators, including contains and presence, for text attributes', () => {
    expect(operatorKeys(definition({ attribute_display_type: 'text' }))).toEqual([
      'equal_to',
      'not_equal_to',
      'contains',
      'does_not_contain',
      'is_present',
      'is_not_present',
    ]);
  });

  it.each(['number', 'currency', 'percent'] as const)('offers comparison operators for %s attributes', displayType => {
    const filterType = customAttributeFilterType(definition({ attribute_display_type: displayType }));

    expect(filterType.inputType).toBe('number');
    expect(filterType.dataType).toBe('number');
    expect(operatorKeys(definition({ attribute_display_type: displayType }))).toContain('is_greater_than');
  });

  it.each(['date', 'datetime'] as const)('uses a date input for %s attributes', displayType => {
    const filterType = customAttributeFilterType(definition({ attribute_display_type: displayType }));

    expect(filterType.inputType).toBe('date');
    expect(filterType.dataType).toBe('date');
  });

  it('points every operator at an existing translation key', () => {
    const operators = customAttributeFilterType(definition({ attribute_display_type: 'number' })).filterOperators;

    operators.forEach(operator => expect(operator.label).toBe(`filter.operators.${operator.key}`));
  });
});

describe('isFilterableCustomAttribute', () => {
  it('leaves checkbox attributes out of the filter', () => {
    expect(isFilterableCustomAttribute(definition({ attribute_display_type: 'checkbox' }))).toBe(false);
  });

  it('accepts the other display types', () => {
    (['text', 'number', 'currency', 'percent', 'link', 'date', 'datetime', 'list'] as const).forEach(displayType =>
      expect(isFilterableCustomAttribute(definition({ attribute_display_type: displayType }))).toBe(true),
    );
  });
});

describe('formatCustomAttributeValue', () => {
  it('returns an empty string for missing values', () => {
    expect(formatCustomAttributeValue(undefined)).toBe('');
    expect(formatCustomAttributeValue(null)).toBe('');
    expect(formatCustomAttributeValue('')).toBe('');
  });

  it('keeps zero and false, which are real values', () => {
    expect(formatCustomAttributeValue(0)).toBe('0');
    expect(formatCustomAttributeValue(false)).toBe('false');
  });

  it('joins list values', () => {
    expect(formatCustomAttributeValue(['RS', 'SC'])).toBe('RS, SC');
  });
});
