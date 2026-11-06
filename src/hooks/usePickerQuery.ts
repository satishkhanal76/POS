import { useCallback, useEffect, useRef, useState } from 'react';
import useDeletionRevision from './useDeletionRevision';
import { PickerOptions, PickerPage } from '../pickers/types';

/** Debounced database search with generation guards for close/reopen, typing and load-more races. */
export default function usePickerQuery<T extends { getId: () => string }>(
  open: boolean,
  load: (options: PickerOptions) => Promise<PickerPage<T>>,
  limit: number,
  recentFirst: boolean,
  purchase = false,
) {
  const [query, setQuery] = useState(''),
    [retry, setRetry] = useState(0);
  const [state, setState] = useState<{
    rows: T[];
    hasMore: boolean;
    loading: boolean;
    loadingMore: boolean;
    error: boolean;
  }>({ rows: [], hasMore: false, loading: false, loadingMore: false, error: false });
  const revision = useDeletionRevision(),
    generation = useRef(0),
    inFlight = useRef(false),
    active = useRef<PickerOptions | null>(null);
  const invalidate = useCallback(() => ++generation.current, []);
  useEffect(() => {
    const current = invalidate();
    inFlight.current = false;
    active.current = null;
    if (!open) {
      setQuery('');
      setState({ rows: [], hasMore: false, loading: false, loadingMore: false, error: false });
      return;
    }
    const options = { query, limit, recentFirst, purchase, offset: 0, now: Date.now() };
    active.current = options;
    setState({ rows: [], hasMore: false, loading: true, loadingMore: false, error: false });
    const timer = setTimeout(
      () => {
        void load(options)
          .then((result) => {
            if (generation.current === current)
              setState({ ...result, loading: false, loadingMore: false, error: false });
          })
          .catch(() => {
            if (generation.current === current)
              setState({
                rows: [],
                hasMore: false,
                loading: false,
                loadingMore: false,
                error: true,
              });
          });
      },
      query.trim() ? 150 : 0,
    );
    return () => {
      clearTimeout(timer);
      invalidate();
    };
  }, [open, load, query, limit, recentFirst, purchase, revision, retry, invalidate]);
  const loadMore = async () => {
    if (inFlight.current || state.loading || !state.hasMore || !active.current) return;
    inFlight.current = true;
    const current = generation.current;
    setState((value) => ({ ...value, loadingMore: true, error: false }));
    try {
      const result = await load({ ...active.current, offset: state.rows.length });
      if (current === generation.current)
        setState((value) => ({
          rows: [
            ...value.rows,
            ...result.rows.filter(
              (row) => !value.rows.some((previous) => previous.getId() === row.getId()),
            ),
          ],
          hasMore: result.hasMore,
          loading: false,
          loadingMore: false,
          error: false,
        }));
    } catch {
      if (current === generation.current)
        setState((value) => ({ ...value, loadingMore: false, error: true }));
    } finally {
      if (current === generation.current) inFlight.current = false;
    }
  };
  return { ...state, query, setQuery, loadMore, retry: () => setRetry((value) => value + 1) };
}
