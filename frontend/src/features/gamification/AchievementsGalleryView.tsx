import React from 'react';

export interface AchievementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  expReward: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

interface AchievementsGalleryViewProps {
  achievements: AchievementItem[];
}

export const AchievementsGalleryView: React.FC<AchievementsGalleryViewProps> = ({
  achievements
}) => {
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>Phòng Truyền Thống Thành Tựu (Achievements Gallery)</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Huy hiệu danh giá tự động mở khóa qua Event Bus khi đạt các cột mốc thực chiến.
          </p>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', color: '#f59e0b', fontWeight: 'bold' }}>
          Đã đạt: {unlockedCount} / {achievements.length} Thành tựu
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
        {achievements.map((ach) => (
          <div
            key={ach.id}
            style={{
              backgroundColor: ach.isUnlocked ? '#1e293b' : '#0f172a',
              border: `1px solid ${ach.isUnlocked ? '#f59e0b' : '#334155'}`,
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              opacity: ach.isUnlocked ? 1 : 0.6
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: ach.isUnlocked ? '#f59e0b' : '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              {ach.isUnlocked ? ach.icon : '🔒'}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: ach.isUnlocked ? '#ffffff' : '#9ca3af', fontSize: '14px' }}>
                {ach.title}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.3 }}>
                {ach.description}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>+{ach.expReward} EXP</span>
                {ach.isUnlocked && (
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{ach.unlockedAt}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
