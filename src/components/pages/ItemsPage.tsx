import React, { useEffect, useMemo, useState } from 'react'
import Items from '../Items/Items'
import FullScreenModal from '../Modals/FullScreenModal'
import ItemAddForm from '../Items/ItemAddForm'
import ProductItem, { IProductItem } from '../../models/ProductItem'
import ItemsView from '../Items/ItemsView'
import { useDatabase } from '../../contexts/DatabaseContext'
import ItemsController from '../../controllers/ItemsController'
import { useLocale } from '../../contexts/Locale'
import Button from '../Button'


const ItemsPage = () => {
  const [isAddModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [items, setItems] = useState<IProductItem[]>([]);
  const { itemOS } = useDatabase();
  
  const itemController = new ItemsController(itemOS);

  const updateItems = () => {
    itemController.getAllItems().then(setItems);
  }

  useEffect(() => {
    updateItems();
  }, [])

  const onClose = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      {/* <Items></Items> */}
      <Button onClick={() => setIsModalOpen(true)}>Add Item</Button>
      {isAddModalOpen && <ItemAddForm onClose={onClose} onAddItem={() => {
        updateItems();
        setIsModalOpen(false);
      }}/>}
      <ItemsView items={items}></ItemsView>
    </>
  )
}

export default ItemsPage