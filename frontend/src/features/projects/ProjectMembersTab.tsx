import React from 'react';
import { Position } from '../../types';

interface ProjectMemberItem {
  id: string;
  fullName: string;
  email: string;
  position: Position;
  isProjectLead: boolean;
  canTest: boolean;
  isDeliverableVerified: boolean;
}

interface ProjectMembersTabProps {
  members: ProjectMemberItem[];
  isProjectLeadOrAdmin: boolean;
  onVerifyDeliverable: (memberId: string) => Promise<void>;
  onToggleCanTest: (memberId: string, current: boolean) => Promise<void>;
}

export const ProjectMembersTab: React.FC<ProjectMembersTabProps> = ({
  members,
  isProjectLeadOrAdmin,
  onVerifyDeliverable,
  onToggleCanTest
}) => {
  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1f2937', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>Thành Viên Dự Án ({members.length})</h3>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Quản lý quyền Tester & Nghiệm thu sản phẩm UI/UX - BA</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th style={{ padding: '10px' }}>Thành Viên</th>
              <th style={{ padding: '10px' }}>Công Pháp</th>
              <th style={{ padding: '10px' }}>Vai Trò Trong Dự Án</th>
              <th style={{ padding: '10px' }}>Quyền Kiểm Thử (canTest)</th>
              <th style={{ padding: '10px' }}>Nghiệm Thu Sản Phẩm</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isDesignOrBa = m.position === 'UI_UX' || m.position === 'BA';
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: '600', color: '#ffffff' }}>{m.fullName}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.email}</div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      {m.position}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {m.isProjectLead ? (
                      <span style={{ backgroundColor: '#78350f', color: '#fde68a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        ⭐ PROJECT LEAD
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>Thành viên</span>
                    )}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {isProjectLeadOrAdmin ? (
                      <button
                        onClick={() => onToggleCanTest(m.id, m.canTest)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          backgroundColor: m.canTest ? '#064e3b' : '#374151',
                          color: m.canTest ? '#6ee7b7' : '#9ca3af'
                        }}
                      >
                        {m.canTest ? '✓ ĐƯỢC TEST' : 'CHƯA CẤP'}
                      </button>
                    ) : (
                      <span style={{ color: m.canTest ? '#10b981' : '#6b7280' }}>
                        {m.canTest ? 'Có' : 'Không'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {isDesignOrBa ? (
                      isProjectLeadOrAdmin ? (
                        <button
                          onClick={() => onVerifyDeliverable(m.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            backgroundColor: m.isDeliverableVerified ? '#064e3b' : '#d97706',
                            color: '#ffffff'
                          }}
                        >
                          {m.isDeliverableVerified ? '✓ ĐÃ NGHIỆM THU' : 'CHỜ NGHIỆM THU'}
                        </button>
                      ) : (
                        <span style={{ color: m.isDeliverableVerified ? '#10b981' : '#f59e0b' }}>
                          {m.isDeliverableVerified ? 'Đã nghiệm thu' : 'Chờ nghiệm thu'}
                        </span>
                      )
                    ) : (
                      <span style={{ color: '#6b7280' }}>N/A (Code)</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
