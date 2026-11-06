import React, { useState } from 'react';

interface BugReportModalProps {
  isOpen: boolean;
  prefilledTitle?: string;
  onClose: () => void;
  onSubmitBug: (bugData: { title: string; severity: string; description: string; evidenceImages: string[] }) => Promise<void>;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  prefilledTitle = '',
  onClose,
  onSubmitBug
}) => {
  const [title, setTitle] = useState(prefilledTitle);
  const [severity, setSeverity] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSimulatedImage = () => {
    if (images.length >= 3) {
      setErrorMsg('Tối đa 3 ảnh bằng chứng lỗi (luật E-polyfactory-306).');
      return;
    }
    setErrorMsg(null);
    setImages([...images, `/storage/bugs/evidence_${Date.now()}_${images.length + 1}.png`]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmitBug({ title, severity, description, evidenceImages: images });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '520px', backgroundColor: '#111827', border: '1px solid #ef4444', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '17px', color: '#fca5a5' }}>🐛 Báo Cáo Lỗi Mới (Bug Report)</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Tiêu đề lỗi</label>
            <input
              type="text"
              required
              placeholder="Lỗi màn hình trắng khi tải báo cáo Excel..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Mức độ nghiêm trọng (Severity)</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '13px' }}
            >
              <option value="CRITICAL">CRITICAL (Chặn dòng / Sập hệ thống / Crash)</option>
              <option value="HIGH">HIGH (Mất chức năng chính / Sai dữ liệu)</option>
              <option value="MEDIUM">MEDIUM (Lỗi logic thứ cấp)</option>
              <option value="LOW">LOW (Lỗi chính tả / Lệch giao diện nhỏ)</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Các bước tái hiện & Chi tiết</label>
            <textarea
              rows={4}
              required
              placeholder="1. Vào mục Lịch 6 ca...&#10;2. Bấm nút đăng ký ca 2...&#10;3. Quan sát thông báo lỗi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '13px' }}
            />
          </div>

          {/* Image Attachments */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Ảnh bằng chứng (tối đa 3 ảnh, ≤ 2MB/ảnh):</label>
              <button
                type="button"
                onClick={handleAddSimulatedImage}
                style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#374151', color: '#38bdf8', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Đính Kèm Ảnh
              </button>
            </div>

            {errorMsg && <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '6px' }}>{errorMsg}</div>}

            <div style={{ display: 'flex', gap: '8px' }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ backgroundColor: '#1f2937', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', color: '#9ca3af' }}>
                  🖼️ Ảnh {idx + 1}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #1f2937', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {isSubmitting ? 'Đang tạo...' : 'Gửi Báo Cáo Bug (+10 EXP)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
