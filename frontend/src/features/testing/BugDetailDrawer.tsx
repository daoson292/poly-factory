import React, { useState } from 'react';
import { BugItem } from '../../types';

interface BugDetailDrawerProps {
  bug: BugItem | null;
  currentUserId: string;
  isProjectLead: boolean;
  onClose: () => void;
  onResolveBug: (bugId: string, fixReference: string) => Promise<boolean>;
  onVerifyAndCloseBug: (bugId: string) => Promise<boolean>;
  onReopenBug: (bugId: string, reopenReason: string) => Promise<boolean>;
}

export const BugDetailDrawer: React.FC<BugDetailDrawerProps> = ({
  bug,
  currentUserId,
  isProjectLead,
  onClose,
  onResolveBug,
  onVerifyAndCloseBug,
  onReopenBug
}) => {
  const [fixRefInput, setFixRefInput] = useState('');
  const [reopenReasonInput, setReopenReasonInput] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  if (!bug) return null;

  // 4-eyes check: if current user is the fixer, they cannot close
  const isFixer = bug.fixerName === currentUserId || bug.fixerName === 'Current User';

  const handleResolve = async () => {
    if (!fixRefInput.trim()) {
      setErrorBanner('Bắt buộc phải điền commit SHA hoặc link PR khi báo sửa xong (E-polyfactory-303).');
      return;
    }
    setErrorBanner(null);
    const ok = await onResolveBug(bug.id, fixRefInput);
    if (ok) onClose();
  };

  const handleClose = async () => {
    if (isFixer) {
      setErrorBanner('Quy tắc 4 mắt (E-polyfactory-302): Người sửa bug không được tự nghiệm thu và đóng bug.');
      return;
    }
    setErrorBanner(null);
    const ok = await onVerifyAndCloseBug(bug.id);
    if (ok) onClose();
  };

  const handleReopen = async () => {
    if (!reopenReasonInput.trim()) {
      setErrorBanner('Vui lòng nêu rõ lý do mở lại lỗi.');
      return;
    }
    setErrorBanner(null);
    const ok = await onReopenBug(bug.id, reopenReasonInput);
    if (ok) onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '480px', backgroundColor: '#111827', borderLeft: '1px solid #1f2937', padding: '24px', zIndex: 1000, boxShadow: '-4px 0 24px rgba(0,0,0,0.5)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f97316' }}>{bug.code}</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '20px', cursor: 'pointer' }}>✕</button>
      </div>

      <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#ffffff' }}>{bug.title}</h3>

      {errorBanner && (
        <div style={{ backgroundColor: '#451a1a', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
          ⚠️ {errorBanner}
        </div>
      )}

      {/* Meta details */}
      <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Mức độ:</span>
          <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{bug.severity}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Trạng thái:</span>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{bug.status}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Tester báo lỗi:</span>
          <span style={{ color: '#ffffff' }}>{bug.reporterName} (+10 EXP)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Dev nhận sửa:</span>
          <span style={{ color: '#ffffff' }}>{bug.fixerName || 'Chưa gán'}</span>
        </div>
        {bug.fixReference && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af' }}>Mã sửa (PR/SHA):</span>
            <span style={{ color: '#10b981', fontFamily: 'monospace' }}>{bug.fixReference}</span>
          </div>
        )}
      </div>

      {/* 4-Eyes Rule Banner */}
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#cbd5e1', marginBottom: '20px' }}>
        🛡️ <strong>Quy tắc 4 mắt (4-Eyes Rule):</strong> Dev báo <em>RESOLVED</em> kèm link PR; Tester độc lập kiểm tra thực tế rồi mới được bấm <em>CLOSED</em> (+5 EXP cho Dev).
      </div>

      {/* Action controls according to status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {bug.status === 'OPEN' || bug.status === 'IN_PROGRESS' ? (
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
              Commit SHA / Link PR đã sửa (Bắt buộc theo BR-303):
            </label>
            <input
              type="text"
              placeholder="https://github.com/.../pull/12 hoặc sha 7a9f1b2"
              value={fixRefInput}
              onChange={(e) => setFixRefInput(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', marginBottom: '10px' }}
            />
            <button
              onClick={handleResolve}
              style={{ width: '100%', padding: '10px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
            >
              ✓ Đã Sửa Xong (Chuyển sang RESOLVED)
            </button>
          </div>
        ) : null}

        {bug.status === 'RESOLVED' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleClose}
              disabled={isFixer}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: isFixer ? '#4b5563' : '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: isFixer ? 'not-allowed' : 'pointer',
                fontSize: '13px'
              }}
            >
              {isFixer ? 'Khóa nghiệm thu (Bạn là Dev sửa)' : '🔒 Nghiệm Thu & Đóng Bug (CLOSED +5 EXP Dev)'}
            </button>

            <div>
              <input
                type="text"
                placeholder="Lý do mở lại (vẫn lỗi ở bước 2)..."
                value={reopenReasonInput}
                onChange={(e) => setReopenReasonInput(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', marginBottom: '6px' }}
              />
              <button
                onClick={handleReopen}
                style={{ width: '100%', padding: '8px', backgroundColor: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
              >
                ↩️ Mở Lại Bug (REOPENED - Thu hồi 5 EXP)
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
