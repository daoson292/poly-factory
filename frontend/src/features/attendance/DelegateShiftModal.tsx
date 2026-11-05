import React, { useState } from 'react';

interface DelegateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelegate: (targetMemberEmail: string) => Promise<boolean>;
}

export const DelegateShiftModal: React.FC<DelegateShiftModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelegate
}) => {
  const [targetEmail, setTargetEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const ok = await onConfirmDelegate(targetEmail);
    setIsSubmitting(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        backgroundColor: '#111827',
        border: '1px solid #374151',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '17px', color: '#ffffff' }}>🤝 Ủy Quyền Trực Ca Hôm Nay</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#9ca3af', lineHeight: 1.4 }}>
          Quyền Lead mở phiên QR và điểm danh sẽ được chuyển cho thành viên được chỉ định và <strong>tự động hết hạn vào 23:59 hôm nay</strong> (luật Mục 6.9 SRS).
        </p>

        {success ? (
          <div style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '12px', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
            ✅ Đã kích hoạt ủy quyền ca trực thành công!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#d1d5db', marginBottom: '6px' }}>
                Email thành viên nhận ủy quyền (@fpt.edu.vn)
              </label>
              <input
                type="email"
                required
                placeholder="thanhvien@fpt.edu.vn"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '13px' }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#f97316', color: '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              >
                {isSubmitting ? 'Đang cấp quyền...' : 'Xác nhận Ủy quyền'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
