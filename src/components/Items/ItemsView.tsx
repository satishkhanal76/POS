import { useLocale } from "../../contexts/Locale";
import { IItem } from "../../model/Item";
import ItemsController from "../../controllers/ItemsController";
import { useDatabase } from "../../contexts/DatabaseContext";
import Price from "./Price";

interface ItemsViewProps {
  items: IItem[];

  handleDelete: (item: IItem) => void;
}

const ItemsView = ({ items, handleDelete }: ItemsViewProps) => {
  const text = useLocale();

  return (
    <>
      <h2 className="items-title">{text.ITEMS_TITLE}</h2>
      <div className="items-container">
        {items.map((item: IItem) => (
          <div className="item" key={item.getId()}>
            {item.getName()} <Price price={item.getPrice()}></Price>
            <button
              className="delete-button"
              onClick={() => handleDelete(item)}
            >
              {text.ITEM_DELETE_BUTTON}
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default ItemsView;
