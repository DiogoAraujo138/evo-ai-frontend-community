import { useState, useEffect, useCallback } from 'react';
import { getContactColor } from '@/utils/avatar';
import { useLanguage } from '@/hooks/useLanguage';
import { useContactFilterOptions } from '@/hooks/contacts/useContactFilterOptions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Search, User, Phone, Mail, MessageSquare } from 'lucide-react';
import { ConversationForModal, PipelineStage } from '@/types/analytics';
import { pipelinesService } from '@/services/pipelines';
import { toast } from 'sonner';
import { Contact } from '@/types/contacts';
import {
  AVAILABLE_CONTACTS_LIMIT,
  buildAvailableContactQuery,
  hasActiveContactFilters,
  type BlockedFilter,
  type PresenceFilter,
} from './availableContactParams';

interface Item {
  id: string;
  display_id?: string;
  name?: string;
  status?: string;
  created_at?: string;
  last_activity_at?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  stages: PipelineStage[];
  preselectedStage?: PipelineStage | null;
  onItemAdded: () => void;
}

const ADD_CONCURRENCY = 4;

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      await worker(next);
    }
  });
  await Promise.all(runners);
}

export default function AddItemModal({
  open,
  onOpenChange,
  pipelineId,
  stages,
  preselectedStage,
  onItemAdded,
}: AddItemModalProps) {
  const { t } = useLanguage('pipelines');
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemType, setItemType] = useState<'conversation' | 'contact'>('conversation');
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [hasPhone, setHasPhone] = useState<PresenceFilter>('all');
  const [hasEmail, setHasEmail] = useState<PresenceFilter>('all');
  const [blockedFilter, setBlockedFilter] = useState<BlockedFilter>('all');
  const [notes, setNotes] = useState('');
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { labels, companies } = useContactFilterOptions({
    enabled: open && itemType === 'contact',
  });

  const clearContactFilters = () => {
    setLabelFilter('');
    setCompanyFilter('');
    setHasPhone('all');
    setHasEmail('all');
    setBlockedFilter('all');
  };

  // Initialize modal
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSearchQuery('');
      setNotes('');
      setItemType('conversation');
      clearContactFilters();

      if (preselectedStage) {
        setSelectedStage(preselectedStage);
      } else if (stages.length > 0) {
        setSelectedStage(stages[0]);
      }
    }
  }, [open, preselectedStage, stages]);

  // Load available items from API
  const loadAvailableItems = useCallback(async () => {
    setIsLoadingItems(true);
    setAvailableItems([]);
    try {
      let data: ConversationForModal[] | Contact[];

      if (itemType === 'conversation') {
        data = await pipelinesService.getAvailableConversations(pipelineId, {
          search: searchQuery,
        });
      } else {
        data = (await pipelinesService.getAvailableContacts(
          pipelineId,
          buildAvailableContactQuery({
            search: searchQuery,
            label: labelFilter,
            companyId: companyFilter,
            hasPhone,
            hasEmail,
            blocked: blockedFilter,
          }),
        )) as Contact[];
      }

      setAvailableItems(data as Item[]);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error(t('addItem.loadError'));
      setAvailableItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  }, [pipelineId, searchQuery, itemType, labelFilter, companyFilter, hasPhone, hasEmail, blockedFilter, t]);

  // Debounced search effect. A new query also drops the previous selection,
  // so a contact hidden by a filter cannot be added by accident.
  useEffect(() => {
    if (!open) return;

    setSelectedIds(new Set());
    const timeoutId = setTimeout(() => {
      loadAvailableItems();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, itemType, labelFilter, companyFilter, hasPhone, hasEmail, blockedFilter, loadAvailableItems, open]);

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    availableItems.length > 0 && availableItems.every(item => selectedIds.has(item.id));
  const someVisibleSelected = availableItems.some(item => selectedIds.has(item.id));

  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        availableItems.forEach(item => next.delete(item.id));
      } else {
        availableItems.forEach(item => next.add(item.id));
      }
      return next;
    });
  };

  const handleAddItem = async () => {
    if (!selectedStage || selectedIds.size === 0) return;

    const chosen = availableItems.filter(item => selectedIds.has(item.id));
    if (chosen.length === 0) return;

    setIsAdding(true);
    const addedIds = new Set<string>();
    const failedIds = new Set<string>();

    try {
      await runPool(chosen, ADD_CONCURRENCY, async item => {
        try {
          await pipelinesService.addItemToPipeline(pipelineId, {
            item_id: item.id,
            type: itemType,
            pipeline_stage_id: selectedStage.id,
            custom_fields: {},
            notes,
          });
          addedIds.add(item.id);
        } catch (error) {
          console.error('Error adding item:', error);
          failedIds.add(item.id);
        }
      });

      setAvailableItems(prev => prev.filter(item => !addedIds.has(item.id)));
      setSelectedIds(failedIds);

      if (addedIds.size > 0) onItemAdded();

      if (failedIds.size === 0) {
        toast.success(
          addedIds.size === 1 ? t('addItem.success') : t('addItem.successMany', { count: addedIds.size }),
        );
        onOpenChange(false);
      } else if (addedIds.size === 0) {
        toast.error(t('addItem.error'));
      } else {
        toast.warning(t('addItem.partial', { added: addedIds.size, failed: failedIds.size }));
      }
    } finally {
      setIsAdding(false);
    }
  };

  const getItemDisplayName = (item: Item) => {
    if (itemType === 'conversation') {
      return item.contact?.name || t('addItem.unknownUser');
    }
    return item.name || t('addItem.unknownUser');
  };

  const filtersActive = hasActiveContactFilters({
    label: labelFilter,
    companyId: companyFilter,
    hasPhone,
    hasEmail,
    blocked: blockedFilter,
  });
  const selectedCount = selectedIds.size;
  const canAddItem = Boolean(selectedStage) && selectedCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] min-h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('addItem.title')}</DialogTitle>
          <DialogDescription>{t('addItem.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
          <div className="grid gap-2">
            <Label>{t('addItem.selectStage')}</Label>
            <Select
              value={selectedStage?.id.toString()}
              onValueChange={value => {
                const stage = stages.find(s => s.id.toString() === value);
                setSelectedStage(stage || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('addItem.chooseStage')} />
              </SelectTrigger>
              <SelectContent>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('addItem.itemType')}</Label>
            <Select
              value={itemType}
              onValueChange={(value: 'conversation' | 'contact') => {
                setAvailableItems([]);
                setItemType(value);
                setSelectedIds(new Set());
                setSearchQuery('');
                setNotes('');
                clearContactFilters();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('addItem.chooseItemType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversation">{t('addItem.itemTypes.conversation')}</SelectItem>
                <SelectItem value="contact">{t('addItem.itemTypes.contact')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {itemType === 'contact' && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>{t('addItem.filters.title')}</Label>
                {filtersActive && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearContactFilters}>
                    {t('addItem.filters.clear')}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={labelFilter || 'all'} onValueChange={value => setLabelFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('addItem.filters.anyLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('addItem.filters.anyLabel')}</SelectItem>
                    {labels.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={companyFilter || 'all'}
                  onValueChange={value => setCompanyFilter(value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('addItem.filters.anyCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('addItem.filters.anyCompany')}</SelectItem>
                    {companies.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={hasPhone} onValueChange={value => setHasPhone(value as PresenceFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('addItem.filters.phone')}: {t('addItem.filters.any')}
                    </SelectItem>
                    <SelectItem value="yes">
                      {t('addItem.filters.withValue', { field: t('addItem.filters.phone') })}
                    </SelectItem>
                    <SelectItem value="no">
                      {t('addItem.filters.withoutValue', { field: t('addItem.filters.phone') })}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={hasEmail} onValueChange={value => setHasEmail(value as PresenceFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('addItem.filters.email')}: {t('addItem.filters.any')}
                    </SelectItem>
                    <SelectItem value="yes">
                      {t('addItem.filters.withValue', { field: t('addItem.filters.email') })}
                    </SelectItem>
                    <SelectItem value="no">
                      {t('addItem.filters.withoutValue', { field: t('addItem.filters.email') })}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={blockedFilter}
                  onValueChange={value => setBlockedFilter(value as BlockedFilter)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('addItem.filters.blocked')}: {t('addItem.filters.blockedAll')}
                    </SelectItem>
                    <SelectItem value="hide">{t('addItem.filters.blockedHide')}</SelectItem>
                    <SelectItem value="only">{t('addItem.filters.blockedOnly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>{t('addItem.searchItems')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('addItem.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t('addItem.availableItems')}</Label>
              {selectedCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t('addItem.selectedCount', { count: selectedCount })}
                </span>
              )}
            </div>
            <div className="border rounded-lg h-56 overflow-y-auto">
              {isLoadingItems ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : availableItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchQuery || filtersActive ? t('addItem.noItemsFound') : t('addItem.noItemsAvailable')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  <label className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAllVisible}
                    />
                    <span>{t('addItem.selectAll')}</span>
                  </label>
                  {availableItems.map(item => {
                    const selected = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => toggleItem(item.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleItem(item.id)}
                            onClick={event => event.stopPropagation()}
                            className="mt-1"
                          />
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: getContactColor(getItemDisplayName(item)) }}
                          >
                            {getItemDisplayName(item)[0]?.toUpperCase() || 'U'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold truncate">
                                {getItemDisplayName(item)}
                              </h4>
                              {item.display_id && (
                                <span className="text-xs text-muted-foreground">{item.display_id}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                              {(item.email || item.contact?.email) && (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate max-w-32">
                                    {item.email || item.contact?.email}
                                  </span>
                                </div>
                              )}
                              {(item.phone_number || item.contact?.phone_number) && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{item.phone_number || item.contact?.phone_number}</span>
                                </div>
                              )}
                            </div>

                            {itemType === 'conversation' && item.last_message && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.last_message.content}
                              </p>
                            )}

                            {itemType === 'conversation' && item.assignee && (
                              <div className="flex items-center gap-1 mt-1">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{item.assignee.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {itemType === 'contact' && availableItems.length >= AVAILABLE_CONTACTS_LIMIT && (
              <p className="text-xs text-muted-foreground">
                {t('addItem.showingLimit', { count: AVAILABLE_CONTACTS_LIMIT })}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>{t('addItem.notes')}</Label>
            <Textarea
              placeholder={
                selectedCount > 1 ? t('addItem.notesPlaceholderMany') : t('addItem.notesPlaceholder')
              }
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            {t('addItem.cancel')}
          </Button>
          <Button onClick={handleAddItem} disabled={!canAddItem || isAdding}>
            {isAdding
              ? t('addItem.adding')
              : selectedCount > 1
                ? t('addItem.addMany', { count: selectedCount })
                : t('addItem.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
