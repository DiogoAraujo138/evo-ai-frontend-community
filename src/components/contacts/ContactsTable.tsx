import { useLanguage } from '@/hooks/useLanguage';
import { MessageSquare, Edit, Trash, Users, Lock } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { Contact } from '@/types/contacts';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import { useContactPiiMasking } from '@/hooks/useContactPiiMasking';
import ContactStatusBadge from './ContactStatusBadge';
import ContactTagsList from './ContactTagsList';
import ContactTypeBadge from './ContactTypeBadge';
import ContactPipelinesBadge from './ContactPipelinesBadge';
import { customColumnKey, isCustomColumn } from './contactColumns';
import { formatCustomAttributeValue } from './contactCustomAttributes';

interface ContactsTableProps {
  contacts: Contact[];
  selectedContacts: Contact[];
  loading?: boolean;
  onSelectionChange: (contacts: Contact[]) => void;
  onContactClick: (contact: Contact) => void;
  onStartConversation: (contact: Contact) => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact?: (contact: Contact) => void;
  onCreateContact?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  /** Extra columns chosen by the user: created_at, last_activity_at, identifier or custom:<key>. */
  extraColumns?: string[];
  /** Header text of custom attribute columns, by attribute key. */
  customAttributeLabels?: Record<string, string>;
}

// created_at / last_activity_at come from the API as epoch seconds (ISO strings are accepted too).
const formatContactDate = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

export default function ContactsTable({
  contacts,
  selectedContacts,
  loading,
  onSelectionChange,
  onContactClick,
  onStartConversation,
  onEditContact,
  onDeleteContact,
  onCreateContact,
  sortBy,
  sortOrder,
  onSort,
  extraColumns = [],
  customAttributeLabels = {},
}: ContactsTableProps) {
  const { t } = useLanguage('contacts');
  const { shouldMask, maskPhone, maskEmail } = useContactPiiMasking();
  const protectedTitle = shouldMask ? t('card.dataProtectedTooltip') : undefined;
  const contactsList = contacts || [];

  // const formatLastActivity = (date: string) => {
  //   if (!date) return 'Nunca';
  //   try {
  //     return formatDistanceToNow(new Date(date), {
  //       addSuffix: true,
  //       locale: ptBR,
  //     });
  //   } catch {
  //     return 'Data inválida';
  //   }
  // };

  const emptyCell = <span className="text-muted-foreground">—</span>;

  // Columns picked in the column picker; they sit between Status and the action button.
  const extraTableColumns: TableColumn<Contact>[] = extraColumns.map(columnId => {
    if (isCustomColumn(columnId)) {
      const attributeKey = customColumnKey(columnId);
      return {
        key: columnId,
        label: customAttributeLabels[attributeKey] || attributeKey,
        sortable: false,
        render: contact => {
          const text = formatCustomAttributeValue(contact.custom_attributes?.[attributeKey]);
          return text ? <span className="text-sm break-words">{text}</span> : emptyCell;
        },
      };
    }
    if (columnId === 'identifier') {
      return {
        key: columnId,
        label: t('table.columns.identifier'),
        sortable: false,
        render: contact => (contact.identifier ? <span className="text-sm">{contact.identifier}</span> : emptyCell),
      };
    }
    const isCreated = columnId === 'created_at';
    return {
      key: columnId,
      label: t(isCreated ? 'table.columns.createdAt' : 'table.columns.lastActivity'),
      sortable: false,
      render: contact => {
        const text = formatContactDate(isCreated ? contact.created_at : contact.last_activity_at);
        return text ? <span className="text-sm whitespace-nowrap">{text}</span> : emptyCell;
      },
    };
  });

  const columns: TableColumn<Contact>[] = [
    {
      key: 'name',
      label: t('table.columns.name'),
      sortable: true,
      width: 'w-56',
      render: contact => (
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 py-2"
          onClick={() => onContactClick(contact)}
        >
          <ContactAvatar contact={contact} size="md" showColoredFallback={true} />
          <div className="min-w-0 flex-1 font-medium text-sm break-words">
            {contact.name || t('table.noName')}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: t('table.columns.email'),
      sortable: true,
      width: 'w-48',
      render: contact =>
        contact.email ? (
          <span className="truncate flex items-center gap-1 text-sm" title={protectedTitle}>
            {shouldMask && <Lock className="h-3 w-3 flex-shrink-0" aria-label={protectedTitle} />}
            {maskEmail(contact.email)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'phone_number',
      label: t('table.columns.phone'),
      sortable: true,
      width: 'w-40',
      render: contact =>
        contact.phone_number ? (
          <span className="whitespace-nowrap flex items-center gap-1 text-sm" title={protectedTitle}>
            {shouldMask && <Lock className="h-3 w-3 flex-shrink-0" aria-label={protectedTitle} />}
            {maskPhone(contact.phone_number)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'type',
      label: t('table.columns.type'),
      sortable: false,
      render: contact => (
        <ContactTypeBadge type={contact.type || 'person'} className="justify-center" />
      ),
    },
    {
      key: 'labels',
      label: t('table.columns.labels'),
      sortable: false,
      render: contact => <ContactTagsList labels={contact.labels} maxVisible={3} size="sm" />,
    },
    {
      key: 'pipelines',
      label: t('table.columns.pipelines'),
      sortable: false,
      render: contact =>
        contact.pipelines && contact.pipelines.length > 0 ? (
          <ContactPipelinesBadge contact={contact} maxPipelines={2} compact={true} />
        ) : null,
    },
    {
      key: 'status',
      label: t('table.columns.status'),
      sortable: false,
      render: contact => <ContactStatusBadge blocked={contact.blocked} />,
    },
    ...extraTableColumns,
    {
      key: 'startConversation',
      label: '',
      sortable: false,
      align: 'center',
      width: 'w-10',
      render: contact =>
        !contact.blocked ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={e => {
              e.stopPropagation();
              onStartConversation(contact);
            }}
            title={t('table.actions.startConversation')}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  const actions: TableAction<Contact>[] = [
    {
      label: t('table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditContact,
    },
    ...(onDeleteContact
      ? [
          {
            label: t('table.actions.delete'),
            icon: <Trash className="h-4 w-4" />,
            onClick: onDeleteContact,
            variant: 'destructive' as const,
          },
        ]
      : []),
  ];

  return (
    <BaseTable<Contact>
      data={contactsList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedContacts}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('table.empty.noResults')}
      emptyIcon={Users}
      emptyTitle={t('table.empty.title')}
      emptyDescription={t('table.empty.description')}
      emptyAction={
        onCreateContact
          ? {
              label: t('table.actions.create'),
              onClick: onCreateContact,
            }
          : undefined
      }
      getRowKey={contact => String(contact.id)}
      className="border-0 shadow-none"
    />
  );
}
