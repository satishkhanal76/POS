import { useLocale } from "../../contexts/Locale";
import Price from "./Price";
import { IProductItem } from "../../models/ProductItem";
import "./ItemsView.css";
import { IItem } from "../../models/Item";
import CustomTableView, { CustomTableColumn, CustomTableProps } from "../utils/CustomTableView";
interface ItemsViewProps {
  items: IProductItem[];
  handleDelete: (item: IItem) => void;
}


const ItemsView = ({ items, handleDelete }: ItemsViewProps) => {
  const text = useLocale();


  const columns: CustomTableColumn<IItem>[] = [
    {key: "name", header: text.ITEMS_TABLE_HEADER_NAME, render: (item) => <>{item.getName()}</>},
    {key: "price", header: text.ITEMS_TABLE_HEADER_PRICE, render: (item) => <Price price={item.getAmount()} />},
    {key: "actions", header: "", 
      render: (item) => (
        <button className="btn" onClick={() => handleDelete(item)}>{text.ITEM_DELETE_BUTTON}</button>
      )
    }
  ]

  return (
      <CustomTableView data={items} columns={columns} rowKey={(item) => item.getId()} />
  );
};

export default ItemsView;
