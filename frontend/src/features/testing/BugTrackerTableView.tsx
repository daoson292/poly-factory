import React, { useState } from 'react';
import { BugItem } from '../../types';

interface BugTrackerTableViewProps {
  bugs: BugItem[];
  onSelectBug: (bug: BugItem) => void;
  onOpenReportModal: () => void;
}

export const BugTrackerTableView: React.FC<BugTrackerTableViewProps> = ({
  bugs,
  onSelectBug,
  onOpenReportModal
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredBugs = bugs.filter((b) => {
    const matchSev = severityFilter === 'ALL' || b.severity === severityFilter;
    const matchSta = statusFilter === 'ALL' || b.status === statusFilter;
    return matchSev && matchSta;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return { bg: '#7f1d1d', text: '#fca5a5' };
      case 'HIGH':
        return { bg: '#78350f', text: '#fde68a' };
      case 'MEDIUM':
        return { bg: '#1e3a8a', text: '#bfdbfe' };
      default:
        return { bg: '#374151', text: '#cbd5e1' };
    }
  };

  const getStatusBadge = (sta: string) => {
    switch (sta) {
      case 'OPEN':
        return { bg: '#1e3a8a', text: '#93c5fd' };
      case 'IN_PROGRESS':
        return { bg: '#78350f', text: '#fde68a' };
      case 'RESOLVED':
        return { bg: '#064e3b', text: '#6ee7b7' };
      case 'CLOSED':
        return { bg: '#14532d', text: '#86efac' };
      case 'REOPENED':
        return { bg: '#7f1d1d', text: '#fca5a5' };
      default:
        return { bg: '#374151', text: '#cbd5e1' };
    }
  };

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1f2937', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>Bảng Theo Dõi Bug (Quy Tắc 4 Mắt)</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Nghiêm cấm người sửa tự đóng bug (E-polyfactory-302), trần 100 EXP/người/tháng.
          </p>
        </div>

        <button
          onClick={onOpenReportModal}
          style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🐛 Báo Cáo Lỗi Mới
        </button>
      </div>

      {/* Filter Bars */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px' }}
        >
          <option value="ALL">Tất cả mức độ (Severity)</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px' }}
        >
          <option value="ALL">Tất cả trạng thái (Status)</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="REOPENED">REOPENED</option>
        </select>
      </div>

      {/* Bugs Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th style={{ padding: '10px' }}>Mã Lỗi</th>
              <th style={{ padding: '10px' }}>Tiêu Đề Bug</th>
              <th style={{ padding: '10px' }}>Mức Độ</th>
              <th style={{ padding: '10px' }}>Trạng Thái</th>
              <th style={{ padding: '10px' }}>Người Báo (Tester)</th>
              <th style={{ padding: '10px' }}>Người Sửa (Dev)</th>
              <th style={{ padding: '10px' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredBugs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                  Không có lỗi nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredBugs.map((bug) => {
                const sBadge = getSeverityBadge(bug.severity);
                const stBadge = getStatusBadge(bug.status);
                return (
                  <tr key={bug.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#f97316' }}>{bug.code}</td>
                    <td style={{ padding: '10px', color: '#ffffff', fontWeight: '500' }}>{bug.title}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ backgroundColor: sBadge.bg, color: sBadge.text, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {bug.severity}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ backgroundColor: stBadge.bg, color: stBadge.text, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {bug.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#cbd5e1' }}>{bug.reporterName}</td>
                    <td style={{ padding: '10px', color: '#cbd5e1' }}>{bug.fixerName || 'Chưa gán'}</td>
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={() => onSelectBug(bug)}
                        style={{ padding: '4px 10px', backgroundColor: '#374151', color: '#38bdf8', border: '1px solid #4b5563', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
