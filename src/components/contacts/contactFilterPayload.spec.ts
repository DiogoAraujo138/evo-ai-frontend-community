import { describe, expect, it } from 'vitest';
import type { BaseFilter } from '@/types/core';
import { buildContactFilterPayload, validLeadFilters } from './contactFilterPayload';

const row = (overrides: Partial<BaseFilter> = {}): BaseFilter => ({
  attributeKey: 'name',
  filterOperator: 'equal_to',
  values: 'Ana',
  queryOperator: 'and',
  attributeModel: 'standard',
  ...overrides,
});

describe('buildContactFilterPayload', () => {
  it('matches the contact list: last row has no operator and the others are uppercase', () => {
    const payload = buildContactFilterPayload([
      row({ attributeKey: 'labels', values: 'cliente', queryOperator: 'and' }),
      row({ attributeKey: 'origem', values: 'site', queryOperator: 'or', attributeModel: 'custom' }),
    ]);

    expect(payload).toEqual([
      {
        attribute_key: 'labels',
        values: ['cliente'],
        filter_operator: 'equal_to',
        query_operator: 'AND',
      },
      {
        attribute_key: 'origem',
        values: ['site'],
        filter_operator: 'equal_to',
        query_operator: null,
      },
    ]);
  });
});

describe('validLeadFilters', () => {
  it('drops an empty value and keeps a presence operator', () => {
    const filters = validLeadFilters([
      row({ values: '  ' }),
      row({ attributeKey: 'phone_number', filterOperator: 'is_present', values: '' }),
    ]);

    expect(filters.map(filter => filter.attributeKey)).toEqual(['phone_number']);
  });
});
