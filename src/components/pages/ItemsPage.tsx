import PageHeader from "../Layout/PageHeader";
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

      <PageHeader title={text.ITEMS_TITLE} actions={<button type="button" className="page-add-button" onClick={() => setIsModalOpen(true)} aria-label="Add an item" title="Add an item"><MdAdd aria-hidden="true" /></button>} />
      <ItemsView handleDelete={handleDelete} items={items}></ItemsView>
    </>
  )
}

export default ItemsPage