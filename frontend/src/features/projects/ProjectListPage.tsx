import React from 'react';
import { ProjectSummary } from '../../types';

interface ProjectListPageProps {
  projects: ProjectSummary[];
  onSelectProject: (projectId: string) => void;
  onCreateProject?: () => void;
}

export const ProjectListPage: React.FC<ProjectListPageProps> = ({
  projects,
  onSelectProject,
  onCreateProject
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff' }}>Danh Sách Dự Án Thực Chiến Xưởng</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Nghiệm thu đa công pháp, đồng bộ GitHub Webhook & bảo đảm chất lượng với M17.
          </p>
        </div>
        {onCreateProject && (
          <button
            onClick={onCreateProject}
            style={{ padding: '8px 16px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            + Khởi Tạo Dự Án Mới
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelectProject(p.id)}
            style={{
              backgroundColor: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '10px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#f97316' }}>{p.code}</span>
                <span style={{
                  fontSize: '11px',
                  backgroundColor: p.status === 'ACTIVE' ? '#064e3b' : p.status === 'COMPLETED' ? '#1e3a8a' : '#374151',
                  color: p.status === 'ACTIVE' ? '#6ee7b7' : p.status === 'COMPLETED' ? '#93c5fd' : '#d1d5db',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {p.status}
                </span>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#ffffff' }}>{p.name}</h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#9ca3af', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.description}
              </p>
            </div>

            <div style={{ borderTop: '1px solid #1f2937', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
              <span>Lead: <strong>{p.leadName || 'Chưa gán'}</strong></span>
              <span>👥 {p.membersCount} thành viên</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
