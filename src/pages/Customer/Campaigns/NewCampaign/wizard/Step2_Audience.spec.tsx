import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Step2_Audience from './Step2_Audience';
import { contactsService } from '@/services/contacts';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

vi.mock('@/hooks/contacts/useContactFilterTypes', () => ({
  useContactFilterTypes: () => [
    {
      attributeKey: 'name',
      attributeI18nKey: 'filter.attributes.name',
      inputType: 'plain_text',
      dataType: 'text',
      filterOperators: [{ key: 'equal_to', label: 'filter.operators.equal_to', value: 'equal_to' }],
      attribute_type: 'standard',
    },
    {
      attributeKey: 'origem',
      attributeI18nKey: 'origem',
      attributeLabel: 'Origem',
      inputType: 'plain_text',
      dataType: 'text',
      filterOperators: [{ key: 'equal_to', label: 'filter.operators.equal_to', value: 'equal_to' }],
      attribute_type: 'custom',
    },
  ],
}));

vi.mock('@/services/contacts', () => ({
  contactsService: {
    getContacts: vi.fn(),
    filterContacts: vi.fn(),
    collectFilteredContactIds: vi.fn(),
  },
}));

const audience = () => ({
  contact_selection: '' as const,
});

describe('Step2_Audience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contactsService.getContacts).mockResolvedValue({
      data: [],
      meta: { pagination: { total: 20 } },
    } as never);
  });

  it('offers the lead filters and does not offer segment or tag', async () => {
    render(<Step2_Audience data={audience()} onChange={vi.fn()} onNext={vi.fn()} onBack={vi.fn()} />);
    expect(await screen.findByText(/\(20\)/)).toBeInTheDocument();

    expect(screen.getByTestId('campaign-lead-filters')).toBeInTheDocument();
    expect(screen.queryByText('wizard.step2.segment')).not.toBeInTheDocument();
    expect(screen.queryByText('wizard.step2.tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('campaign-audience-continue')).toBeDisabled();
  });

  it('counts with the contact filter payload and saves the contact ids', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onNext = vi.fn();
    vi.mocked(contactsService.filterContacts).mockResolvedValue({
      data: [],
      meta: { pagination: { total: 2, total_pages: 1 } },
    } as never);
    vi.mocked(contactsService.collectFilteredContactIds).mockResolvedValue({
      ids: ['c1', 'c2'],
      total: 2,
      truncated: false,
    });

    render(<Step2_Audience data={audience()} onChange={onChange} onNext={onNext} onBack={vi.fn()} />);
    expect(await screen.findByText(/\(20\)/)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('base.filter.enterValue'), 'site');
    await user.click(screen.getByTestId('campaign-count-leads'));

    expect(contactsService.filterContacts).toHaveBeenCalledWith({
      page: 1,
      pageSize: 1,
      payload: [
        {
          attribute_key: 'name',
          values: ['site'],
          filter_operator: 'equal_to',
          query_operator: null,
        },
      ],
    });
    expect(await screen.findByTestId('campaign-lead-count')).toHaveTextContent('wizard.step2.leadCount');

    await user.click(screen.getByTestId('campaign-audience-continue'));

    await waitFor(() => expect(contactsService.collectFilteredContactIds).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_selection: 'contacts',
        contact_ids: ['c1', 'c2'],
        estimated_contacts: 2,
      }),
    );
    expect(onNext).toHaveBeenCalled();
  });

  it('keeps an old segment audience available until it is replaced', async () => {
    render(
      <Step2_Audience
        data={{ contact_selection: 'segments', segment_ids: ['seg-1'] }}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(await screen.findByTestId('campaign-legacy-audience')).toBeInTheDocument();
    expect(await screen.findByText(/\(20\)/)).toBeInTheDocument();
    expect(screen.getByTestId('campaign-audience-continue')).toBeEnabled();
  });
});
