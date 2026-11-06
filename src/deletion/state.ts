export interface Deletable { deletedAt?: number }
export const isDeleted = (record: unknown): boolean => !!(record && typeof record === 'object' && (record as Deletable).deletedAt);
export const DELETION_UPDATED = 'deletion:updated';
