const key = (database: string) => `pos.restore-in-progress:${database}`;
export function markRestoreStarted(database: string) {
  try {
    localStorage.setItem(key(database), new Date().toISOString());
  } catch {
    /* Progress markers must not prevent a restore. */
  }
}
export function clearRestoreStatus(database: string) {
  try {
    localStorage.removeItem(key(database));
  } catch {
    /* Storage can be unavailable. */
  }
}
export function hasUnfinishedRestore(database: string) {
  try {
    return localStorage.getItem(key(database)) !== null;
  } catch {
    return false;
  }
}
