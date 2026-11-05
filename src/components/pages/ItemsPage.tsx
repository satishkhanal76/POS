import ItemEditForm from "../Items/ItemEditForm";
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
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<IProductItem | null>(null);
  const [items, setItems] = useState<IProductItem[]>([]);
  const text = useLocale();

  

  const updateItems = () => {
    itemController.getAllItems().then(setItems);
  }

  const handleDelete = async (item: IProductItem) => {
    setError('');
    try {
      const deletedItem = await itemController.deleteItem(item);
      setItems(current => current.filter(entry => entry.getId() !== deletedItem?.getId()));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to delete item.'); }

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

      {editing && <ItemEditForm item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); updateItems(); }} />}
      <PageHeader title={text.ITEMS_TITLE} actions={<button type="button" className="page-add-button" onClick={() => setIsModalOpen(true)} aria-label="Add an item" title="Add an item"><MdAdd aria-hidden="true" /></button>} />
      {error && <p role="alert">{error}</p>}
      <ItemsView onEdit={setEditing} handleDelete={handleDelete} items={items}></ItemsView>
    </>
  )
}

export default ItemsPage