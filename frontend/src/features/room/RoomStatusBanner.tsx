import React from 'react';
import { RoomConfigState } from '../../types';

interface RoomStatusBannerProps {
  roomState: RoomConfigState;
  canManageRoom?: boolean;
  onUpdateStatus?: (newStatus: 'OPEN' | 'MOVED' | 'CLOSED', note?: string) => void;
}

export const RoomStatusBanner: React.FC<RoomStatusBannerProps> = ({
  roomState,
  canManageRoom = false,
  onUpdateStatus
}) => {
  const getStatusColor = () => {
    switch (roomState.status) {
      case 'OPEN':
        return { bg: '#064e3b', border: '#059669', text: '#6ee7b7', label: 'ĐANG MỞ CỬA BÌNH THƯỜNG' };
      case 'MOVED':
        return { bg: '#78350f', border: '#d97706', text: '#fde68a', label: 'TẠM CHUYỂN PHÒNG' };
      case 'CLOSED':
        return { bg: '#7f1d1d', border: '#dc2626', text: '#fca5a5', label: 'PHÒNG ĐANG ĐÓNG CỬA' };
    }
  };

  const currentTheme = getStatusColor();

  return (
    <div style={{
      backgroundColor: currentTheme.bg,
      border: `1px solid ${currentTheme.border}`,
      borderRadius: '10px',
      padding: '16px 20px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px'
        }}>
          {roomState.status === 'OPEN' ? '🚪' : roomState.status === 'MOVED' ? '🔄' : '🔒'}
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: currentTheme.text, letterSpacing: '0.05em' }}>
            PHÒNG XƯỞNG: {roomState.currentRoom} • {currentTheme.label}
          </div>
          <div style={{ fontSize: '13px', color: '#f3f4f6', marginTop: '2px' }}>
            {roomState.note || (roomState.status === 'OPEN' ? 'Các ca trực diễn ra bình thường theo lịch đăng ký.' : 'Ca trực bị hủy tự động (CANCELLED_BY_ROOM).')}
          </div>
          {roomState.revertAt && (
            <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '4px' }}>
              ⏱️ Tự động hoàn nguyên P407 lúc: {new Date(roomState.revertAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {canManageRoom && onUpdateStatus && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onUpdateStatus('OPEN')}
            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#059669', color: '#fff', cursor: 'pointer' }}
          >
            Mở P407
          </button>
          <button
            onClick={() => onUpdateStatus('MOVED', 'Tạm dời sang P405 do bảo trì máy chiếu')}
            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#d97706', color: '#fff', cursor: 'pointer' }}
          >
            Đổi Phòng
          </button>
          <button
            onClick={() => onUpdateStatus('CLOSED', 'Xưởng đóng do sự cố điện')}
            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer' }}
          >
            Đóng Cửa
          </button>
        </div>
      )}
    </div>
  );
};
