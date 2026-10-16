import { useCallback, useEffect, useState } from 'react';

/** Columns a contact can show beyond the fixed ones. Custom attributes use `custom:<key>`. */
export const STANDARD_EXTRA_COLUMNS = ['created_at', 'last_activity_at', 'identifier'] as const;
export type StandardExtraColumn = (typeof STANDARD_EXTRA_COLUMNS)[number];

export const CUSTOM_COLUMN_PREFIX = 'custom:';
export const customColumnId = (attributeKey: string): string => `${CUSTOM_COLUMN_PREFIX}${attributeKey}`;
export const isCustomColumn = (columnId: string): boolean => columnId.startsWith(CUSTOM_COLUMN_PREFIX);
export const customColumnKey = (columnId: string): string => columnId.slice(CUSTOM_COLUMN_PREFIX.length);

const STORAGE_KEY = 'contacts.extraColumns';

const readStored = (): string[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

/** Extra columns the user chose, remembered in this browser (empty = the default table). */
export const useExtraColumns = () => {
  const [columns, setColumns] = useState<string[]>(readStored);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch {
      // Storage can be blocked (private mode); the choice then lasts for the session only.
    }
  }, [columns]);

  const toggle = useCallback((columnId: string) => {
    setColumns(current =>
      current.includes(columnId) ? current.filter(id => id !== columnId) : [...current, columnId],
    );
  }, []);

  const reset = useCallback(() => setColumns([]), []);

  return { columns, toggle, reset };
};
