import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContactsTable from './ContactsTable';
import type { Contact } from '@/types/contacts';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useContactPiiMasking', () => ({
  useContactPiiMasking: () => ({
    shouldMask: false,
    maskPhone: (value: string) => value,
    maskEmail: (value: string) => value,
  }),
}));

vi.mock('@/components/chat/contact/ContactAvatar', () => ({ default: () => <span /> }));

const contact = {
  id: 'contact-1',
  name: 'Contato Teste',
  email: 'teste@exemplo.invalid',
  phone_number: '+5511900000000',
  identifier: 'ID-77',
  type: 'person',
  blocked: false,
  labels: [],
  pipelines: [],
  created_at: Date.UTC(2026, 0, 15, 12) / 1000,
  last_activity_at: null,
  custom_attributes: { uf: 'RS', porte: 0 },
} as unknown as Contact;

const renderTable = (extra: Partial<React.ComponentProps<typeof ContactsTable>> = {}) =>
  render(
    <ContactsTable
      contacts={[contact]}
      selectedContacts={[]}
      onSelectionChange={() => undefined}
      onContactClick={() => undefined}
      onStartConversation={() => undefined}
      onEditContact={() => undefined}
      {...extra}
    />,
  );

describe('ContactsTable extra columns', () => {
  it('shows no extra columns by default', () => {
    renderTable();

    expect(screen.queryByText('table.columns.createdAt')).toBeNull();
    expect(screen.queryByText('ID-77')).toBeNull();
  });

  it('shows a custom attribute column with its display name and value', () => {
    renderTable({ extraColumns: ['custom:uf'], customAttributeLabels: { uf: 'Estado (UF)' } });

    expect(screen.getByText('Estado (UF)')).toBeTruthy();
    expect(screen.getByText('RS')).toBeTruthy();
  });

  it('keeps a falsy but real value such as 0', () => {
    renderTable({ extraColumns: ['custom:porte'], customAttributeLabels: { porte: 'Porte' } });

    expect(screen.getByText('0')).toBeTruthy();
  });

  it('shows the identifier and the creation date', () => {
    renderTable({ extraColumns: ['identifier', 'created_at'] });

    expect(screen.getByText('table.columns.identifier')).toBeTruthy();
    expect(screen.getByText('ID-77')).toBeTruthy();
    expect(screen.getByText('table.columns.createdAt')).toBeTruthy();
    expect(screen.getByText(new Date(contact.created_at as unknown as number * 1000).toLocaleDateString())).toBeTruthy();
  });

  it('renders a dash for an empty value', () => {
    renderTable({ extraColumns: ['last_activity_at'] });

    expect(screen.getByText('table.columns.lastActivity')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
