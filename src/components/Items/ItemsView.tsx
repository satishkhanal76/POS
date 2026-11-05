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
  const text = useLocale();


  const columns: CustomTableColumn<IProductItem>[] = [
    {key: "name", header: text.ITEMS_TABLE_HEADER_NAME, render: (item) => <>{item.getName()}</>},
    {key: "price", header: text.ITEMS_TABLE_HEADER_PRICE, variant: "numeric", render: (item) => <Price price={item.getAmount()} />},
    {key: "actions", header: "Actions", variant: "actions", 
      render: (item) => (
        <>
        {onEdit && <button type="button" aria-label={`Edit ${item.getName()}`} onClick={() => onEdit(item)}>Edit</button>}
        <button type="button" className="table-delete" aria-label={`Delete ${item.getName()}`} onClick={() => handleDelete(item)}>{text.ITEM_DELETE_BUTTON}</button>
        </>
      )
    }
  ]

  return (
      <CustomTableView label="Items" emptyTitle="Your catalog starts here" emptyDescription="Use the add button above to create your first item." data={items} columns={columns} rowKey={(item) => item.getId()} />
  );
};

export default ItemsView;
