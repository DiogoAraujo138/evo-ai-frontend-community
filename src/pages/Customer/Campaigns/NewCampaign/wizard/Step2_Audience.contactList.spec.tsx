import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Step2_Audience from './Step2_Audience';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { count?: number }) => (opts?.count !== undefined ? `${key}:${opts.count}` : key) }),
}));
vi.mock('@/services/contacts/contactsService', () => ({
  contactsService: { getContacts: vi.fn().mockResolvedValue({ meta: { pagination: { total: 0 } } }) },
}));
vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { getLabels: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('@/services/segments/segmentsService', () => ({
  segmentsService: { getSegments: vi.fn().mockResolvedValue({ data: [] }) },
}));

const onChange = vi.fn();
const onNext = vi.fn();

const renderStep = (data: Record<string, unknown>) =>
  render(<Step2_Audience data={data as never} onChange={onChange} onNext={onNext} onBack={vi.fn()} />);

// The contacts view hands the wizard a fixed list. The step must show it, let the user advance
// with it, and never fall back to "everyone" by itself.
describe('Step2_Audience with a contact list from the contacts view', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the list size and hides the all-contacts and filter options', async () => {
    renderStep({ contact_selection: 'contacts', contact_ids: ['c1', 'c2', 'c3'], estimated_contacts: 3 });

    expect(await screen.findByText('wizard.step2.contactListDescription:3')).toBeTruthy();
    expect(screen.queryByText('wizard.step2.audienceFilters')).toBeNull();
  });

  it('drops the list when the user chooses another audience', async () => {
    renderStep({ contact_selection: 'contacts', contact_ids: ['c1'], estimated_contacts: 1 });

    fireEvent.click(await screen.findByText('wizard.step2.contactListClear'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ contact_selection: '', contact_ids: [], estimated_contacts: 0 }),
    );
  });

  it('does not treat an empty list as a valid audience', async () => {
    renderStep({ contact_selection: 'contacts', contact_ids: [], estimated_contacts: 0 });

    expect(screen.queryByText('wizard.step2.contactListTitle')).toBeNull();
    expect(await screen.findByText('wizard.step2.audienceFilters')).toBeTruthy();
  });
});
