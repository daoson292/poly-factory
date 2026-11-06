import React, { useState } from 'react';
import { AvatarWithFrame } from './AvatarWithFrame';
import { Position } from '../../types';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  frameUrl?: string;
  nameColor?: string;
  position: Position;
  level: number;
  metricValue: number; // e.g. 42 shifts or 85 commits or 24 bugs
  metricLabel: string; // e.g. "ca trực" or "commits" or "bugs"
}

interface HallOfFameLeaderboardPageProps {
  attendanceTop: LeaderboardEntry[];
  githubTop: LeaderboardEntry[];
  qaTop: LeaderboardEntry[];
}

export const HallOfFameLeaderboardPage: React.FC<HallOfFameLeaderboardPageProps> = ({
  attendanceTop,
  githubTop,
  qaTop
}) => {
  const [activeTrack, setActiveTrack] = useState<'ATTENDANCE' | 'GITHUB' | 'QA'>('ATTENDANCE');

  const currentList = activeTrack === 'ATTENDANCE'
    ? attendanceTop
    : activeTrack === 'GITHUB'
    ? githubTop
    : qaTop;

  const top1 = currentList.find(e => e.rank === 1);
  const top2 = currentList.find(e => e.rank === 2);
  const top3 = currentList.find(e => e.rank === 3);
  const restList = currentList.filter(e => e.rank > 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#f59e0b', fontWeight: 'bold' }}>
          🏛️ Bục Vinh Danh Bảng Xếp Hạng Tháng (Hall of Fame)
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
          Vinh danh các cá nhân xuất sắc nhất trên 3 chiến tuyến: Chuyên Cần, GitHub và Săn Bug QA.
        </p>
      </div>

      {/* Track Selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button
          onClick={() => setActiveTrack('ATTENDANCE')}
          style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: activeTrack === 'ATTENDANCE' ? '#f97316' : '#1f2937', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          📅 Top Chuyên Cần
        </button>
        <button
          onClick={() => setActiveTrack('GITHUB')}
          style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: activeTrack === 'GITHUB' ? '#f97316' : '#1f2937', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🐙 Top Commit & PR
        </button>
        <button
          onClick={() => setActiveTrack('QA')}
          style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: activeTrack === 'QA' ? '#f97316' : '#1f2937', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🐛 Top Săn Bug & QA
        </button>
      </div>

      {/* Podium for Top 1, 2, 3 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: '16px',
        padding: '30px 10px 10px 10px',
        backgroundColor: '#111827',
        borderRadius: '16px',
        border: '1px solid #1f2937'
      }}>
        {/* Rank 2 (Silver) */}
        {top2 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px' }}>
            <span style={{ fontSize: '20px', marginBottom: '6px' }}>🥈</span>
            <AvatarWithFrame name={top2.fullName} frameUrl={top2.frameUrl} size={64} />
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: top2.nameColor || '#cbd5e1', marginTop: '8px', textAlign: 'center' }}>
              {top2.fullName}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{top2.metricValue} {top2.metricLabel}</div>
            <div style={{ width: '100%', height: '80px', backgroundColor: '#334155', borderRadius: '8px 8px 0 0', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontWeight: 'bold', fontSize: '22px' }}>
              2
            </div>
          </div>
        )}

        {/* Rank 1 (Gold) */}
        {top1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '150px' }}>
            <span style={{ fontSize: '28px', marginBottom: '6px' }}>👑</span>
            <AvatarWithFrame name={top1.fullName} frameUrl={top1.frameUrl} size={84} />
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: top1.nameColor || '#f59e0b', marginTop: '8px', textAlign: 'center' }}>
              {top1.fullName}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>{top1.metricValue} {top1.metricLabel}</div>
            <div style={{ width: '100%', height: '120px', backgroundColor: '#b45309', borderRadius: '8px 8px 0 0', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fef3c7', fontWeight: 'bold', fontSize: '28px', boxShadow: '0 -4px 20px rgba(245, 158, 11, 0.4)' }}>
              1
            </div>
          </div>
        )}

        {/* Rank 3 (Bronze) */}
        {top3 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px' }}>
            <span style={{ fontSize: '20px', marginBottom: '6px' }}>🥉</span>
            <AvatarWithFrame name={top3.fullName} frameUrl={top3.frameUrl} size={64} />
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: top3.nameColor || '#cbd5e1', marginTop: '8px', textAlign: 'center' }}>
              {top3.fullName}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{top3.metricValue} {top3.metricLabel}</div>
            <div style={{ width: '100%', height: '60px', backgroundColor: '#78350f', borderRadius: '8px 8px 0 0', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fed7aa', fontWeight: 'bold', fontSize: '20px' }}>
              3
            </div>
          </div>
        )}
      </div>

      {/* Rest of Leaderboard Table (Ranks 4+) */}
      {restList.length > 0 && (
        <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#9ca3af' }}>
                <th style={{ padding: '8px' }}>Hạng</th>
                <th style={{ padding: '8px' }}>Thành Viên</th>
                <th style={{ padding: '8px' }}>Công Pháp</th>
                <th style={{ padding: '8px' }}>Thành Tích</th>
              </tr>
            </thead>
            <tbody>
              {restList.map((entry) => (
                <tr key={entry.userId} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: '#cbd5e1' }}>#{entry.rank}</td>
                  <td style={{ padding: '8px', fontWeight: '600', color: entry.nameColor || '#ffffff' }}>{entry.fullName}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                      {entry.position}
                    </span>
                  </td>
                  <td style={{ padding: '8px', color: '#10b981', fontWeight: 'bold' }}>
                    {entry.metricValue} {entry.metricLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
