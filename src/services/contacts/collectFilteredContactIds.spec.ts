import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contactsService } from './contactsService';
import api from '@/services/core/api';

vi.mock('@/services/core/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function page(ids: string[], total: number, totalPages: number): AxiosResponse {
  return {
    data: {
      success: true,
      data: ids.map(id => ({ id })),
      meta: { pagination: { total, total_pages: totalPages } },
    },
  } as AxiosResponse;
}

describe('contactsService.collectFilteredContactIds', () => {
  const postMock = vi.mocked(api.post);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('walks every page and drops duplicate ids', async () => {
    postMock.mockResolvedValueOnce(page(['c1', 'c2'], 3, 2)).mockResolvedValueOnce(page(['c2', 'c3'], 3, 2));

    const result = await contactsService.collectFilteredContactIds([{ attribute_key: 'origem', values: ['site'], filter_operator: 'equal_to', query_operator: null }]);

    expect(result).toEqual({ ids: ['c1', 'c2', 'c3'], total: 3, truncated: false });
    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock.mock.calls[0][1]).toMatchObject({ page: 1, pageSize: 500 });
  });

  it('refuses a list above the limit instead of returning a partial page', async () => {
    postMock.mockResolvedValue(page(['c1'], 10001, 21));

    const result = await contactsService.collectFilteredContactIds([], 10000);

    expect(result).toEqual({ ids: [], total: 10001, truncated: true });
    expect(postMock).toHaveBeenCalledTimes(1);
  });
});
