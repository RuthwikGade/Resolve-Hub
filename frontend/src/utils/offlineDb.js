import { openDB } from 'idb';

const DB_NAME    = 'resolvehub-offline';
const DB_VERSION = 1;

function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('complaintDrafts')) {
        db.createObjectStore('complaintDrafts', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingSync')) {
        db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

// ─── Complaint Drafts ────────────────────────────────────────

export async function saveDraft(complaint) {
  const db = await getDb();
  const record = { ...complaint, savedAt: new Date().toISOString() };
  const id = await db.add('complaintDrafts', record);
  return { ...record, id };
}

export async function getDrafts() {
  const db = await getDb();
  return db.getAll('complaintDrafts');
}

export async function getDraft(id) {
  const db = await getDb();
  return db.get('complaintDrafts', id);
}

export async function deleteDraft(id) {
  const db = await getDb();
  return db.delete('complaintDrafts', id);
}

export async function clearDrafts() {
  const db = await getDb();
  return db.clear('complaintDrafts');
}

// ─── Pending Sync Queue ──────────────────────────────────────

export async function addPendingAction(action) {
  const db = await getDb();
  const record = { ...action, queuedAt: new Date().toISOString() };
  return db.add('pendingSync', record);
}

export async function getPendingActions() {
  const db = await getDb();
  return db.getAll('pendingSync');
}

export async function deletePendingAction(id) {
  const db = await getDb();
  return db.delete('pendingSync', id);
}

export async function clearPendingActions() {
  const db = await getDb();
  return db.clear('pendingSync');
}
