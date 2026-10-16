import { Columns3 } from 'lucide-react';
import { Button } from '@evoapi/design-system/button';
import { Badge } from '@evoapi/design-system/badge';
import { Checkbox } from '@evoapi/design-system/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system/popover';
import { ScrollArea } from '@evoapi/design-system/scroll-area';
import { useLanguage } from '@/hooks/useLanguage';
import type { CustomAttributeDefinition } from '@/types/settings';
import { STANDARD_EXTRA_COLUMNS, customColumnId } from './contactColumns';
import type { StandardExtraColumn } from './contactColumns';

interface ContactsColumnPickerProps {
  selected: string[];
  onToggle: (columnId: string) => void;
  onReset: () => void;
  customAttributes: CustomAttributeDefinition[];
}

const STANDARD_LABEL_KEYS: Record<StandardExtraColumn, string> = {
  created_at: 'table.columns.createdAt',
  last_activity_at: 'table.columns.lastActivity',
  identifier: 'table.columns.identifier',
};

export default function ContactsColumnPicker({
  selected,
  onToggle,
  onReset,
  customAttributes,
}: ContactsColumnPickerProps) {
  const { t } = useLanguage('contacts');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent whitespace-nowrap"
        >
          <Columns3 className="h-4 w-4 mr-2" />
          {t('table.columnPicker.trigger')}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-sidebar-accent">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0 bg-muted" side="bottom" align="end" sideOffset={8} collisionPadding={12}>
        <div className="px-4 py-3 bg-background border-b text-sm font-semibold">
          {t('table.columnPicker.title')}
        </div>
        <ScrollArea className="max-h-80">
          <div className="p-3 space-y-3">
            <section>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {t('table.columnPicker.standard')}
              </div>
              {STANDARD_EXTRA_COLUMNS.map(column => (
                <label key={column} className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer">
                  <Checkbox checked={selected.includes(column)} onCheckedChange={() => onToggle(column)} />
                  <span className="truncate">{t(STANDARD_LABEL_KEYS[column])}</span>
                </label>
              ))}
            </section>

            <section>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {t('table.columnPicker.custom')}
              </div>
              {customAttributes.length === 0 ? (
                <div className="py-1.5 text-xs text-muted-foreground">{t('table.columnPicker.empty')}</div>
              ) : (
                customAttributes.map(definition => {
                  const id = customColumnId(definition.attribute_key);
                  return (
                    <label key={id} className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer">
                      <Checkbox checked={selected.includes(id)} onCheckedChange={() => onToggle(id)} />
                      <span className="truncate">{definition.attribute_display_name || definition.attribute_key}</span>
                    </label>
                  );
                })
              )}
            </section>
          </div>
        </ScrollArea>
        <div className="px-4 py-2 border-t bg-background">
          <Button variant="ghost" size="sm" className="text-xs cursor-pointer" onClick={onReset}>
            {t('table.columnPicker.reset')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
