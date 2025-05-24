jest.mock('../../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}));

import {
  filterSlashOptions,
  SLASH_OPTIONS,
} from '../editor/plugins/SlashMenuPlugin';

describe('filterSlashOptions', () => {
  it('returns all options when query is empty', () => {
    expect(filterSlashOptions('')).toHaveLength(SLASH_OPTIONS.length);
  });

  it('filters options case-insensitively', () => {
    const opts = filterSlashOptions('image');
    expect(opts.length).toBeGreaterThan(0);
    opts.forEach((o: { label: string }) =>
      expect(o.label.toLowerCase()).toContain('image'),
    );
  });
});
