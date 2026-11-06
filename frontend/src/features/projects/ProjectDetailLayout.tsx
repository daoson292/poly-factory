import React, { useState } from 'react';
import { ProjectSummary } from '../../types';

interface ProjectDetailLayoutProps {
  project: ProjectSummary;
  activeTab: number; // 1 to 5
  onTabChange: (tabIndex: number) => void;
  onBack: () => void;
  children: React.ReactNode;
}

export const ProjectDetailLayout: React.FC<ProjectDetailLayoutProps> = ({
  project,
  activeTab,
  onTabChange,
  onBack,
  children
}) => {
  const tabs = [
    { id: 1, label: '1. Tổng Quan & Đăng Ký', icon: '📋' },
    { id: 2, label: '2. Thành Viên & Nghiệm Thu', icon: '👥' },
    { id: 3, label: '3. Hoạt Động GitHub', icon: '🐙' },
    { id: 4, label: '4. Kiểm Thử M17 & Bug', icon: '🧪' },
    { id: 5, label: '5. Release Gate & Chứng Chỉ', icon: '🎖️' }
  ];

  return (
    <div>
      {/* Header with Back button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack}
          style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#374151', color: '#cbd5e1', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '8px' }}
        >
          ← Quay lại danh sách
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff' }}>[{project.code}] {project.name}</h2>
          <span style={{ fontSize: '11px', backgroundColor: '#1e3a8a', color: '#bfdbfe', padding: '2px 8px', borderRadius: '4px' }}>
            {project.status}
          </span>
        </div>
      </div>

      {/* 5 Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', marginBottom: '20px', gap: '8px', overflowX: 'auto' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid #f97316' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === t.id ? '#f97316' : '#9ca3af',
              fontSize: '13px',
              fontWeight: activeTab === t.id ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {children}
      </div>
    </div>
  );
};
