import type { BaseFilter } from '@/types/core';
import type { ContactFilter } from '@/types/contacts';

/** Same ceiling the contacts list uses before it refuses a partial campaign audience. */
export const MAX_CAMPAIGN_CONTACTS = 10_000;

/**
 * Turns the rows of the contact filter into the body of `POST /contacts/filter`.
 * The last row has no query operator. The others use AND/OR in uppercase, which
 * is what the CRM filter service expects.
 */
export function buildContactFilterPayload(filters: BaseFilter[]): ContactFilter[] {
  return filters.map((filter, index) => {
    const isLast = index === filters.length - 1;
    const values = Array.isArray(filter.values) ? filter.values : [filter.values];

    return {
      attribute_key: filter.attributeKey,
      values,
      filter_operator: filter.filterOperator,
      query_operator: isLast ? null : (filter.queryOperator.toUpperCase() as 'AND' | 'OR'),
    };
  });
}

/** Drops rows that still need a value. Presence operators ("is set" / "is not set") stay. */
export function validLeadFilters(filters: BaseFilter[]): BaseFilter[] {
  return filters.filter(filter => {
    const needsValue = !['is_present', 'is_not_present'].includes(filter.filterOperator);
    if (!needsValue) return true;
    if (Array.isArray(filter.values)) return filter.values.length > 0;
    return String(filter.values ?? '').trim() !== '';
  });
}
