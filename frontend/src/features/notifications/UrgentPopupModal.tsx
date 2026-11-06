import React from 'react';
import { UrgentPopup } from '../../types';

interface UrgentPopupModalProps {
  popup: UrgentPopup | null;
  onAcknowledge: (popupId: string) => void;
}

export const UrgentPopupModal: React.FC<UrgentPopupModalProps> = ({
  popup,
  onAcknowledge
}) => {
  if (!popup) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#1f2937',
        border: '2px solid #ef4444',
        borderRadius: '14px',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '12px' }}>
          <span style={{ fontSize: '24px' }}>🚨</span>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>THÔNG BÁO KHẨN CẤP TỪ BAN CHỦ NHIỆM</h2>
        </div>

        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#ffffff' }}>{popup.title}</h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#d1d5db', lineHeight: 1.5 }}>
          {popup.content}
        </p>

        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '20px' }}>
          * Bạn bắt buộc phải xác nhận đã đọc thông báo này để tiếp tục thao tác trên hệ thống PolyFactory.
        </div>

        <button
          onClick={() => onAcknowledge(popup.id)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Tôi Đã Nắm Thông Tin
        </button>
      </div>
    </div>
  );
};
