import { useId } from 'react';
import useDeletedVisibility from '../../hooks/useDeletedVisibility';
import { useLocaleText } from '../../contexts/Locale';
import './DeletedVisibility.css';
export default function DeletedVisibility() {
  const t = useLocaleText();
  const id = useId();
  const visibility = useDeletedVisibility();
  if (!visibility.enabled) return null;
  return <fieldset className="deleted-visibility"><legend>{t('DELETED_VISIBILITY')}</legend>
    <label><input type="radio" name={id} checked={!visibility.includeDeleted} onChange={() => visibility.change(false)} />{t('DELETED_ACTIVE_ONLY')}</label>
    <label><input type="radio" name={id} checked={visibility.includeDeleted} onChange={() => visibility.change(true)} />{t('DELETED_INCLUDE')}</label>
  </fieldset>;
}
