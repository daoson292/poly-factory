import React, { useState, useEffect } from 'react';

interface TrainingAndProfilePageProps {
  token: string;
}

export const TrainingAndProfilePage: React.FC<TrainingAndProfilePageProps> = ({ token }) => {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const POSITIONS = ['FRONTEND', 'BACKEND', 'FULLSTACK', 'TESTER', 'UI_UX', 'BA'];

  useEffect(() => {
    // 1. Tải hồ sơ người dùng
    fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => {});

    // 2. Tải bài tập Training
    fetch('/api/training/tasks', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) {
          setTasks(data);
          if (data.length > 0) setSelectedTaskId(data[0].id);
        }
      })
      .catch(() => {});
  }, [token]);

  const handleSubmitTask = async () => {
    if (!submissionUrl.trim()) {
      setFeedback('❌ Vui lòng dán link bài làm (Docs/Drive/GitHub/Figma).');
      return;
    }
    setFeedback(null);
    try {
      const res = await fetch(`/api/training/tasks/${selectedTaskId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ submissionUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback('✅ Nộp bài tập thành công! Đang chờ Lead duyệt.');
        setSubmissionUrl('');
      } else {
        setFeedback(`❌ Lỗi nộp bài: ${data.message}`);
      }
    } catch (err: any) {
      setFeedback(`❌ Lỗi kết nối: ${err.message}`);
    }
  };

  const handleSelectPosition = async (pos: string) => {
    setFeedback(null);
    try {
      const currentPositions: string[] = profile?.positions || [];
      const updated = currentPositions.includes(pos)
        ? currentPositions.filter((p) => p !== pos)
        : [...currentPositions, pos];

      const res = await fetch('/api/users/positions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ positions: updated }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile({ ...profile, positions: updated });
        setFeedback('✅ Cập nhật Công pháp chuyên môn thành công!');
      } else {
        setFeedback(`❌ Lỗi cập nhật: ${data.message}`);
      }
    } catch (err: any) {
      setFeedback(`❌ Lỗi kết nối: ${err.message}`);
    }
  };

  if (!profile) return <div style={{ padding: 20 }}>Đang tải thông tin cá nhân...</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      {/* EXP & LEVEL CARD */}
      <div style={{ background: '#0052cc', color: '#fff', borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 6px 0' }}>{profile.fullName || profile.email}</h3>
        <div style={{ fontSize: 13, opacity: 0.9 }}>Vai trò: {profile.role}</div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 24, fontWeight: 'bold' }}>Cấp {profile.currentLevel || 1}</span>
          <span style={{ fontSize: 16 }}>{profile.currentExp || 0} EXP</span>
        </div>

        {/* 5-SHIFT CURSE REMOVAL PROGRESS */}
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 12 }}>Chuỗi gỡ phong ấn Tag Xấu (Mục 6.13):</div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>
            {profile.consecutiveOnTimeShifts || 0} / 5 ca liên tiếp
          </div>
        </div>
      </div>

      {/* 6 CONG PHAP (POSITIONS) */}
      <div style={{ background: '#f5f7fa', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Chọn 6 Công pháp (Chuyên môn)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {POSITIONS.map((pos) => {
            const isSelected = profile.positions?.includes(pos);
            return (
              <button
                key={pos}
                onClick={() => handleSelectPosition(pos)}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 'bold',
                  border: isSelected ? '2px solid #0052cc' : '1px solid #ccc',
                  backgroundColor: isSelected ? '#e3f2fd' : '#fff',
                  color: isSelected ? '#0052cc' : '#333',
                  cursor: 'pointer',
                }}
              >
                {pos}
              </button>
            );
          })}
        </div>
      </div>

      {/* TRAINING SUBMISSION */}
      <div style={{ background: '#f5f7fa', padding: 16, borderRadius: 12 }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Nộp bài tập Training</h4>
        {tasks.length > 0 ? (
          <>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 6, marginBottom: 10 }}
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <input
              type="url"
              placeholder="Dán link Docs/Drive/GitHub..."
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ccc',
                marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleSubmitTask}
              style={{
                width: '100%',
                padding: 10,
                backgroundColor: '#2e7d32',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Nộp bài tập
            </button>
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#666' }}>Không có bài tập mở cho cấp độ hiện tại.</div>
        )}
      </div>

      {feedback && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: '#fff3e0', fontSize: 13 }}>
          {feedback}
        </div>
      )}
    </div>
  );
};
export default TrainingAndProfilePage;
