type Translate = (key: string, options?: Record<string, unknown>) => string;

interface ValidationDetail {
  field?: string;
  messages?: string[];
}

/**
 * Turns the CRM validation answer (422) into a sentence the user can act on,
 * e.g. "Telefone já cadastrado em outro contato desta empresa". Returns null
 * when the answer carries no field detail, so the caller keeps its generic text.
 */
export function describeContactSaveError(error: unknown, t: Translate): string | null {
  const details = (error as { response?: { data?: { error?: { details?: ValidationDetail[] } } } })?.response?.data
    ?.error?.details;
  if (!Array.isArray(details) || details.length === 0) return null;

  const sentences = details.flatMap(detail => {
    const field = detail?.field ?? '';
    const label = t(`messages.saveErrors.fields.${field}`, { defaultValue: field });
    return (detail?.messages ?? []).map(message => {
      if (/already been taken/i.test(message)) return t('messages.saveErrors.taken', { field: label });
      if (/invalid|must be/i.test(message)) return t('messages.saveErrors.invalid', { field: label });
      return `${label}: ${message}`;
    });
  });

  return sentences.length > 0 ? sentences.join('. ') : null;
}
