import { openDB, type IDBPDatabase } from 'idb';

import supabase from '@/lib/supabase/browser';
import { fastHash } from '@/lib/utils/hash';

import type { Database } from '@/lib/database.types';
import type { PostEditorFormData } from '@/lib/stores/post-editor-v2-store';

// Type aliases
type Json = Database['public']['Tables']['editor_drafts']['Row']['metadata'];
type DraftInsert = Database['public']['Tables']['editor_drafts']['Insert'];
type DraftRow = Database['public']['Tables']['editor_drafts']['Row'];

// Narrow DraftRow['metadata'] to the shape that contains formData
function hasFormData(
  meta: DraftRow['metadata'],
): meta is Json & { formData: Json } {
  return Boolean(
    meta &&
      typeof meta === 'object' &&
      'formData' in meta &&
      !Array.isArray(meta),
  );
}

interface LocalDraft {
  id: string;
  userId: string;
  tenantId: string;
  formData: PostEditorFormData;
  contentHash: string;
  lastSavedAt: number;
  syncedAt?: number;
  pendingSync: boolean;
}

// Constants
const DB_NAME = 'post-drafts';
const DB_VERSION = 1;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_DRAFTS_TO_KEEP = 50;
const SYNC_DELAY_MS = 100;

// Debug logging only in development
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

class DraftService {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private supabase = supabase;

  // Initialize IndexedDB
  private async initDB(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create drafts store with indexes
        if (!db.objectStoreNames.contains('drafts')) {
          const store = db.createObjectStore('drafts', { keyPath: 'id' });
          store.createIndex('userId', 'userId');
          store.createIndex('lastSavedAt', 'lastSavedAt');
          store.createIndex('pendingSync', 'pendingSync');
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });

