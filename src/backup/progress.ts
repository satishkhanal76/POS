/** Counts records prepared for the ZIP; the browser handles the final file save. */
export interface BackupProgress {
  completed: number;
  total: number;
  phase: "preparing" | "packing" | "finalizing";
}
