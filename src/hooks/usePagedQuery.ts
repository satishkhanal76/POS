import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { PageOptions, PageResult } from '../database/Pagination';

/** URL-backed controls preserve the selected page when returning from detail views. */
export default function usePagedQuery<T>(query: (options: PageOptions) => Promise<PageResult<T>>) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const requestedSize = Number(params.get('pageSize'));
  const pageSize = [10, 25, 50, 100].includes(requestedSize) ? requestedSize : 10;
  const sort: PageOptions['sort'] = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const [state, setState] = useState<{ result: PageResult<T> | null; loading: boolean; error: boolean }>({ result: null, loading: true, error: false });
  useEffect(() => {
    let cancelled = false;
    setState({ result: null, loading: true, error: false });
    query({ page, pageSize, sort }).then(result => {
      if (!cancelled) setState({ result, loading: false, error: false });
    }).catch(() => { if (!cancelled) setState({ result: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [query, page, pageSize, sort]);
  const change = (changes: Partial<PageOptions>) => {
    setParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(changes.page ?? 1));
      if (changes.pageSize !== undefined) next.set('pageSize', String(changes.pageSize));
      if (changes.sort) next.set('sort', changes.sort);
      return next;
    }, { state: location.state });
  };
  return { ...state, page: state.result?.page ?? page, pageSize, sort, change };
}
