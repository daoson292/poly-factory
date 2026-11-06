import React, { useState } from 'react';
import { UserProfile, Position } from '../../types';
import { PositionSelectorModal } from './PositionSelectorModal';

interface UserProfileViewProps {
  user: UserProfile;
  streakCount: number; // consecutive attended shifts (0 to 5)
  onUpdatePositions: (positions: Position[]) => Promise<void>;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  user,
  streakCount,
  onUpdatePositions
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stepped level formula: deltaExp = 50 * (floor((L - 1) / 10) + 1)
  const bracket = Math.floor((user.currentLevel - 1) / 10) + 1;
  const expToNextLevel = 50 * bracket;
  const progressPercent = Math.min(100, Math.round((user.currentExp % expToNextLevel) / expToNextLevel * 100));

  const isMemberOrAbove = user.role !== 'TRAINEE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Profile Header Card */}
      <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#ffffff',
            boxShadow: '0 0 16px rgba(37, 99, 235, 0.4)'
          }}>
            {user.fullName.charAt(0)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff' }}>{user.fullName}</h2>
              <span style={{ backgroundColor: '#374151', color: '#f97316', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                {user.role}
              </span>
              <span style={{ backgroundColor: user.status === 'ACTIVE' ? '#064e3b' : '#7f1d1d', color: user.status === 'ACTIVE' ? '#6ee7b7' : '#fca5a5', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                {user.status}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>{user.email}</div>

            {/* Positions */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#d1d5db' }}>Công pháp:</span>
              {user.positions.length > 0 ? (
                user.positions.map((p) => (
                  <span key={p} style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                    {p}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Chưa chọn</span>
              )}

              {isMemberOrAbove && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{ padding: '3px 10px', fontSize: '11px', backgroundColor: '#374151', color: '#f3f4f6', border: '1px solid #4b5563', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ✏️ Thay đổi
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Level & Stepped EXP Progress Bar */}
        <div style={{ marginTop: '24px', borderTop: '1px solid #1f2937', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>
              Cấp Độ: Level {user.currentLevel} (Nhóm bậc thang {bracket})
            </span>
            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>
              {user.currentExp} / {expToNextLevel} EXP khả dụng ({progressPercent}%)
            </span>
          </div>

          <div style={{ width: '100%', height: '10px', backgroundColor: '#1f2937', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#f97316', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      {/* Curse Debuff & 5-Shift Streak Card */}
      <div style={{
        backgroundColor: user.isCurseDebuffed ? '#451a1a' : '#111827',
        border: `1px solid ${user.isCurseDebuffed ? '#ef4444' : '#1f2937'}`,
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{user.isCurseDebuffed ? '💀' : '🛡️'}</span>
            <h3 style={{ margin: 0, fontSize: '16px', color: user.isCurseDebuffed ? '#fca5a5' : '#ffffff' }}>
              {user.isCurseDebuffed ? 'ĐANG BỊ PHONG ẤN TAG XẤU' : 'Trạng Thái Tu Dưỡng Kỷ Luật'}
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
            Chuỗi trực: <strong>{streakCount} / 5 ca liên tiếp</strong>
          </span>
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: user.isCurseDebuffed ? '#fecaca' : '#9ca3af' }}>
          {user.isCurseDebuffed
            ? 'Tài khoản đang dính Tag xấu do vắng ca không phép. Điểm danh đủ 5 ca liên tiếp để gỡ bỏ phong ấn và đưa số lần vắng về 0.'
            : 'Duy trì kỷ luật trực ca đều đặn để không bị dính Tag xấu và bảo toàn EXP.'}
        </p>

        {/* 5-dot Streak indicator */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              style={{
                flex: 1,
                height: '8px',
                borderRadius: '4px',
                backgroundColor: step <= streakCount ? '#10b981' : '#374151',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Badges and Hall of Fame Collection */}
      <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#ffffff' }}>Bộ Sưu Tập Danh Hiệu & Tag</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {user.activeBadges.map((badge, idx) => (
            <span
              key={idx}
              style={{
                backgroundColor: badge.includes('Vua') || badge.includes('Bóng') || badge.includes('Hứa') ? '#7f1d1d' : '#1e3a8a',
                color: badge.includes('Vua') || badge.includes('Bóng') || badge.includes('Hứa') ? '#fca5a5' : '#bfdbfe',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      <PositionSelectorModal
        isOpen={isModalOpen}
        selectedPositions={user.positions}
        onClose={() => setIsModalOpen(false)}
        onSavePositions={onUpdatePositions}
      />
    </div>
  );
};
