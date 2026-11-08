import { useCallback, useRef, useState } from "react";

/** Prevent duplicate writes even when two events arrive before React renders. */
export default function useExclusiveAction() {
  const isBusy = useRef(false);
  const [busy, setBusy] = useState(false);
  const begin = useCallback(() => {
    if (isBusy.current) return false;
    isBusy.current = true;
    setBusy(true);
    return true;
  }, []);
  // Call in finally so both success and failure release the synchronous lock.
  const end = useCallback(() => {
    isBusy.current = false;
    setBusy(false);
  }, []);
  return { busy, isBusy, begin, end };
}
