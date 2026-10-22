/** How many contacts the picker asks for in one request. The API caps this at 200. */
export const AVAILABLE_CONTACTS_LIMIT = 100;

export type PresenceFilter = 'all' | 'yes' | 'no';
export type BlockedFilter = 'all' | 'only' | 'hide';

export interface AvailableContactFilters {
  search?: string;
  label?: string;
  companyId?: string;
  hasPhone?: PresenceFilter;
  hasEmail?: PresenceFilter;
  blocked?: BlockedFilter;
}

export interface AvailableContactQuery {
  search?: string;
  labels?: string[];
  company_id?: string;
  has_phone?: 'true' | 'false';
  has_email?: 'true' | 'false';
  blocked?: 'true' | 'false';
  limit: number;
}

/**
 * Turns the picker filters into the query of
 * GET /pipelines/:id/pipeline_items/available_contacts.
 * Empty filters are omitted so the API keeps its default (no extra restriction).
 */
export function buildAvailableContactQuery(filters: AvailableContactFilters): AvailableContactQuery {
  const query: AvailableContactQuery = { limit: AVAILABLE_CONTACTS_LIMIT };
  const search = filters.search?.trim();

  if (search) query.search = search;
  if (filters.label) query.labels = [filters.label];
  if (filters.companyId) query.company_id = filters.companyId;
  if (filters.hasPhone === 'yes') query.has_phone = 'true';
  if (filters.hasPhone === 'no') query.has_phone = 'false';
  if (filters.hasEmail === 'yes') query.has_email = 'true';
  if (filters.hasEmail === 'no') query.has_email = 'false';
  if (filters.blocked === 'only') query.blocked = 'true';
  if (filters.blocked === 'hide') query.blocked = 'false';

  return query;
}

export function hasActiveContactFilters(filters: AvailableContactFilters): boolean {
  return Boolean(
    filters.label ||
      filters.companyId ||
      (filters.hasPhone && filters.hasPhone !== 'all') ||
      (filters.hasEmail && filters.hasEmail !== 'all') ||
      (filters.blocked && filters.blocked !== 'all'),
  );
}
