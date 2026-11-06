import React, { useState } from 'react';
import { TestCaseItem } from '../../types';

interface TestSuiteGroup {
  id: string;
  name: string;
  description?: string;
  testCases: TestCaseItem[];
}

interface TestSuitesRepositoryViewProps {
  suites: TestSuiteGroup[];
  onOpenCreateCaseModal: (suiteId: string) => void;
  onStartTestRun: () => void;
}

export const TestSuitesRepositoryView: React.FC<TestSuitesRepositoryViewProps> = ({
  suites,
  onOpenCreateCaseModal,
  onStartTestRun
}) => {
  const [selectedCase, setSelectedCase] = useState<TestCaseItem | null>(null);

  const getPriorityBadge = (p: string) => {
    switch (p) {
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

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1f2937', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>Kho Kịch Bản Kiểm Thử (Test Suite 1 Cấp)</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Phân loại kịch bản rõ ràng, gắn bước thực hiện chi tiết cho Tester thực thi.
          </p>
        </div>

        <button
          onClick={onStartTestRun}
          style={{ padding: '8px 16px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ▶️ Bắt Đầu Đợt Test Run Mới
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {suites.map((suite) => (
          <div key={suite.id} style={{ backgroundColor: '#1f2937', borderRadius: '8px', border: '1px solid #374151', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '15px' }}>📁 {suite.name}</span>
                <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '10px' }}>({suite.testCases.length} kịch bản)</span>
              </div>
              <button
                onClick={() => onOpenCreateCaseModal(suite.id)}
                style={{ padding: '4px 10px', backgroundColor: '#374151', color: '#f97316', border: '1px solid #4b5563', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
              >
                + Thêm Kịch Bản
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suite.testCases.map((tc) => {
                const badge = getPriorityBadge(tc.priority);
                return (
                  <div
                    key={tc.id}
                    onClick={() => setSelectedCase(tc)}
                    style={{
                      backgroundColor: '#111827',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold', color: '#f97316' }}>{tc.code}</span>
                      <span style={{ color: '#ffffff' }}>{tc.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: badge.bg, color: badge.text, padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {tc.priority}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{tc.steps.length} bước</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Case Details Drawer / Modal */}
      {selectedCase && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', padding: '24px', maxWidth: '520px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: '#f97316', fontWeight: 'bold', fontSize: '16px' }}>{selectedCase.code}</span>
              <button onClick={() => setSelectedCase(null)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <h4 style={{ margin: '0 0 16px 0', color: '#ffffff', fontSize: '16px' }}>{selectedCase.title}</h4>

            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#d1d5db', marginBottom: '8px' }}>Các Bước Thực Hiện:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
              {selectedCase.steps.map((st) => (
                <div key={st.stepNumber} style={{ backgroundColor: '#1f2937', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                  <div style={{ color: '#f97316', fontWeight: 'bold' }}>Bước {st.stepNumber}: {st.action}</div>
                  <div style={{ color: '#9ca3af', marginTop: '2px' }}>👉 Kỳ vọng: {st.expectedResult}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
