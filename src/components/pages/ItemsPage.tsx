import useDeletedVisibility from '../../hooks/useDeletedVisibility';
import DeletedVisibility from '../utils/DeletedVisibility';
import { useLocaleText } from '../../contexts/Locale';
import ItemEditForm from "../Items/ItemEditForm";
import PageHeader from "../Layout/PageHeader";
import React, { useEffect, useCallback, useState } from 'react'
import ItemAddForm from '../Items/ItemAddForm'
import { IProductItem } from '../../models/ProductItem'
import ItemsView from '../Items/ItemsView'
import { useDatabase } from '../../contexts/DatabaseContext'
import { useLocale } from '../../contexts/Locale'
import { MdAdd } from 'react-icons/md'



const ItemsPage = () => {
  const t = useLocaleText();
  const { itemOS } = useDatabase();
  const { includeDeleted } = useDeletedVisibility();

  
  const [isAddModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<IProductItem | null>(null);
  const [items, setItems] = useState<IProductItem[]>([]);
  const text = useLocale();

  

  const updateItems = useCallback(() => {
    void itemOS.getAll(undefined, includeDeleted).then(setItems);
  }, [itemOS, includeDeleted]);

  useEffect(() => {
    updateItems();
  }, [updateItems])

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
      <PageHeader title={text.ITEMS_TITLE} actions={<button type="button" className="page-add-button" onClick={() => setIsModalOpen(true)} aria-label={t('ITEM_FORM_TITLE')} title={t('ITEM_FORM_TITLE')}><MdAdd aria-hidden="true" /></button>} />
      <DeletedVisibility />
      <ItemsView onDeleted={updateItems} onEdit={setEditing} handleDelete={() => {}} items={items}></ItemsView>
    </>
  )
}

export default ItemsPage