import { ReactNode } from 'react';
import { DashboardRange } from '../dashboard/period';
export interface PrintableSection { title: string; columns: string[]; rows: ReactNode[][] }
export interface PrintableReport { title: string; range?: DashboardRange | null; note?: string; sections: PrintableSection[] }
