export interface SlashOption {
  label: string;
}

export const SLASH_OPTIONS: SlashOption[] = [
  { label: 'Image' },
  { label: 'Video' },
  { label: 'GIF' },
  { label: 'Equation' },
];

export function filterSlashOptions(query: string): SlashOption[] {
  if (!query) return SLASH_OPTIONS;
  const lower = query.toLowerCase();
  return SLASH_OPTIONS.filter((o) => o.label.toLowerCase().includes(lower));
}
