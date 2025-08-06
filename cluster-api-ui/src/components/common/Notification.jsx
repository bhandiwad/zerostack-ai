import React from 'react';

const Notification = ({ notification, onClose }) => {
  if (!notification.show) return null;

  const getNotificationStyle = () => {
    switch (notification.type) {
      case 'success':
        return 'notification-success';
      case 'error':
        return 'notification-error';
      case 'warning':
        return 'notification-warning';
      default:
        return 'notification-info';
    }
  };

  return (
    <div className={`notification ${getNotificationStyle()}`}>
      <div className="notification-content">
        <span className="notification-message">{notification.message}</span>
        <button onClick={onClose} className="notification-close">×</button>
      </div>
    </div>
  );
};

export default Notification;
