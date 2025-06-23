import React from 'react';
import './FullScreenModal.css';



interface FullScreenModalProps {
  onClose: () => void;
  children?: React.ReactNode;
}

const FullScreenModal: React.FC<FullScreenModalProps> = ({ onClose, children }) => {

  return (
    <div className="overlay">
      <div className="modal">
        <button onClick={onClose} className="closeButton">
          &times;
        </button>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FullScreenModal;