import React, { useState } from 'react';
import { Position } from '../../types';

interface ProjectApplyModalProps {
  isOpen: boolean;
  userRole: string; // 'TRAINEE' | 'MEMBER' | ...
  userPositions: Position[];
  onClose: () => void;
  onApply: (position: Position, motivation: string) => Promise<boolean>;
}

export const ProjectApplyModal: React.FC<ProjectApplyModalProps> = ({
  isOpen,
  userRole,
  userPositions,
  onClose,
  onApply
}) => {
  const [selectedPos, setSelectedPos] = useState<Position>(userPositions[0] || 'FRONTEND');
  const [motivation, setMotivation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isTrainee = userRole === 'TRAINEE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTrainee) return;
    setIsSubmitting(true);
    const ok = await onApply(selectedPos, motivation);
    setIsSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#ffffff' }}>📝 Đăng Ký Tham Gia Dự Án</h3>

        {isTrainee ? (
          <div style={{ backgroundColor: '#451a1a', border: '1px solid #ef4444', borderRadius: '8px', padding: '16px', color: '#fca5a5', fontSize: '13px', margin: '16px 0' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🔒 Chưa Đủ Điều Kiện Nhập Dự Án</div>
            <div>
              Thành viên cấp <strong>TRAINEE</strong> cần hoàn thành cả 3 Level trong Lộ trình Nhập Môn để đạt Tag <em>"Tốt nghiệp Training"</em> và thăng cấp lên <strong>MEMBER</strong> trước khi đăng ký tham gia dự án thực chiến (luật CD-13 SRS).
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                Chọn Công Pháp muốn đảm nhận:
              </label>
              <select
                value={selectedPos}
                onChange={(e) => setSelectedPos(e.target.value as Position)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '14px' }}
              >
                <option value="FRONTEND">FRONTEND (Giao diện người dùng)</option>
                <option value="BACKEND">BACKEND (API & Cơ sở dữ liệu)</option>
                <option value="FULLSTACK">FULLSTACK (Toàn diện hệ thống)</option>
                <option value="TESTER">TESTER (Kiểm thử M17 & Báo lỗi)</option>
                <option value="UI_UX">UI_UX (Thiết kế mẫu & Trải nghiệm)</option>
                <option value="BA">BA (Đặc tả nghiệp vụ & Use Case)</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                Kinh nghiệm / Mục tiêu đóng góp:
              </label>
              <textarea
                rows={3}
                required
                placeholder="Em đã làm qua React/Tailwind, mong muốn đóng góp hoàn thiện giao diện..."
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#f97316', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi Đơn Đăng Ký'}
              </button>
            </div>
          </form>
        )}

        {isTrainee && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', backgroundColor: '#374151', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Đã hiểu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
