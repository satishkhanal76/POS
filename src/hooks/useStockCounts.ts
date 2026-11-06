import { useEffect, useState } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { STOCK_UPDATED } from '../stock/events';

export default function useStockCounts(ids: string[], enabled: boolean) {
  const { stockOS } = useDatabase();
  const key = JSON.stringify(ids);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false, generation = 0;
    const load = () => {
      const request = ++generation;
      setCounts(null); setError(false);
      stockOS.getCounts(JSON.parse(key) as string[]).then(result => { if (!cancelled && request === generation) setCounts(result); })
        .catch(() => { if (!cancelled && request === generation) setError(true); });
    };
    load();
    window.addEventListener(STOCK_UPDATED, load); window.addEventListener('focus', load);
    return () => { cancelled = true; window.removeEventListener(STOCK_UPDATED, load); window.removeEventListener('focus', load); };
  }, [stockOS, key, enabled]);
  return { counts, error };
}
