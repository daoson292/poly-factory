import React, { useState } from 'react';
import { Position } from '../../types';

interface TalentMember {
  id: string;
  fullName: string;
  email: string;
  positions: Position[];
  techSkills: string[];
  isAvailable: boolean;
  currentLevel: number;
  completedProjectsCount: number;
}

interface MemberTalentDirectoryPageProps {
  members: TalentMember[];
  onContactMember: (email: string) => void;
}

export const MemberTalentDirectoryPage: React.FC<MemberTalentDirectoryPageProps> = ({
  members,
  onContactMember
}) => {
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [skillSearch, setSkillSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filteredMembers = members.filter((m) => {
    const matchPos = selectedPosition === 'ALL' || m.positions.includes(selectedPosition as Position);
    const matchSkill = !skillSearch || m.techSkills.some(s => s.toLowerCase().includes(skillSearch.toLowerCase()));
    const matchAvail = !onlyAvailable || m.isAvailable;
    return matchPos && matchSkill && matchAvail;
  });

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff' }}>Danh Bạ Nhân Sự & Tìm Kiếm Tài Năng 6 Công Pháp</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
          Tra cứu kỹ năng công nghệ, hướng chuyên môn và trạng thái sẵn sàng tham gia dự án thực chiến.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
        >
          <option value="ALL">Tất cả 6 Công Pháp</option>
          <option value="FRONTEND">FRONTEND</option>
          <option value="BACKEND">BACKEND</option>
          <option value="FULLSTACK">FULLSTACK</option>
          <option value="TESTER">TESTER</option>
          <option value="UI_UX">UI_UX</option>
          <option value="BA">BA</option>
        </select>

        <input
          type="text"
          placeholder="Tìm kỹ năng (React, NestJS, Figma, Docker...)"
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Chỉ người đang rảnh (Ready)
        </label>
      </div>

      {/* Talent Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filteredMembers.map((m) => (
          <div
            key={m.id}
            style={{
              backgroundColor: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#ffffff' }}>{m.fullName}</h3>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.email}</div>
                </div>
                <span style={{
                  fontSize: '11px',
                  backgroundColor: m.isAvailable ? '#064e3b' : '#374151',
                  color: m.isAvailable ? '#6ee7b7' : '#9ca3af',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}>
                  {m.isAvailable ? '🟢 RẢNH' : '⚪ ĐANG CÓ DỰ ÁN'}
                </span>
              </div>

              {/* Positions */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '10px 0' }}>
                {m.positions.map((p) => (
                  <span key={p} style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                    {p}
                  </span>
                ))}
              </div>

              {/* Tech skills */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {m.techSkills.map((sk) => (
                  <span key={sk} style={{ backgroundColor: '#1e293b', color: '#cbd5e1', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #1f2937', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#f97316' }}>Lv.{m.currentLevel} • {m.completedProjectsCount} dự án</span>
              <button
                onClick={() => onContactMember(m.email)}
                style={{ padding: '4px 10px', backgroundColor: '#374151', color: '#38bdf8', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                Mời vào Team
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
