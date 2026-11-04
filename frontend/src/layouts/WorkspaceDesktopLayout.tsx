import React from 'react';
import { UserProfile } from '../types';

interface WorkspaceDesktopLayoutProps {
  currentUser: UserProfile;
  activeMenu: string;
  onNavigate: (menuKey: string) => void;
  children: React.ReactNode;
}

export const WorkspaceDesktopLayout: React.FC<WorkspaceDesktopLayoutProps> = ({
  currentUser,
  activeMenu,
  onNavigate,
  children
}) => {
  const isAlumni = currentUser.status === 'ALUMNI';

  const menuItems = [
    { key: 'dashboard', label: 'Bảng Tin & Lịch 6 Ca', icon: '📅' },
    { key: 'attendance', label: 'Điểm Danh QR & GPS', icon: '📍' },
    { key: 'training', label: 'Lộ Trình Nhập Môn', icon: '📚' },
    { key: 'projects', label: 'Dự Án Thực Chiến (5 Tab)', icon: '🚀' },
    { key: 'profile', label: 'Hồ Sơ & Gamification', icon: '🏆' },
    { key: 'directory', label: 'Danh Bạ 6 Công Pháp', icon: '👥' },
    { key: 'reports', label: 'Báo Cáo & Xuất Excel', icon: '📊' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#090d16', color: '#f3f4f6', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#111827', borderRight: '1px solid #1f2937', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px' }}>
            PF
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#f97316' }}>PolyFactory</h2>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>v2.2.0 • Web PC</span>
          </div>
        </div>

        {isAlumni && (
          <div style={{ backgroundColor: '#374151', color: '#fbbf24', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
            🎖️ Chế độ <strong>Cựu thành viên (ALUMNI)</strong>: Chỉ đọc thông tin.
          </div>
        )}

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeMenu === item.key ? '#f97316' : 'transparent',
                color: activeMenu === item.key ? '#ffffff' : '#9ca3af',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: activeMenu === item.key ? '600' : 'normal',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Mini Profile */}
        <div style={{ borderTop: '1px solid #1f2937', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {currentUser.fullName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.fullName}</div>
            <div style={{ fontSize: '11px', color: '#f97316' }}>Lv.{currentUser.currentLevel} • {currentUser.role}</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};
