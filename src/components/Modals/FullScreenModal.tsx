import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';
import { useLocale } from '../../contexts/Locale';
import './FullScreenModal.css';

interface FullScreenModalProps {
  title?: string;
  onClose: () => void;
  children?: ReactNode;
}

/** Shared dialog shell for forms and selection lists. */
export default function FullScreenModal({ title, onClose, children }: FullScreenModalProps) {
  const { FULL_SCREEN_MODAL_TITLE } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    element?.querySelector<HTMLInputElement>('input:not([type=submit]):not([type=hidden])')?.focus();
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return createPortal(
    <dialog ref={dialog} className="pos-modal" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <header className="pos-modal-header">
        <h2 id={titleId}>{title || FULL_SCREEN_MODAL_TITLE}</h2>
        <button type="button" className="pos-modal-close" onClick={onClose} aria-label="Close dialog"><MdClose aria-hidden="true" /></button>
      </header>
      <div className="pos-modal-content">{children}</div>
    </dialog>, document.body
  );
}
