import { createContext } from 'react';
import { DashboardRange } from '../dashboard/period';
export const ReportPrintContext = createContext<DashboardRange | null>(null);
