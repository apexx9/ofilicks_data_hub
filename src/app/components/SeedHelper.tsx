import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

export function SeedHelper() {
  const [status, setStatus] = useState<'idle' | 'cleaning' | 'done'>('idle');

  // Manual cleanup trigger (hidden or dev-only usually, but exposing for this fix)
  // You can run: localStorage.setItem('force_cleanup', 'true') to trigger this
  useEffect(() => {
    const shouldCleanup = localStorage.getItem('force_cleanup');
    if (shouldCleanup) {
      cleanupDatabase();
      localStorage.removeItem('force_cleanup');
    }
  }, []);

  const cleanupDatabase = async () => {
    try {
      setStatus('cleaning');
      // For cleanup we need admin auth, which we don't have here easily.
      // So this helper might be limited.
      // However, the backend endpoint I made requires admin token.

      // If the user is logged in as admin, this will work.
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c20c3ad2/admin/reset-bundles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setStatus('done');
      window.location.reload();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  return null;
}
