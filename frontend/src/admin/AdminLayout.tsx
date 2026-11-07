import React from 'react';

interface AdminLayoutProps {
  adminRole: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';
  activeSection: string;
  onNavigate: (section: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  adminRole,
  activeSection,
  onNavigate,
  children
}) => {
  const sections = [
    { key: 'dashboard', label: 'Giám Sát Phần Cứng', icon: '📈' },
    { key: 'console', label: 'PolyFactory Console', icon: '💻' },
    { key: 'users', label: 'Quản Lý Whitelist & EXP', icon: '👥' },
    { key: 'polyperms', label: 'Cây Quyền PolyPerms', icon: '🌳' },
    { key: 'cosmetics', label: 'Kho Vật Phẩm Trang Trí', icon: '🎨' },
    { key: 'audit', label: 'Nhật Ký Kiểm Toán (Audit)', icon: '📜' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#090d16', color: '#f3f4f6', fontFamily: 'sans-serif' }}>
      {/* Admin Sidebar */}
      <aside style={{ width: '250px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#f97316' }}>PolyFactory Admin</h2>
          </div>
          <div style={{ marginTop: '6px' }}>
            <span style={{ fontSize: '11px', backgroundColor: '#1e293b', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
              Vai trò: {adminRole}
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {sections.map((sec) => (
            <button
              key={sec.key}
              onClick={() => onNavigate(sec.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeSection === sec.key ? '#f97316' : 'transparent',
                color: activeSection === sec.key ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: activeSection === sec.key ? 'bold' : 'normal'
              }}
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '14px', fontSize: '11px', color: '#64748b' }}>
          Hệ thống bảo mật 3 cấp độ • v2.2.0
        </div>
      </aside>

      {/* Admin Content Area */}
      <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};
