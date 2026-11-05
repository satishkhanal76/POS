import { useLocaleText } from '../../contexts/Locale';
import { useLocale } from "../../contexts/Locale";
import Price from "./Price";
import { IProductItem } from "../../models/ProductItem";
import "./ItemsView.css";
import { IItem } from "../../models/Item";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
interface ItemsViewProps {
  items: IProductItem[];
  onEdit?: (item: IProductItem) => void;
  handleDelete: (item: IItem) => void;
}


const ItemsView = ({ items, handleDelete, onEdit }: ItemsViewProps) => {
  const t = useLocaleText();
  const text = useLocale();


  const columns: CustomTableColumn<IProductItem>[] = [
    {key: "name", header: text.ITEMS_TABLE_HEADER_NAME, render: (item) => <>{item.getName()}</>},
    {key: "price", header: text.ITEMS_TABLE_HEADER_PRICE, variant: "numeric", render: (item) => <Price price={item.getAmount()} />},
    {key: "actions", header: t('UI_ACTIONS'), variant: "actions", 
      render: (item) => (
        <>
        {onEdit && <button type="button" aria-label={t('UI_EDIT_VALUE', { value0: item.getName() })} onClick={() => onEdit(item)}>{t('UI_EDIT')}</button>}
        <button type="button" className="table-delete" aria-label={t('UI_DELETE_VALUE', { value0: item.getName() })} onClick={() => handleDelete(item)}>{text.ITEM_DELETE_BUTTON}</button>
        </>
      )
    }
  ]

  return (
      <CustomTableView label={t('ITEMS_TITLE')} emptyTitle={t('UI_YOUR_CATALOG_STARTS_HERE')} emptyDescription={t('UI_USE_THE_ADD_BUTTON_ABOVE_TO_CREATE_YOUR_FIRST')} data={items} columns={columns} rowKey={(item) => item.getId()} />
  );
};

export default ItemsView;
