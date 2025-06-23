import { useLocale } from "../../contexts/Locale";
import Price from "./Price";
import { IProductItem } from "../../models/ProductItem";
import "./ItemsView.css";
import { useEffect, useState } from "react";
import  { useDatabase } from "../../contexts/DatabaseContext";
import ItemsController from "../../controllers/ItemsController";
interface ItemsViewProps {
  items: IProductItem[];

  // handleDelete: (item: IProductItem) => void;
}


const ItemsView = ({ items }: ItemsViewProps) => {
  
  
  const { itemOS } = useDatabase();
  
  const itemController = new ItemsController(itemOS);

  const handleDelete = async (item: IProductItem) => {
    const deletedItem = await itemController.deleteItem(item);
  }
  
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
