import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import { campaignsService } from '@/services/campaigns';
import type {
  AudiencePreviewContact,
  AudienceValidationResult,
  Campaign,
} from '@/types/campaigns';

interface StartCampaignReviewDialogProps {
  open: boolean;
  campaign: Campaign | null;
  confirming: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function contactPhone(contact: AudiencePreviewContact): string {
  return contact.phoneNumber || contact.phone_number || '—';
}

export function StartCampaignReviewDialog({
  open,
  campaign,
  confirming,
  onOpenChange,
  onConfirm,
}: StartCampaignReviewDialogProps) {
  const { t } = useLanguage('campaigns');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [contacts, setContacts] = useState<AudiencePreviewContact[]>([]);
  const [validation, setValidation] = useState<AudienceValidationResult | null>(null);
  const [removingInvalid, setRemovingInvalid] = useState(false);

  const loadAudience = useCallback(async (campaignId: string) => {
    setLoading(true);
    setError(null);
    setValidation(null);

    try {
      await campaignsService.computeAudience(campaignId);
      const preview = await campaignsService.getAudiencePreview(campaignId, 20, 0);
      setContacts(preview.contacts ?? []);
      setTotal(preview.total ?? 0);

      if ((preview.total ?? 0) > 0) {
        const validationResult = await campaignsService.validateAudience(campaignId);
        setValidation(validationResult);
      } else {
        setValidation(null);
      }
    } catch (err) {
      console.error('Error loading campaign audience for review:', err);
      setError(t('dialog.reviewQueue.loadError'));
      setContacts([]);
      setTotal(0);
      setValidation(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open || !campaign?.id) {
      return;
    }

    void loadAudience(campaign.id);
  }, [open, campaign?.id, loadAudience]);

  const handleRemoveInvalid = async () => {
    if (!campaign?.id) return;

    setRemovingInvalid(true);
    try {
      await campaignsService.removeInvalidAudience(campaign.id);
      await loadAudience(campaign.id);
    } catch (err) {
      console.error('Error removing invalid audience contacts:', err);
      setError(t('dialog.reviewQueue.removeInvalidError'));
    } finally {
      setRemovingInvalid(false);
    }
  };

  const hasInvalid = Boolean(validation && !validation.isValid && validation.issues.length > 0);
  const canConfirm = !loading && !confirming && !error && total > 0 && !hasInvalid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dialog.reviewQueue.title')}</DialogTitle>
          <DialogDescription>
            {campaign
              ? t('dialog.reviewQueue.description', { name: campaign.title || campaign.name })
              : t('dialog.reviewQueue.descriptionEmpty')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">{t('dialog.reviewQueue.loading')}</div>
        ) : error ? (
          <div className="py-4 text-sm text-destructive">{error}</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-sidebar-border p-3">
              <div className="text-xs text-muted-foreground">{t('dialog.reviewQueue.total')}</div>
              <div className="mt-1 text-2xl font-semibold">{total.toLocaleString('pt-BR')}</div>
            </div>

            {hasInvalid && validation && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                <div className="text-sm font-medium text-destructive">
                  {t('dialog.reviewQueue.invalidWarning', {
                    count: validation.issues.length,
                    valid: validation.validContacts,
                    total: validation.totalContacts,
                  })}
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
                  {validation.issues.slice(0, 5).map(issue => (
                    <li key={`${issue.contactId}-${issue.type}`}>
                      {issue.message || issue.type}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemoveInvalid()}
                  disabled={removingInvalid || confirming}
                >
                  {removingInvalid
                    ? t('dialog.reviewQueue.removingInvalid')
                    : t('dialog.reviewQueue.removeInvalid')}
                </Button>
              </div>
            )}

            {total === 0 && !hasInvalid && (
              <div className="text-sm text-muted-foreground">{t('dialog.reviewQueue.empty')}</div>
            )}

            {contacts.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('dialog.reviewQueue.sample', { count: contacts.length })}
                </div>
                <div className="rounded-md border border-sidebar-border divide-y max-h-48 overflow-y-auto">
                  {contacts.map(contact => (
                    <div key={contact.id} className="px-3 py-2 text-sm flex justify-between gap-3">
                      <span className="font-medium truncate">{contact.name || contact.id}</span>
                      <span className="text-muted-foreground shrink-0">{contactPhone(contact)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            {t('dialog.reviewQueue.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={!canConfirm}>
            {confirming
              ? t('dialog.reviewQueue.confirming')
              : t('dialog.reviewQueue.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
