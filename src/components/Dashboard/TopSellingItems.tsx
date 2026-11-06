import Select from '../Forms/Select';
import CollapsibleReport from '../utils/CollapsibleReport';
import { useState } from 'react';
import { useLocaleText } from '../../contexts/Locale';
import { DashboardSummary } from '../../controllers/DashboardController';
import CustomTableView, { CustomTableColumn } from '../utils/CustomTableView';
import Price from '../Items/Price';
type Item = DashboardSummary['topItems'][number];
export default function TopSellingItems({ items }: { items: Item[] }) {
  const t = useLocaleText();
  const [sort, setSort] = useState<'quantity' | 'gross'>('quantity');
  const [limit, setLimit] = useState(10);
  const rows = [...items].sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name)).slice(0, limit);
  const columns: CustomTableColumn<Item>[] = [
    { key: 'name', header: t('DASH_ITEM'), render: row => row.name },
    { key: 'quantity', header: t('DASH_UNITS'), variant: 'numeric', render: row => row.quantity },
    { key: 'sales', header: t('DASH_SALE_COUNT'), variant: 'numeric', render: row => row.salesCount },
    { key: 'gross', header: t('DASH_ITEM_VALUE'), variant: 'numeric', render: row => <Price price={row.gross} /> },
  ];
  return <CollapsibleReport title={t('DASH_TOP_ITEMS')}><p className="dashboard-note">{t('DASH_TOP_ITEMS_HELP')}</p>
    <div className="dashboard-filters"><label>{t('DASH_RANK_BY')}<Select value={sort} onChange={value => setSort(value as 'quantity' | 'gross')}><option value="quantity">{t('DASH_UNITS')}</option><option value="gross">{t('DASH_ITEM_VALUE')}</option></Select></label>
      <label>{t('DASH_SHOW_ITEMS')}<Select value={limit} onChange={value => setLimit(Number(value))}>{[5, 10, 25, 50].map(count => <option key={count}>{count}</option>)}</Select></label>
    </div>
    <CustomTableView label={t('DASH_TOP_ITEMS')} emptyTitle={t('DASH_NO_ITEMS')} data={rows} columns={columns} rowKey={row => row.id} />
  </CollapsibleReport>;
}
