import { useEffect, useState } from 'react';
import { DELETION_UPDATED } from '../deletion/state';
export default function useDeletionRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => { const refresh = () => setRevision(value => value + 1); window.addEventListener(DELETION_UPDATED, refresh); return () => window.removeEventListener(DELETION_UPDATED, refresh); }, []);
  return revision;
}
