import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function SeedHelper() {
  const [isSeeded, setIsSeeded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAndSeed();
  }, []);

  const checkAndSeed = async () => {
    try {
      // Check if already seeded
      const seededKey = 'ofilicks_seeded';
      const alreadySeeded = localStorage.getItem(seededKey);

      if (alreadySeeded) {
        setIsSeeded(true);
        setIsLoading(false);
        return;
      }

      // Seed the database
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c20c3ad2/seed`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        localStorage.setItem(seededKey, 'true');
        setIsSeeded(true);
      }
    } catch (error) {
      console.error('Seed error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up Ofilicks Data Hub...</p>
        </div>
      </div>
    );
  }

  return null;
}
