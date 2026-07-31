import { useState, useEffect, useCallback } from 'react';

const FALLBACK_SETTINGS = {
  shopName: 'Maa Durga Jan Seva Kendra',
  shopOwner: 'Ramesh Kumar',
  shopPhone: '918707845206',
  shopEmail: 'info@cybercafe.com',
  shopAddress: 'Bindwaliya near ghazipur ghat, ghazipur uttar pradesh 233001',
  shopTimings: '24/7',
};

export function useSettings() {
  const [shopSettings, setShopSettings] = useState(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const text = await res.text();
      if (!text) throw new Error('Empty response');
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data?.message || 'Failed to load settings');
      setShopSettings(data || FALLBACK_SETTINGS);
    } catch (err) {
      console.error('Settings load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Auto-sync polling every 5 seconds for real-time updates
    const interval = setInterval(fetchSettings, 5000);

    // Instant event-driven sync
    const handleCustomEvent = () => fetchSettings();
    window.addEventListener('shop_settings_updated', handleCustomEvent);

    let bc;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('shop_settings_channel');
      bc.onmessage = () => fetchSettings();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('shop_settings_updated', handleCustomEvent);
      if (bc) bc.close();
    };
  }, [fetchSettings]);

  return { shopSettings, loading, refetch: fetchSettings };
}
