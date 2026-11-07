import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { StartCampaignReviewDialog } from './StartCampaignReviewDialog';
import { campaignsService } from '@/services/campaigns';
import type { Campaign } from '@/types/campaigns';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (!params) return key;
      return `${key}:${JSON.stringify(params)}`;
    },
  }),
}));

vi.mock('@evoapi/design-system', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Dialog: ({ children, open }: any) => (open ? <>{children}</> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/services/campaigns', () => ({
  campaignsService: {
    computeAudience: vi.fn(),
    getAudiencePreview: vi.fn(),
    validateAudience: vi.fn(),
    removeInvalidAudience: vi.fn(),
    executeCampaign: vi.fn(),
  },
}));

const campaign = {
  id: 'camp-1',
  title: 'Teste',
  name: 'teste',
  status: 0,
} as Campaign;

describe('StartCampaignReviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(campaignsService.computeAudience).mockResolvedValue({
      campaignId: 'camp-1',
      totalContacts: 2,
      validContacts: 2,
      invalidContacts: 0,
      processingTimeMs: 1,
      strategy: 'contacts',
    });
    vi.mocked(campaignsService.getAudiencePreview).mockResolvedValue({
      contacts: [
        { id: '1', name: 'Ana', phoneNumber: '5511999999999' },
        { id: '2', name: 'Bruno', phoneNumber: '5511888888888' },
      ],
      total: 2,
    });
    vi.mocked(campaignsService.validateAudience).mockResolvedValue({
      totalContacts: 2,
      validContacts: 2,
      issues: [],
      summary: {
        blocked: 0,
        missingFields: 0,
        invalidEmail: 0,
        invalidPhone: 0,
        duplicates: 0,
      },
      isValid: true,
    });
  });

  it('loads preview and enables confirm only after valid queue', async () => {
    const onConfirm = vi.fn();

    render(
      <StartCampaignReviewDialog
        open
        campaign={campaign}
        confirming={false}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await waitFor(() => {
      expect(campaignsService.computeAudience).toHaveBeenCalledWith('camp-1');
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'dialog.reviewQueue.confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancel does not call onConfirm', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <StartCampaignReviewDialog
        open
        campaign={campaign}
        confirming={false}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'dialog.reviewQueue.cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('blocks confirm when validation has invalid contacts', async () => {
    vi.mocked(campaignsService.validateAudience).mockResolvedValue({
      totalContacts: 2,
      validContacts: 1,
      issues: [{ type: 'invalid_phone', contactId: '2', message: 'telefone inválido' }],
      summary: {
        blocked: 0,
        missingFields: 0,
        invalidEmail: 0,
        invalidPhone: 1,
        duplicates: 0,
      },
      isValid: false,
    });

    const onConfirm = vi.fn();

    render(
      <StartCampaignReviewDialog
        open
        campaign={campaign}
        confirming={false}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('telefone inválido')).toBeInTheDocument();
    });

    const confirm = screen.getByRole('button', { name: 'dialog.reviewQueue.confirm' });
    expect(confirm).toBeDisabled();
  });
});
