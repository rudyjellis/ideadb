import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function useApiKey() {
  const { user } = useAuth();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkApiKey();
  }, [user]);

  const checkApiKey = async () => {
    if (!user) {
      setHasApiKey(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setHasApiKey(!!data);
    } catch (err) {
      console.error('Error checking API key:', err);
      setHasApiKey(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasApiKey, loading, refresh: checkApiKey };
}
