import React, { useState } from 'react';
import { Position } from '../../types';

interface PositionSelectorModalProps {
  isOpen: boolean;
  selectedPositions: Position[];
  onClose: () => void;
  onSavePositions: (positions: Position[]) => Promise<void>;
}

export const PositionSelectorModal: React.FC<PositionSelectorModalProps> = ({
  isOpen,
  selectedPositions,
  onClose,
  onSavePositions
}) => {
  const [currentSelected, setCurrentSelected] = useState<Position[]>(selectedPositions);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const positionsList: { key: Position; label: string; icon: string; desc: string }[] = [
    { key: 'FRONTEND', label: 'Frontend', icon: '🎨', desc: 'Xây dựng giao diện Web/Mobile, tối ưu hiệu năng và trải nghiệm người dùng.' },
    { key: 'BACKEND', label: 'Backend', icon: '⚙️', desc: 'Thiết kế REST/GraphQL API, kiến trúc dữ liệu và logic nghiệp vụ hệ thống.' },
    { key: 'FULLSTACK', label: 'Fullstack', icon: '⚡', desc: 'Làm chủ toàn diện từ cơ sở dữ liệu tới giao diện người dùng đầu cuối.' },
    { key: 'TESTER', label: 'Tester (QA/QC)', icon: '🔍', desc: 'Xây dựng kịch bản kiểm thử, săn tìm lỗi và đảm bảo chất lượng phần mềm.' },
    { key: 'UI_UX', label: 'UI/UX Designer', icon: '✨', desc: 'Thiết kế Design System, Wireframe và Prototype sản phẩm tương tác.' },
    { key: 'BA', label: 'Business Analyst', icon: '📋', desc: 'Đặc tả yêu cầu phần mềm (SRS, URD, BRD) và quản lý quy trình nghiệp vụ.' }
  ];

  const togglePosition = (pos: Position) => {
    if (currentSelected.includes(pos)) {
      setCurrentSelected(currentSelected.filter(p => p !== pos));
    } else {
      setCurrentSelected([...currentSelected, pos]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSavePositions(currentSelected);
    setIsSaving(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '640px', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '14px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#ffffff' }}>⚔️ Chọn 6 Công Pháp Chuyên Môn</h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#9ca3af' }}>
          Bạn có thể chọn một hoặc nhiều hướng chuyên môn phù hợp để tham gia các dự án thực chiến tại xưởng.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {positionsList.map((item) => {
            const isChecked = currentSelected.includes(item.key);
            return (
              <div
                key={item.key}
                onClick={() => togglePosition(item.key)}
                style={{
                  backgroundColor: isChecked ? '#1e3a8a' : '#1e293b',
                  border: `2px solid ${isChecked ? '#3b82f6' : '#334155'}`,
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                    <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '14px' }}>{item.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer' }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || currentSelected.length === 0}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#f97316',
              color: '#ffffff',
              fontWeight: 'bold',
              cursor: currentSelected.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu Công Pháp'}
          </button>
        </div>
      </div>
    </div>
  );
};
