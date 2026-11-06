export interface PickerOptions {
    query: string;
    limit: number;
    offset: number;
    recentFirst: boolean;
    purchase: boolean;
    now?: number;
}
export interface PickerPage<T> { rows: T[]; hasMore: boolean }
export interface Usage { count: number; latest: number }
export interface PickerUsage { items: Map<string, Usage>; contacts: Map<string, Usage> }
