import { describe, expect, it } from 'vitest';
import { describeContactSaveError } from './contactSaveError';

const t = (key: string, options?: { field?: string; defaultValue?: string }) => {
  if (key === 'messages.saveErrors.taken') return `${options?.field} ja cadastrado`;
  if (key === 'messages.saveErrors.invalid') return `${options?.field} invalido`;
  if (key.startsWith('messages.saveErrors.fields.')) return options?.defaultValue ?? key;
  return key;
};

const answer = (details: unknown) => ({ response: { data: { error: { details } } } });

describe('describeContactSaveError', () => {
  it('names each duplicated field', () => {
    const error = answer([
      { field: 'phone_number', messages: ['has already been taken'] },
      { field: 'email', messages: ['has already been taken'] },
    ]);
    expect(describeContactSaveError(error, t)).toBe('phone_number ja cadastrado. email ja cadastrado');
  });

  it('reports invalid values and unknown messages', () => {
    const error = answer([
      { field: 'phone_number', messages: ['is invalid'] },
      { field: 'name', messages: ['is too long'] },
    ]);
    expect(describeContactSaveError(error, t)).toBe('phone_number invalido. name: is too long');
  });

  it('returns null without detail so the generic text stays', () => {
    expect(describeContactSaveError(new Error('network'), t)).toBeNull();
    expect(describeContactSaveError(answer([]), t)).toBeNull();
  });
});
