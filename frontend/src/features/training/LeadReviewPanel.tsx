import React from 'react';

interface TraineeCandidate {
  id: string;
  fullName: string;
  email: string;
  currentLevel: number;
  completedTasksPercent: number; // 0 to 100
  attendancePercent: number; // 0 to 100
  isRecommended: boolean; // >= 100% tasks && >= 70% attendance
}

interface LeadReviewPanelProps {
  candidates: TraineeCandidate[];
  onApproveLevelUp: (candidateId: string) => Promise<void>;
}

export const LeadReviewPanel: React.FC<LeadReviewPanelProps> = ({
  candidates,
  onApproveLevelUp
}) => {
  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>Xét Duyệt Lên Cấp Nhập Môn (Lead / Mentor Review)</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
          Gợi ý nhãn xanh tự động khi Trainee đạt 100% bài tập bắt buộc và $\ge 70\%$ chuyên cần.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {candidates.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}>Không có ứng viên nào đang chờ xét duyệt.</div>
        ) : (
          candidates.map((c) => (
            <div
              key={c.id}
              style={{
                backgroundColor: '#1f2937',
                border: `1px solid ${c.isRecommended ? '#059669' : '#374151'}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '15px' }}>{c.fullName}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>({c.email})</span>
                  {c.isRecommended && (
                    <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                      🌟 ĐỦ ĐIỀU KIỆN LÊN CẤP
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px', display: 'flex', gap: '16px' }}>
                  <span>Cấp hiện tại: <strong>Level {c.currentLevel}</strong></span>
                  <span>Bài tập: <strong>{c.completedTasksPercent}%</strong></span>
                  <span>Chuyên cần: <strong>{c.attendancePercent}%</strong></span>
                </div>
              </div>

              <div>
                <button
                  onClick={() => onApproveLevelUp(c.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: c.isRecommended ? '#059669' : '#374151',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {c.currentLevel === 3 ? '🎓 Duyệt Tốt Nghiệp -> Member' : `Duyệt lên Level ${c.currentLevel + 1}`}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
