import { describe, expect, it } from 'vitest';
import {
  AVAILABLE_CONTACTS_LIMIT,
  buildAvailableContactQuery,
  hasActiveContactFilters,
} from './availableContactParams';

describe('buildAvailableContactQuery', () => {
  it('sends only the page size when no filter is set', () => {
    expect(buildAvailableContactQuery({ search: '   ' })).toEqual({
      limit: AVAILABLE_CONTACTS_LIMIT,
    });
  });

  it('maps the picker choices to the API params', () => {
    expect(
      buildAvailableContactQuery({
        search: ' ana ',
        label: 'cliente',
        companyId: 'company-1',
        hasPhone: 'yes',
        hasEmail: 'no',
        blocked: 'hide',
      }),
    ).toEqual({
      limit: AVAILABLE_CONTACTS_LIMIT,
      search: 'ana',
      labels: ['cliente'],
      company_id: 'company-1',
      has_phone: 'true',
      has_email: 'false',
      blocked: 'false',
    });
  });
});

describe('hasActiveContactFilters', () => {
  it('ignores the search box and the "all" options', () => {
    expect(hasActiveContactFilters({ search: 'ana', hasPhone: 'all', blocked: 'all' })).toBe(false);
    expect(hasActiveContactFilters({ label: 'cliente' })).toBe(true);
  });
});
