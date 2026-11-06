import React, { useState } from 'react';

interface TestCaseEditorModalProps {
  isOpen: boolean;
  suiteId: string;
  onClose: () => void;
  onSave: (suiteId: string, caseData: { title: string; priority: string; steps: { stepNumber: number; action: string; expectedResult: string }[] }) => Promise<void>;
}

export const TestCaseEditorModal: React.FC<TestCaseEditorModalProps> = ({
  isOpen,
  suiteId,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [steps, setSteps] = useState<{ stepNumber: number; action: string; expectedResult: string }[]>([
    { stepNumber: 1, action: '', expectedResult: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const addStep = () => {
    setSteps([...steps, { stepNumber: steps.length + 1, action: '', expectedResult: '' }]);
  };

  const updateStep = (index: number, field: 'action' | 'expectedResult', val: string) => {
    const updated = [...steps];
    updated[index][field] = val;
    setSteps(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(suiteId, { title, priority, steps });
    setIsSaving(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', padding: '24px', maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#ffffff' }}>Thêm Kịch Bản Kiểm Thử Mới</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Tiêu đề kịch bản</label>
            <input
              type="text"
              required
              placeholder="Kiểm tra đăng nhập khi email không thuộc Whitelist..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Mức độ ưu tiên (Priority)</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '13px' }}
            >
              <option value="CRITICAL">CRITICAL (Chức năng cốt lõi / Chặn dòng)</option>
              <option value="HIGH">HIGH (Nghiệp vụ quan trọng)</option>
              <option value="MEDIUM">MEDIUM (Bình thường)</option>
              <option value="LOW">LOW (Chi tiết giao diện nhỏ)</option>
            </select>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#d1d5db' }}>Các bước thực hiện</label>
              <button
                type="button"
                onClick={addStep}
                style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#374151', color: '#38bdf8', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Thêm Bước
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {steps.map((st, idx) => (
                <div key={idx} style={{ backgroundColor: '#1f2937', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f97316' }}>Bước {st.stepNumber}</span>
                  <input
                    type="text"
                    required
                    placeholder="Hành động (Action)..."
                    value={st.action}
                    onChange={(e) => updateStep(idx, 'action', e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#111827', color: '#fff', fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Kết quả kỳ vọng (Expected Result)..."
                    value={st.expectedResult}
                    onChange={(e) => updateStep(idx, 'expectedResult', e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#111827', color: '#fff', fontSize: '12px' }}
                  />
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
              disabled={isSaving}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#f97316', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu Kịch Bản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
