import { useState, useEffect, useCallback } from 'react';
import { saveDraft as dbSaveDraft, getDrafts as dbGetDrafts, deleteDraft as dbDeleteDraft, clearDrafts as dbClearDrafts } from '../utils/offlineDb';
import api from '../api/client';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveDraft = useCallback(async (complaint) => {
    return dbSaveDraft(complaint);
  }, []);

  const getDrafts = useCallback(async () => {
    return dbGetDrafts();
  }, []);

  const deleteDraft = useCallback(async (id) => {
    return dbDeleteDraft(id);
  }, []);

  const syncDrafts = useCallback(async () => {
    if (!navigator.onLine) return { synced: 0, failed: 0 };

    const drafts = await dbGetDrafts();
    let synced = 0;
    let failed = 0;

    for (const draft of drafts) {
      try {
        const { id, savedAt, ...complaintData } = draft;
        await api.post(`/complaints`, complaintData);
        await dbDeleteDraft(id);
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncDrafts();
    }
  }, [isOnline, syncDrafts]);

  return {
    isOnline,
    saveDraft,
    getDrafts,
    deleteDraft,
    syncDrafts,
  };
}

export default useOffline;
