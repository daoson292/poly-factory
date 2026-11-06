import React, { useState } from 'react';

interface ReleaseGateSummary {
  canComplete: boolean;
  criticalBugsCount: number;
  highBugsCount: number;
  openBugsCount: number;
  untestedCasesCount: number;
  deliverablesAllVerified: boolean;
}

interface ProjectReleaseGatePanelProps {
  summary: ReleaseGateSummary;
  isMentorOrDeveloper: boolean;
  onCompleteProject: (overrideReason?: string) => Promise<boolean>;
}

export const ProjectReleaseGatePanel: React.FC<ProjectReleaseGatePanelProps> = ({
  summary,
  isMentorOrDeveloper,
  onCompleteProject
}) => {
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const hasBlockingBugs = summary.criticalBugsCount > 0 || summary.highBugsCount > 0;
  const isGatePassed = summary.canComplete && !hasBlockingBugs && summary.deliverablesAllVerified;

  const handleComplete = async () => {
    setIsSubmitting(true);
    setResultMsg(null);
    const ok = await onCompleteProject(overrideReason);
    setIsSubmitting(false);
    if (ok) {
      setResultMsg('🎉 Dự án đã chính thức Nghiệm Thu và Hoàn Thành (COMPLETED)!');
    }
  };

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1f2937', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '26px' }}>{isGatePassed ? '🟢' : '🔴'}</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>Cổng Kiểm Soát Chất Lượng (Release Gate M17)</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Điều kiện tiên quyết để nghiệm thu dự án và cấp Chứng chỉ 6 Công pháp.
          </p>
        </div>
      </div>

      {resultMsg && (
        <div style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', fontWeight: 'bold' }}>
          {resultMsg}
        </div>
      )}

      {/* Conditions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px', borderLeft: `4px solid ${summary.criticalBugsCount === 0 ? '#10b981' : '#ef4444'}` }}>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Bug CRITICAL tồn đọng:</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: summary.criticalBugsCount === 0 ? '#10b981' : '#ef4444' }}>
            {summary.criticalBugsCount} bugs
          </div>
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px', borderLeft: `4px solid ${summary.highBugsCount === 0 ? '#10b981' : '#ef4444'}` }}>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Bug HIGH tồn đọng:</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: summary.highBugsCount === 0 ? '#10b981' : '#ef4444' }}>
            {summary.highBugsCount} bugs
          </div>
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px', borderLeft: `4px solid ${summary.untestedCasesCount === 0 ? '#10b981' : '#f59e0b'}` }}>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Kịch bản chưa test:</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: summary.untestedCasesCount === 0 ? '#10b981' : '#f59e0b' }}>
            {summary.untestedCasesCount} cases
          </div>
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px', borderLeft: `4px solid ${summary.deliverablesAllVerified ? '#10b981' : '#ef4444'}` }}>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Nghiệm thu UI/UX & BA:</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: summary.deliverablesAllVerified ? '#10b981' : '#ef4444', marginTop: '4px' }}>
            {summary.deliverablesAllVerified ? '✓ Đầy đủ' : 'Chưa xong'}
          </div>
        </div>
      </div>

      {/* Action / Override */}
      <div style={{ borderTop: '1px solid #1f2937', paddingTop: '16px' }}>
        {isGatePassed ? (
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {isSubmitting ? 'Đang hoàn thành...' : '🎖️ Đạt Chuẩn - Nghiệm Thu Hoàn Thành Dự Án'}
          </button>
        ) : (
          <div>
            <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px', fontWeight: '500' }}>
              ⛔ Release Gate đang CHẶN: Vẫn còn bug CRITICAL/HIGH hoặc sản phẩm UI/UX - BA chưa nghiệm thu (E-polyfactory-305).
            </div>

            {isMentorOrDeveloper && (
              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', maxWidth: '520px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fbbf24' }}>
                  Quyền Ngoại Lệ Dành Riêng Cho Mentor / Developer:
                </span>
                <input
                  type="text"
                  placeholder="Lý do nghiệm thu đặc cách (bảo lưu bug sang sprint sau)..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '12px', margin: '8px 0 10px 0' }}
                />
                <button
                  onClick={handleComplete}
                  disabled={!overrideReason.trim() || isSubmitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: overrideReason.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Nghiệm Thu Đặc Cách Bằng Quyền Mentor
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
