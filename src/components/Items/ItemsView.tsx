import { useLocale } from "../../contexts/Locale";
import Price from "./Price";
import { IProductItem } from "../../models/ProductItem";
import "./ItemsView.css";
interface ItemsViewProps {
  items: IProductItem[];

  handleDelete: (item: IProductItem) => void;
}

const ItemsView = ({ items, handleDelete }: ItemsViewProps) => {
  const text = useLocale();

  return (
    <div className="items-container">
      <h2 className="items-title">{text.ITEMS_TITLE}</h2>
      <div className="items">
        {items.map((item: IProductItem) => (
          <div className="item" key={item.getId()}>
            {item.getName()} <Price price={item.getAmount()}></Price>
            <button
              className="delete-button"
              onClick={() => handleDelete(item)}
            >
              {text.ITEM_DELETE_BUTTON}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemsView;
