import React, { useState } from 'react';

interface TrainingTask {
  id: string;
  title: string;
  level: number; // 1, 2, 3
  isRequired: boolean;
  isSubmitted: boolean;
  submissionLink?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface TraineeRoadmapViewProps {
  currentLevel: number;
  tasks: TrainingTask[];
  onSubmitTask: (taskId: string, link: string) => Promise<boolean>;
}

export const TraineeRoadmapView: React.FC<TraineeRoadmapViewProps> = ({
  currentLevel,
  tasks,
  onSubmitTask
}) => {
  const [selectedTask, setSelectedTask] = useState<TrainingTask | null>(null);
  const [submitLink, setSubmitLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const levels = [
    { level: 1, title: 'Level 1: Nhập Môn Văn Hóa & Công Cụ', tag: 'Lv1' },
    { level: 2, title: 'Level 2: Thực Chiến Kỹ Thuật Cơ Bản', tag: 'Lv2' },
    { level: 3, title: 'Level 3: Đồ Án Nhập Môn & Tốt Nghiệp', tag: 'Tốt nghiệp Training' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsSubmitting(true);
    await onSubmitTask(selectedTask.id, submitLink);
    setIsSubmitting(false);
    setSelectedTask(null);
    setSubmitLink('');
  };

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '24px' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#ffffff' }}>Lộ Trình Nhập Môn Xưởng (Training Roadmap)</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#9ca3af' }}>
        Hoàn thành bài tập bắt buộc và duy trì chuyên cần $\ge 70\%$ để nhận Tag và thăng cấp lên Member mở khóa 6 Công pháp.
      </p>

      {/* Level Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {levels.map((lvl) => {
          const isCurrent = currentLevel === lvl.level;
          const isPassed = currentLevel > lvl.level;
          const levelTasks = tasks.filter(t => t.level === lvl.level);

          return (
            <div
              key={lvl.level}
              style={{
                backgroundColor: isPassed ? '#064e3b' : isCurrent ? '#1e293b' : '#0f172a',
                border: `1px solid ${isPassed ? '#059669' : isCurrent ? '#f97316' : '#334155'}`,
                borderRadius: '10px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{isPassed ? '✅' : isCurrent ? '⏳' : '🔒'}</span>
                  <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '15px' }}>{lvl.title}</span>
                </div>
                <span style={{ fontSize: '11px', backgroundColor: '#374151', color: '#fbbf24', padding: '3px 8px', borderRadius: '4px' }}>
                  {lvl.tag}
                </span>
              </div>

              {/* Tasks in this level */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {levelTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      backgroundColor: '#111827',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}
                  >
                    <div>
                      <span style={{ color: '#ffffff' }}>{task.title}</span>
                      {task.isRequired && <span style={{ marginLeft: '6px', color: '#ef4444', fontSize: '11px' }}>*Bắt buộc</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {task.status === 'APPROVED' ? (
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>Đã duyệt</span>
                      ) : task.isSubmitted ? (
                        <span style={{ color: '#fbbf24' }}>Chờ duyệt</span>
                      ) : (
                        <button
                          onClick={() => setSelectedTask(task)}
                          style={{ padding: '4px 10px', backgroundColor: '#f97316', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Nộp bài
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Submit Dialog */}
      {selectedTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1f2937', padding: '24px', borderRadius: '10px', width: '90%', maxWidth: '400px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#ffffff' }}>Nộp bài: {selectedTask.title}</h4>
            <form onSubmit={handleSubmit}>
              <input
                type="url"
                required
                placeholder="https://github.com/... hoặc link Google Drive"
                value={submitLink}
                onChange={(e) => setSubmitLink(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#ffffff', fontSize: '13px', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setSelectedTask(null)} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #4b5563', color: '#9ca3af', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '6px 12px', backgroundColor: '#f97316', border: 'none', color: '#ffffff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{isSubmitting ? 'Đang gửi...' : 'Xác nhận nộp'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
