import { openDB, type IDBPDatabase } from 'idb';
import type { Conversation, UploadedFile, AppSettings } from '@/types';

const DB_NAME = 'privategpt-zero';
// v3: settings store switched to out-of-line keys (no keyPath) — fixes save/load
const DB_VERSION = 3;

interface LocalLLMDB {
  conversations: Conversation;
  files: UploadedFile;
  settings: AppSettings;
}

let dbInstance: IDBPDatabase<LocalLLMDB> | null = null;

async function getDB(): Promise<IDBPDatabase<LocalLLMDB>> {
  if (dbInstance) return dbInstance;

  const wasOldVersion = (await indexedDB.databases().catch(() => [])).find(
    (db) => db.name === DB_NAME,
  )?.version;

  dbInstance = await openDB<LocalLLMDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      // Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
        convStore.createIndex('updatedAt', 'updatedAt');
      }

      // Files store
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }

      // Settings store — out-of-line key (not keyPath) so we can store any shape
      // v3 migration: drop the old keyPath-based store if it exists
      if (db.objectStoreNames.contains('settings')) {
        db.deleteObjectStore('settings');
      }
      db.createObjectStore('settings');
    },
  });

  // If we just upgraded from a v2 DB, try to salvage the user's old settings record
  // (it was stored under key 'app-settings' with keyPath 'id').
  if (wasOldVersion !== undefined && wasOldVersion < DB_VERSION) {
    try {
      const existing = await dbInstance.get('settings', SETTINGS_ID);
      if (!existing) {
        // Open the v2 DB on its own version handle to read the old record
        const oldDb = await openDB<any>(DB_NAME, wasOldVersion);
        try {
          const oldRecord = await oldDb.get('settings', SETTINGS_ID);
          if (oldRecord) {
            // Strip the `id` field added by the v2 keyPath schema
            const { id: _drop, ...rest } = oldRecord;
            await dbInstance.put('settings', rest, SETTINGS_ID);
          }
        } finally {
          oldDb.close();
        }
      }
    } catch (err) {
      console.warn('Settings migration skipped:', err);
    }
  }

  return dbInstance;
}

// ========== Conversations ==========

export async function saveConversation(conversation: Conversation): Promise<void> {
  const db = await getDB();
  await db.put('conversations', conversation);
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDB();
  return db.get('conversations', id);
}

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('conversations', 'updatedAt');
  return all.reverse(); // Most recent first
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('conversations', id);
}

export async function clearAllConversations(): Promise<void> {
  const db = await getDB();
  await db.clear('conversations');
}

// ========== Files ==========

export async function saveFile(file: UploadedFile): Promise<void> {
  const db = await getDB();
  await db.put('files', file);
}

export async function getFile(id: string): Promise<UploadedFile | undefined> {
  const db = await getDB();
  return db.get('files', id);
}

export async function getAllFiles(): Promise<UploadedFile[]> {
  const db = await getDB();
  return db.getAll('files');
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('files', id);
}

// ========== Settings ==========

const SETTINGS_ID = 'app-settings';

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  // Out-of-line key: pass key as second arg
  await db.put('settings', settings, SETTINGS_ID);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  const db = await getDB();
  return db.get('settings', SETTINGS_ID);
}