    // Initialize metadata
    const tx = this.db.transaction('metadata', 'readwrite');
    const existing = await tx.objectStore('metadata').get('config');
    if (!existing) {
      await tx.objectStore('metadata').put({
        key: 'config',
        lastCleanup: Date.now(),
        version: 1,
      });
    }
  }

  // Ensure DB is initialized
  private async ensureDB(): Promise<IDBPDatabase> {
    this.initPromise ??= this.initDB();
    await this.initPromise;
    return this.db!;
  }

  // Generate content hash for deduplication
  generateContentHash(
    contentJson: unknown,
    title: string,
    subtitle: string,
  ): string {
    const combined = JSON.stringify(contentJson) + title + subtitle;
    return fastHash(combined).toString();
  }

  // Save draft locally with content hash check
  async saveDraftLocal(
    postId: string,
    userId: string,
    tenantId: string,
    formData: PostEditorFormData,
  ): Promise<{ saved: boolean; hash: string; skipped?: boolean }> {
    try {
      const db = await this.ensureDB();
      const contentHash = this.generateContentHash(
        formData.contentJson ?? {},
        formData.title || '',
        formData.subtitle || '',
      );

      // Check if content has changed
      const existing = (await db.get('drafts', postId)) as
        | LocalDraft
        | undefined;
      if (existing?.contentHash === contentHash) {
        return { saved: false, hash: contentHash, skipped: true };
      }

      await db.put('drafts', {
        id: postId,
        userId,
        tenantId,
        formData,
        contentHash,
        lastSavedAt: Date.now(),
        pendingSync: true,
      } satisfies LocalDraft);

      log('💾 Draft saved locally', {
        postId,
        hash: contentHash.slice(0, 8),
      });
      return { saved: true, hash: contentHash };
    } catch (error) {
      console.error('Failed to save draft locally:', error);
      throw error;
    }
  }

  // Sync draft to server
  async syncDraftToServer(
    postId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await this.ensureDB();
      const draft = (await db.get('drafts', postId)) as LocalDraft | undefined;

      if (!draft?.pendingSync) {
        return { success: true };
      }

      const metadata: Json = {
        formData: draft.formData as unknown as Json,
        selectedCollectives: (draft.formData.selected_collectives ??
          []) as Json,
        collectiveSharingSettings: (draft.formData
          .collective_sharing_settings ?? {}) as unknown as Json,
      };
      const { data, error } = await this.supabase
        .from('editor_drafts')
        .upsert(
          {
            id: draft.id,
            user_id: draft.userId,
            tenant_id: draft.tenantId,
            title: draft.formData.title || null,
            content: draft.formData.content || null,
            content_json: draft.formData.contentJson ?? null,
            has_legacy_html: Boolean(draft.formData.contentJson),
            content_hash: draft.contentHash,
            metadata,
            last_saved_at: new Date(draft.lastSavedAt).toISOString(),
          } satisfies DraftInsert,
          { onConflict: 'id' },
        )
        .select('metadata');

      if (error) {
        console.error('Failed to sync draft to server:', error);
        return { success: false, error: error.message };
      }

      // Determine canonical formData from server response (if returned)
      let canonicalFormData: PostEditorFormData = draft.formData;

      if (Array.isArray(data) && data.length > 0) {
        const [firstRow] = data;
        if (firstRow && 'metadata' in firstRow) {
          const { metadata } = firstRow;
          if (hasFormData(metadata)) {
            // We know metadata.formData is Json, cast back to PostEditorFormData
            canonicalFormData =
              metadata.formData as unknown as PostEditorFormData;
          }
        }
      }

      // Re-calculate hash if server returned updated formData
      const canonicalHash =
        canonicalFormData === draft.formData
          ? draft.contentHash
          : this.generateContentHash(
              canonicalFormData.contentJson ?? {},
              canonicalFormData.title || '',
              canonicalFormData.subtitle || '',
            );

      // Mark as synced and store canonical data
      await db.put('drafts', {
        ...draft,
        formData: canonicalFormData,
        contentHash: canonicalHash,
        syncedAt: Date.now(),
        pendingSync: false,
      });
      log('☁️ Draft synced to server', {
        postId,
        hash: canonicalHash.slice(0, 8),
      });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Sync error:', message);
      return { success: false, error: message };
    }
  }

  // Load draft (try server first if online, fallback to local)
  async loadDraft(
    postId: string,
    userId: string,
  ): Promise<PostEditorFormData | null> {
    // Try server first if online
    if (navigator.onLine) {
      try {
        const { data } = await this.supabase
          .from('editor_drafts')
          .select('*')
          .eq('id', postId)
          .eq('user_id', userId)
          .maybeSingle<DraftRow>();

        const meta = data?.metadata;
        let formData: PostEditorFormData | undefined;
        if (meta && hasFormData(meta)) {
          // We know meta.formData is Json, cast back to PostEditorFormData
          const { formData: jsonFormData } = meta;
          formData = jsonFormData as unknown as PostEditorFormData;
        }
        if (formData && data) {
          const { content_json } = data;
          if (content_json && typeof content_json === 'object') {
            formData = { ...formData, contentJson: content_json };
          }
        }
        if (formData) {
          log('📥 Draft loaded from server', { postId });
          return formData;
        }
      } catch (error) {
        log('Failed to load from server, trying local:', error);
      }
    }

    // Fallback to local
    try {
      const db = await this.ensureDB();
      const draft = (await db.get('drafts', postId)) as LocalDraft | undefined;

      if (draft?.userId === userId) {
        log('💾 Draft loaded from local storage', { postId });
        return draft.formData;
      }
    } catch (error) {
      console.error('Failed to load local draft:', error);
    }

    return null;
  }

  // Get all pending sync drafts
  async getPendingSyncDrafts(): Promise<string[]> {
    try {
      const db = await this.ensureDB();
      const allDrafts = (await db.getAll('drafts')) as LocalDraft[];
      return allDrafts.filter((d) => d.pendingSync).map((d) => d.id);
    } catch (error) {
      console.error('Failed to get pending drafts:', error);
      return [];
    }
  }

  // Cleanup old drafts
  async cleanupOldDrafts(): Promise<void> {
    try {
      const db = await this.ensureDB();
      const cutoffTime = Date.now() - CLEANUP_AGE_MS;

      const tx = db.transaction(['drafts', 'metadata'], 'readwrite');
      const drafts = (await tx
        .objectStore('drafts')
        .index('lastSavedAt')
        .getAll(IDBKeyRange.upperBound(cutoffTime))) as LocalDraft[];

      // Delete old drafts, keeping the most recent ones
      if (drafts.length > MAX_DRAFTS_TO_KEEP) {
        const toDelete = drafts.slice(0, -MAX_DRAFTS_TO_KEEP);
        await Promise.all(
          toDelete.map((d) => tx.objectStore('drafts').delete(d.id)),
        );
      }

      // Update cleanup timestamp
      await tx.objectStore('metadata').put({
        key: 'config',
        lastCleanup: Date.now(),
        version: 1,
      });

      await tx.done;
      log(
        `🧹 Cleaned up ${Math.max(0, drafts.length - MAX_DRAFTS_TO_KEEP)} old drafts`,
      );
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // Delete draft from both local and server
  async deleteDraft(postId: string): Promise<void> {
    try {
      await Promise.all([
        this.supabase.from('editor_drafts').delete().eq('id', postId),
        this.ensureDB().then((db) => db.delete('drafts', postId)),
      ]);
      log('🗑️ Draft deleted', { postId });
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }

  // Delete draft only from IndexedDB (used after server promotion)
  async deleteDraftLocal(postId: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.delete('drafts', postId);
      log('🗑️ Local draft deleted', { postId });
    } catch (error) {
      console.error('Failed to delete local draft:', error);
    }
  }

  // Sync all pending drafts
  async syncAllPending(): Promise<void> {
    const pendingIds = await this.getPendingSyncDrafts();

    for (const postId of pendingIds) {
      await this.syncDraftToServer(postId);
      await new Promise((resolve) => setTimeout(resolve, SYNC_DELAY_MS));
    }
  }
}

// Singleton instance
export const draftService = new DraftService();

// Initialize background tasks
if (typeof window !== 'undefined') {
  // Auto-sync on reconnection
  window.addEventListener('online', () => {
    log('🌐 Network reconnected, syncing drafts...');
    draftService.syncAllPending().catch((err) => console.error(err));
  });

  // Periodic cleanup
  {
    const lastCleanup = parseInt(
      window.localStorage.getItem('lastDraftCleanup') ?? '0',
      10,
    );

    if (Date.now() - lastCleanup > CLEANUP_INTERVAL_MS) {
      draftService
        .cleanupOldDrafts()
        .then(() =>
          window.localStorage.setItem(
            'lastDraftCleanup',
            Date.now().toString(),
          ),
        )
        .catch((err) => console.error(err));
    }
  }
}
