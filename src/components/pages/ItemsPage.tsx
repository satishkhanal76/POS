import React, { useEffect, useMemo, useState } from 'react'
import ItemAddForm from '../Items/ItemAddForm'
import { IProductItem } from '../../models/ProductItem'
import ItemsView from '../Items/ItemsView'
import { useDatabase } from '../../contexts/DatabaseContext'
import ItemsController from '../../controllers/ItemsController'
import { useLocale } from '../../contexts/Locale'
import { MdAdd } from 'react-icons/md'



const ItemsPage = () => {
  const { itemOS } = useDatabase();
  const itemController = new ItemsController(itemOS);

  
  const [isAddModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [items, setItems] = useState<IProductItem[]>([]);
  const text = useLocale();

  

  const updateItems = () => {
    itemController.getAllItems().then(setItems);
  }

  const handleDelete = async (item: IProductItem) => {
    const deletedItem = await itemController.deleteItem(item);
    setItems(i => i.filter(_ => _.getId() !== deletedItem?.getId()));

  }

  useEffect(() => {
    updateItems();
  }, [])

  const onClose = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      {isAddModalOpen && <ItemAddForm onClose={onClose} onAddItem={() => {
        updateItems();
        setIsModalOpen(false);
      }}/>}

      <div className="page-title-container">
        <h2>{text.ITEMS_TITLE}</h2>
        <span onClick={() => setIsModalOpen(true)} title={text.ITEM_FORM_TITLE}>
          <MdAdd />
        </span>
      </div>
      <ItemsView handleDelete={handleDelete} items={items}></ItemsView>
    </>
  )
}

export default ItemsPage