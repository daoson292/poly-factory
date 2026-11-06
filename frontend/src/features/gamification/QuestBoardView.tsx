import React from 'react';

export interface QuestItem {
  id: string;
  title: string;
  type: 'DAILY' | 'WEEKLY';
  targetCount: number;
  currentCount: number;
  expReward: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

interface QuestBoardViewProps {
  quests: QuestItem[];
  onClaimReward: (questId: string) => Promise<void>;
}

export const QuestBoardView: React.FC<QuestBoardViewProps> = ({
  quests,
  onClaimReward
}) => {
  const dailyQuests = quests.filter(q => q.type === 'DAILY');
  const weeklyQuests = quests.filter(q => q.type === 'WEEKLY');

  const renderQuestSection = (title: string, list: QuestItem[]) => (
    <div style={{ marginBottom: '24px' }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#f97316' }}>{title}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {list.map((q) => {
          const progressPercent = Math.min(100, Math.round((q.currentCount / q.targetCount) * 100));

          return (
            <div
              key={q.id}
              style={{
                backgroundColor: '#1f2937',
                border: `1px solid ${q.isCompleted ? '#059669' : '#374151'}`,
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '14px' }}>{q.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <div style={{ flex: 1, maxWidth: '240px', height: '6px', backgroundColor: '#374151', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: q.isCompleted ? '#10b981' : '#f97316' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                    {q.currentCount} / {q.targetCount} ({progressPercent}%)
                  </span>
                </div>
              </div>

              <div>
                {q.isClaimed ? (
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>✓ Đã Nhận</span>
                ) : q.isCompleted ? (
                  <button
                    onClick={() => onClaimReward(q.id)}
                    style={{ padding: '6px 14px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    🎁 Nhận +{q.expReward} EXP
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 'bold' }}>+{q.expReward} EXP</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '24px' }}>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#ffffff' }}>Trung Tâm Nhiệm Vụ (Quest Board)</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#9ca3af' }}>
        Hoàn thành các mốc mục tiêu hằng ngày và hằng tuần để nhận thưởng EXP liên tục.
      </p>

      {renderQuestSection('⚡ Nhiệm Vụ Hằng Ngày (Xoay vòng 00:00)', dailyQuests)}
      {renderQuestSection('🏆 Nhiệm Vụ Hằng Tuần (Chốt Chủ Nhật 23:59)', weeklyQuests)}
    </div>
  );
};
