import { useDatabase } from '../../contexts/DatabaseContext';
import { useClientGlobal } from '../../contexts/ClientGlobal';
import { useLocaleText } from '../../contexts/Locale';
import { IProductItem } from '../../models/ProductItem';
import PrintReportButton from '../Reports/PrintReportButton';
import printTable from '../Reports/printTable';
import itemColumns from './itemColumns';
import './ItemsPrintButton.css';

export default function ItemsPrintButton({ items, page, includeDeleted, disabled }: {
    items: IProductItem[]; page: number; includeDeleted: boolean; disabled: boolean;
}) {
    const t = useLocaleText(), { stockOS } = useDatabase(), { stockManagement } = useClientGlobal();
    return <PrintReportButton disabled={disabled || !items.length} help={t('PRINT_ITEMS_HELP')} createReport={async () => {
        // Capture the displayed page; never issue an all-items query to create this report.
        const visible = [...items];
        const counts = stockManagement ? await stockOS.getCounts(visible.map(item => item.getId())) : undefined;
        const title = t(stockManagement ? 'PRINT_STOCK_REPORT' : 'ITEMS_TITLE');
        return {
            title,
            subtitle: t('PRINT_CURRENT_INVENTORY'),
            range: { start: 0, end: 0, all: true, includeDeleted },
            note: t('PRINT_ITEMS_PAGE', { page, count: visible.length }),
            sections: [printTable(t('ITEMS_TITLE'), visible, itemColumns(t, stockManagement, counts))],
        };
    }}/>;
}
