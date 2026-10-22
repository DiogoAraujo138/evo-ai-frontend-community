import { useEffect, useRef, useState } from 'react';
import { Button, Label } from '@evoapi/design-system';
import { ArrowRight, ArrowLeft, Users, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { contactsService } from '@/services/contacts';
import { useContactFilterTypes } from '@/hooks/contacts/useContactFilterTypes';
import BaseFilterRow from '@/components/base/BaseFilterRow';
import {
  buildContactFilterPayload,
  MAX_CAMPAIGN_CONTACTS,
  validLeadFilters,
} from '@/components/contacts/contactFilterPayload';
import { DEFAULT_CONTACT_FILTER } from '@/types/core';
import type { BaseFilter } from '@/types/core';

type AudienceMode = 'leads' | 'all' | 'legacy' | 'fixed';

export interface AudienceStepData {
  contact_selection: 'all' | 'segments' | 'tags' | 'contacts' | '';
  segment_ids?: string[];
  tag_ids?: string[];
  contact_ids?: string[];
  lead_filters?: BaseFilter[];
  audience_summary?: string[];
  estimated_contacts?: number;
}

interface Step2Props {
  data: AudienceStepData;
  onChange: (data: Partial<AudienceStepData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const emptyRow = (): BaseFilter => ({ ...DEFAULT_CONTACT_FILTER });

const Step2_Audience = ({ data, onChange, onNext, onBack }: Step2Props) => {
  const { t } = useLanguage('campaigns');
  const { t: tContacts } = useLanguage('contacts');
  const { t: tCommon } = useLanguage('common');
  const filterTypes = useContactFilterTypes(true);

  const [mode, setMode] = useState<AudienceMode>('leads');
  const [rows, setRows] = useState<BaseFilter[]>([emptyRow()]);
  const [totalContacts, setTotalContacts] = useState<number | null>(null);
  const [matched, setMatched] = useState<{ key: string; total: number } | null>(null);
  const [counting, setCounting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const ownsChanges = useRef(false);

  useEffect(() => {
    contactsService
      .getContacts({ page: 1, per_page: 1 })
      .then(response => setTotalContacts(response.meta?.pagination?.total || 0))
      .catch(() => setTotalContacts(0));
  }, []);

  useEffect(() => {
    if (ownsChanges.current) return;
    if (!data.contact_selection && !(data.lead_filters && data.lead_filters.length > 0)) return;

    ownsChanges.current = true;
    if (data.contact_selection === 'all') {
      setMode('all');
      return;
    }
    if (data.contact_selection === 'segments' || data.contact_selection === 'tags') {
      setMode('legacy');
      return;
    }
    if (data.contact_selection === 'contacts' && !(data.lead_filters && data.lead_filters.length > 0)) {
      setMode('fixed');
      return;
    }

    const saved = data.lead_filters && data.lead_filters.length > 0 ? data.lead_filters : [emptyRow()];
    setMode('leads');
    setRows(saved);
    if (data.contact_ids && data.contact_ids.length > 0) {
      setMatched({ key: JSON.stringify(validLeadFilters(saved)), total: data.contact_ids.length });
    }
  }, [data.contact_selection, data.lead_filters, data.contact_ids]);

  const filterKey = JSON.stringify(validLeadFilters(rows));
  const countReady = matched?.key === filterKey && matched.total > 0;

  const markDirty = () => {
    ownsChanges.current = true;
    setMatched(null);
    setErrorKey(null);
  };

  const updateRow = (index: number, field: keyof BaseFilter, value: string | number | boolean) => {
    markDirty();
    setRows(current => {
      const next = [...current];
      if (field === 'attributeKey') {
        const filterType = filterTypes.find(item => item.attributeKey === value);
        next[index] = {
          ...next[index],
          attributeKey: String(value),
          filterOperator: filterType?.filterOperators[0]?.key || 'equal_to',
          values: '',
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const addRow = () => {
    markDirty();
    setRows(current => [...current, emptyRow()]);
  };

  const removeRow = (index: number) => {
    markDirty();
    setRows(current => (current.length === 1 ? [emptyRow()] : current.filter((_, item) => item !== index)));
  };

  const chooseAll = (checked: boolean) => {
    ownsChanges.current = true;
    setErrorKey(null);
    if (checked) {
      setMode('all');
      onChange({
        contact_selection: 'all',
        segment_ids: [],
        tag_ids: [],
        contact_ids: [],
        lead_filters: [],
        audience_summary: [],
        estimated_contacts: totalContacts || 0,
      });
      return;
    }
    setMode('leads');
    onChange({
      contact_selection: '',
      segment_ids: [],
      tag_ids: [],
      contact_ids: [],
      lead_filters: [],
      audience_summary: [],
      estimated_contacts: 0,
    });
  };

  const replaceLegacy = () => {
    ownsChanges.current = true;
    setMode('leads');
    setRows([emptyRow()]);
    setMatched(null);
    setErrorKey(null);
    onChange({
      contact_selection: '',
      segment_ids: [],
      tag_ids: [],
      contact_ids: [],
      lead_filters: [],
      audience_summary: [],
      estimated_contacts: 0,
    });
  };

  const labelFor = (filter: BaseFilter): string => {
    const filterType = filterTypes.find(item => item.attributeKey === filter.attributeKey);
    if (!filterType) return filter.attributeKey;
    return filterType.attributeLabel ?? tContacts(filterType.attributeI18nKey);
  };

  const operatorFor = (filter: BaseFilter): string => {
    const filterType = filterTypes.find(item => item.attributeKey === filter.attributeKey);
    const operator = filterType?.filterOperators.find(item => item.key === filter.filterOperator);
    const key = operator?.label ?? `filter.operators.${filter.filterOperator}`;
    const fromContacts = tContacts(key);
    return fromContacts === key ? tCommon(key) : fromContacts;
  };

  const valueFor = (filter: BaseFilter): string => {
    if (filter.filterOperator === 'is_present' || filter.filterOperator === 'is_not_present') return '';
    const raw = Array.isArray(filter.values) ? filter.values.map(String).join(', ') : String(filter.values ?? '');
    const option = filterTypes
      .find(item => item.attributeKey === filter.attributeKey)
      ?.options?.find(item => String(item.value) === raw);
    if (!option) return raw;
    if (typeof option.label === 'string' && option.label.includes('.')) {
      const translated = tContacts(option.label);
      return translated === option.label ? raw : translated;
    }
    return option.label;
  };

  const summarize = (filter: BaseFilter): string => {
    const value = valueFor(filter);
    return value ? `${labelFor(filter)} ${operatorFor(filter)} ${value}` : `${labelFor(filter)}: ${operatorFor(filter)}`;
  };

  const countLeads = async () => {
    const valid = validLeadFilters(rows);
    if (valid.length === 0) {
      setErrorKey('emptyFilters');
      setMatched(null);
      return;
    }

    setCounting(true);
    setErrorKey(null);
    try {
      const response = await contactsService.filterContacts({
        page: 1,
        pageSize: 1,
        payload: buildContactFilterPayload(valid),
      });
      const total = response.meta?.pagination?.total ?? 0;
      if (total > MAX_CAMPAIGN_CONTACTS) {
        setMatched(null);
        setErrorKey('tooMany');
        return;
      }
      if (total === 0) {
        setMatched(null);
        setErrorKey('noLeads');
        return;
      }
      setMatched({ key: JSON.stringify(valid), total });
    } catch (error) {
      console.error('Error counting campaign leads:', error);
      setMatched(null);
      setErrorKey('countFailed');
    } finally {
      setCounting(false);
    }
  };

  const continueWithLeads = async () => {
    if (!countReady) return;
    const valid = validLeadFilters(rows);
    setResolving(true);
    setErrorKey(null);
    try {
      const result = await contactsService.collectFilteredContactIds(
        buildContactFilterPayload(valid),
        MAX_CAMPAIGN_CONTACTS,
      );
      if (result.truncated || result.total > MAX_CAMPAIGN_CONTACTS) {
        setErrorKey('tooMany');
        return;
      }
      if (result.ids.length === 0) {
        setErrorKey('noLeads');
        return;
      }
      ownsChanges.current = true;
      onChange({
        contact_selection: 'contacts',
        contact_ids: result.ids,
        lead_filters: valid,
        audience_summary: valid.map(summarize),
        segment_ids: [],
        tag_ids: [],
        estimated_contacts: result.ids.length,
      });
      onNext();
    } catch (error) {
      console.error('Error saving campaign lead list:', error);
      setErrorKey('resolveFailed');
    } finally {
      setResolving(false);
    }
  };

  const handleNext = () => {
    if (mode === 'all' || mode === 'legacy' || mode === 'fixed') {
      onNext();
      return;
    }
    void continueWithLeads();
  };

  const canContinue = mode === 'all' || mode === 'legacy' || mode === 'fixed' || countReady;
  const errorText =
    errorKey === 'tooMany'
      ? t('wizard.step2.tooMany', { max: MAX_CAMPAIGN_CONTACTS.toLocaleString('pt-BR') })
      : errorKey
        ? t(`wizard.step2.${errorKey}`)
        : null;

  return (
    <div className="flex flex-col max-w-4xl mx-auto py-6 px-6 h-full">
      <div className="flex-1 overflow-y-auto min-h-0 px-1">
        <div className="w-full space-y-6 max-w-3xl mx-auto pb-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('wizard.step2.selectAudience')}</h3>
            <p className="text-sm text-muted-foreground">{t('wizard.step2.audienceDescription')}</p>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <input
              type="checkbox"
              id="all-contacts"
              checked={mode === 'all'}
              onChange={event => chooseAll(event.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="all-contacts" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('wizard.step2.allContacts')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('wizard.step2.allContactsDescription')}
                {totalContacts !== null ? ` (${totalContacts.toLocaleString('pt-BR')})` : ''}
              </p>
            </div>
          </div>

          {mode === 'legacy' && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30" data-testid="campaign-legacy-audience">
              <Label className="text-base font-semibold">{t('wizard.step2.legacyTitle')}</Label>
              <p className="text-sm text-muted-foreground">{t('wizard.step2.legacyDescription')}</p>
              <Button type="button" variant="outline" onClick={replaceLegacy}>
                {t('wizard.step2.replaceWithLeadFilter')}
              </Button>
            </div>
          )}

          {mode === 'fixed' && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30" data-testid="campaign-fixed-audience">
              <Label className="text-base font-semibold">
                {t('wizard.step2.fixedList', { count: data.contact_ids?.length ?? data.estimated_contacts ?? 0 })}
              </Label>
              <p className="text-sm text-muted-foreground">{t('wizard.step2.fixedListDescription')}</p>
              <Button type="button" variant="outline" onClick={replaceLegacy}>
                {t('wizard.step2.replaceWithLeadFilter')}
              </Button>
            </div>
          )}

          {mode === 'leads' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30" data-testid="campaign-lead-filters">
              <div>
                <Label className="text-base font-semibold">{t('wizard.step2.leadFilters')}</Label>
                <p className="text-sm text-muted-foreground mt-1">{t('wizard.step2.leadFiltersDescription')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('wizard.step2.snapshotNotice')}</p>
              </div>

              <div className="space-y-3">
                {rows.map((filter, index) => (
                  <BaseFilterRow
                    key={`lead-filter-${index}`}
                    filter={filter}
                    index={index}
                    showQueryOperator={index > 0}
                    filterTypes={filterTypes}
                    onUpdate={updateRow}
                    onRemove={removeRow}
                    translationNamespace="contacts"
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('wizard.step2.addFilter')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void countLeads()}
                  disabled={counting || validLeadFilters(rows).length === 0}
                  data-testid="campaign-count-leads"
                >
                  {counting ? t('wizard.step2.counting') : t('wizard.step2.countLeads')}
                </Button>
              </div>

              {countReady && matched && (
                <p className="text-sm font-medium" data-testid="campaign-lead-count">
                  {t('wizard.step2.leadCount', { count: matched.total.toLocaleString('pt-BR') })}
                </p>
              )}
            </div>
          )}

          {errorText && (
            <p className="text-sm text-destructive" data-testid="campaign-audience-error">
              {errorText}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-4 border-t mt-6">
        <Button variant="outline" className="px-6 gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('wizard.actions.back')}
        </Button>
        <Button
          className="px-6 gap-2"
          onClick={handleNext}
          disabled={!canContinue || resolving}
          data-testid="campaign-audience-continue"
        >
          {resolving ? t('wizard.step2.counting') : t('wizard.actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Step2_Audience;
