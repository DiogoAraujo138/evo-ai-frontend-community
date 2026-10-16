import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contactsService } from './contactsService';

const filterContacts = vi.spyOn(contactsService, 'filterContacts');

const page = (ids: string[], total: number, totalPages: number) =>
  ({
    data: ids.map(id => ({ id })),
    meta: { pagination: { total, total_pages: totalPages } },
  }) as never;

const payload = [{ attribute_key: 'name', filter_operator: 'contains', values: ['a'], query_operator: null }] as never;

// A campaign audience built from a filtered view must be exactly what the filter matches:
// never a partial first page, never silently cut off.
describe('contactsService.collectFilteredContactIds', () => {
  beforeEach(() => filterContacts.mockReset());

  it('walks every page and returns the ids without duplicates', async () => {
    filterContacts
      .mockResolvedValueOnce(page(['c1', 'c2'], 3, 2))
      .mockResolvedValueOnce(page(['c3', 'c2'], 3, 2));

    const result = await contactsService.collectFilteredContactIds(payload);

    expect(result).toEqual({ ids: ['c1', 'c2', 'c3'], total: 3, truncated: false });
    expect(filterContacts).toHaveBeenNthCalledWith(1, { page: 1, pageSize: 500, payload });
    expect(filterContacts).toHaveBeenNthCalledWith(2, { page: 2, pageSize: 500, payload });
  });

  it('refuses a filter above the limit instead of returning part of the list', async () => {
    filterContacts.mockResolvedValueOnce(page(['c1'], 20000, 40));

    const result = await contactsService.collectFilteredContactIds(payload, 10000);

    expect(result).toEqual({ ids: [], total: 20000, truncated: true });
    expect(filterContacts).toHaveBeenCalledTimes(1);
  });

  it('stops on an empty page even if the server reports more pages', async () => {
    filterContacts.mockResolvedValueOnce(page([], 0, 3));

    const result = await contactsService.collectFilteredContactIds(payload);

    expect(result.ids).toEqual([]);
    expect(filterContacts).toHaveBeenCalledTimes(1);
  });
});
