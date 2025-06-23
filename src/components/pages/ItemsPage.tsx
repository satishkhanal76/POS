import React, { useEffect, useMemo, useState } from 'react'
import ItemAddForm from '../Items/ItemAddForm'
import { IProductItem } from '../../models/ProductItem'
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
      {isAddModalOpen && <ItemAddForm onClose={onClose} onAddItem={() => {
        updateItems();
        setIsModalOpen(false);
      }}/>}
      <Button onClick={() => setIsModalOpen(true)}>Add New Item</Button>
      <ItemsView items={items}></ItemsView>
    </>
  )
}

export default ItemsPage