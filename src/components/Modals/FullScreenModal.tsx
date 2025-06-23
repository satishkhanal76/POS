import React from 'react';
import './FullScreenModal.css';
import { MdClose } from 'react-icons/md';
import { useLocale } from '../../contexts/Locale';



interface FullScreenModalProps {
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
}

const FullScreenModal: React.FC<FullScreenModalProps> = ({title, onClose, children }) => {
  const {FULL_SCREEN_MODAL_TITLE} = useLocale();
  return (
    <div className="modal-wrapper">
      <div className="modal-conatiner">
        <div className="modal-title-container">
          <h4>{title || FULL_SCREEN_MODAL_TITLE}</h4>
          <span onClick={onClose}><MdClose/></span>
        </div>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FullScreenModal;