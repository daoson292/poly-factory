import React from 'react';
import { UserProfile } from '../types';

interface WorkspacePwaLayoutProps {
  currentUser: UserProfile;
  activeTab: number; // 1 to 4
  onTabChange: (tabIndex: number) => void;
  children: React.ReactNode;
}

export const WorkspacePwaLayout: React.FC<WorkspacePwaLayoutProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  children
}) => {
  const tabs = [
    { id: 1, label: 'Bảng Tin', icon: '📢' },
    { id: 2, label: 'Điểm Danh', icon: '📷' },
    { id: 3, label: 'Dự Án', icon: '🚀' },
    { id: 4, label: 'Cá Nhân', icon: '👤' }
  ];

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f3f4f6', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top Bar */}
      <header style={{ padding: '12px 16px', backgroundColor: '#111827', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', color: '#f97316' }}>PolyFactory</span>
          <span style={{ fontSize: '11px', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>Lv.{currentUser.currentLevel}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>
          +{currentUser.currentExp} EXP
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '16px', paddingBottom: '76px', overflowY: 'auto' }}>
        {children}
      </main>

      {/* PWA 4 Bottom Tabs Navigation */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: '480px', margin: '0 auto', height: '62px', backgroundColor: '#111827', borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? '#f97316' : '#9ca3af',
              cursor: 'pointer',
              gap: '2px'
            }}
          >
            <span style={{ fontSize: '18px' }}>{tab.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: activeTab === tab.id ? 'bold' : 'normal' }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

// Prevent mobile Safari viewport scroll bounce on modal lock (fixes #12)
