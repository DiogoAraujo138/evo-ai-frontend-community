import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IntegrationsSection from './IntegrationsSection';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

let available: Record<string, boolean> = {};
vi.mock('@/hooks/useIntegrations', () => ({
  useIntegrations: () => ({
    available,
    isCheckingIntegrations: false,
    reloadConfigs: vi.fn(),
    isConnected: () => false,
  }),
}));

vi.mock('@/components/integrations/ElevenLabsConfigDialog', () => ({ default: () => null }));
vi.mock('@/components/integrations/GoogleCalendarConfigDialog', () => ({ default: () => null }));
vi.mock('@/components/integrations/GoogleSheetsConfigDialog', () => ({ default: () => null }));
vi.mock('@/components/integrations/KnowledgeNexusConfigDialog', () => ({ default: () => null }));

const actionOf = (name: string) =>
  screen.getByText(name, { selector: 'p' }).parentElement!.parentElement!.querySelector('button')!;

describe('IntegrationsSection', () => {
  it('blocks Google Calendar and Sheets when the Google credential is not configured', () => {
    available = { 'google-calendar': false, 'google-sheets': false };
    render(<IntegrationsSection agentId="agent-1" />);

    expect(actionOf('Google Calendar').hasAttribute('disabled')).toBe(true);
    expect(actionOf('Google Sheets').hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByText('edit.integrations.credentialMissing')).toHaveLength(2);
    expect(screen.getAllByText('edit.integrations.googleCredentialMissing')).toHaveLength(2);
  });

  it('offers Google Calendar and Sheets once the credential is configured', () => {
    available = { 'google-calendar': true, 'google-sheets': true };
    render(<IntegrationsSection agentId="agent-1" />);

    expect(actionOf('Google Calendar').hasAttribute('disabled')).toBe(false);
    expect(actionOf('Google Sheets').hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText('edit.integrations.googleCredentialMissing')).toBeNull();
  });

  it('keeps ElevenLabs available regardless of the availability map', () => {
    available = {};
    render(<IntegrationsSection agentId="agent-1" />);

    expect(actionOf('ElevenLabs').hasAttribute('disabled')).toBe(false);
  });
});
