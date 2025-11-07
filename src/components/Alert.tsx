import React from 'react';
import styles from './Alert.module.css';

interface AlertProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <div className={`${styles.alert} ${styles[type]}`}>
      <p>{message}</p>
      {onClose && (
        <button onClick={onClose} className={styles.closeButton}>
          &times;
        </button>
      )}
    </div>
  );
};

export default Alert;
