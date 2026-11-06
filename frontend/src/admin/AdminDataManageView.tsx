import React, { useState } from 'react';

interface WhitelistMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: 'PENDING_ACTIVATION' | 'ACTIVE' | 'ALUMNI' | 'LOCKED';
  currentExp: number;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  targetEmail: string;
  reason: string;
}

interface AdminDataManageViewProps {
  members: WhitelistMember[];
  auditLogs: AuditLogEntry[];
  onAddMember: (email: string, fullName: string, role: string) => Promise<void>;
  onUpdateStatus: (userId: string, newStatus: 'ACTIVE' | 'ALUMNI' | 'LOCKED') => Promise<void>;
  onAdjustExp: (userId: string, deltaExp: number, reason: string) => Promise<boolean>;
}

export const AdminDataManageView: React.FC<AdminDataManageViewProps> = ({
  members,
  auditLogs,
  onAddMember,
  onUpdateStatus,
  onAdjustExp
}) => {
  const [selectedUserForExp, setSelectedUserForExp] = useState<WhitelistMember | null>(null);
  const [expDelta, setExpDelta] = useState<number>(50);
  const [expReason, setExpReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('TRAINEE');

  const handleAdjustExpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expReason.trim().length < 10) {
      setReasonError('Lý do điều chỉnh EXP bắt buộc phải có ít nhất 10 ký tự (luật E-polyfactory-250).');
      return;
    }
    setReasonError(null);
    if (!selectedUserForExp) return;

    const ok = await onAdjustExp(selectedUserForExp.id, expDelta, expReason);
    if (ok) {
      setSelectedUserForExp(null);
      setExpReason('');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddMember(newEmail, newName, newRole);
    setNewEmail('');
    setNewName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Whitelist Members Table */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#ffffff' }}>Quản Lý Thành Viên Whitelist ({members.length})</h3>

        {/* Add Member Form */}
        <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="email"
            required
            placeholder="Email @fpt.edu.vn"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', flex: 1, minWidth: '180px' }}
          />
          <input
            type="text"
            required
            placeholder="Họ và tên"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', flex: 1, minWidth: '160px' }}
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
          >
            <option value="TRAINEE">TRAINEE</option>
            <option value="MEMBER">MEMBER</option>
            <option value="TEAM_LEAD">TEAM_LEAD</option>
            <option value="MENTOR">MENTOR</option>
          </select>
          <button
            type="submit"
            style={{ padding: '8px 16px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            + Thêm Vào Whitelist
          </button>
        </form>

        {/* Members List */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '10px' }}>Họ Tên</th>
                <th style={{ padding: '10px' }}>Email</th>
                <th style={{ padding: '10px' }}>Vai Trò</th>
                <th style={{ padding: '10px' }}>Trạng Thái</th>
                <th style={{ padding: '10px' }}>EXP</th>
                <th style={{ padding: '10px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px', fontWeight: '600', color: '#fff' }}>{m.fullName}</td>
                  <td style={{ padding: '10px', color: '#cbd5e1' }}>{m.email}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ backgroundColor: '#1e3a8a', color: '#bfdbfe', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{m.role}</span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      backgroundColor: m.status === 'ACTIVE' ? '#064e3b' : m.status === 'ALUMNI' ? '#78350f' : '#7f1d1d',
                      color: m.status === 'ACTIVE' ? '#6ee7b7' : m.status === 'ALUMNI' ? '#fde68a' : '#fca5a5',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>{m.currentExp}</td>
                  <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setSelectedUserForExp(m)}
                      style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#374151', color: '#38bdf8', border: '1px solid #475569', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ⚡ Chỉnh EXP
                    </button>
                    {m.status !== 'LOCKED' ? (
                      <button
                        onClick={() => onUpdateStatus(m.id, 'LOCKED')}
                        style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Khóa
                      </button>
                    ) : (
                      <button
                        onClick={() => onUpdateStatus(m.id, 'ACTIVE')}
                        style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#064e3b', color: '#6ee7b7', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Mở Khóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Table */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '17px', color: '#ffffff' }}>Nhật Ký Kiểm Toán Toàn Cục (Audit Log)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '8px' }}>Thời Gian</th>
                <th style={{ padding: '8px' }}>Người Thực Hiện</th>
                <th style={{ padding: '8px' }}>Hành Động</th>
                <th style={{ padding: '8px' }}>Đối Tượng</th>
                <th style={{ padding: '8px' }}>Lý Do / Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{log.timestamp}</td>
                  <td style={{ padding: '8px', color: '#38bdf8' }}>{log.actorEmail}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: '#ffffff' }}>{log.action}</td>
                  <td style={{ padding: '8px', color: '#cbd5e1' }}>{log.targetEmail}</td>
                  <td style={{ padding: '8px', color: '#9ca3af' }}>{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust EXP Modal */}
      {selectedUserForExp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', padding: '24px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#ffffff', fontSize: '16px' }}>Điều Chỉnh EXP: {selectedUserForExp.fullName}</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#94a3b8' }}>
              Quy tắc BR-250: Lý do điều chỉnh bắt buộc $\ge 10$ ký tự và tự động ghi vào Sổ Cái EXP.
            </p>

            <form onSubmit={handleAdjustExpSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Số lượng EXP (+ hoặc -)</label>
                <input
                  type="number"
                  required
                  value={expDelta}
                  onChange={(e) => setExpDelta(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Lý do (tối thiểu 10 ký tự)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Thưởng đột xuất hoàn thành xuất sắc đồ án demo..."
                  value={expReason}
                  onChange={(e) => setExpReason(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
                />
                {reasonError && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{reasonError}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedUserForExp(null)}
                  style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #4b5563', color: '#9ca3af', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 14px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Lưu Điều Chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
