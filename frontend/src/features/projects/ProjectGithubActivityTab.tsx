import React from 'react';

interface GitHubActivityItem {
  id: string;
  type: 'COMMIT' | 'PR_MERGED';
  authorName: string;
  githubUsername: string;
  message: string;
  shaOrPrNumber: string;
  expAwarded: number;
  timestamp: string;
}

interface ProjectGithubActivityTabProps {
  repoUrl?: string;
  activities: GitHubActivityItem[];
}

export const ProjectGithubActivityTab: React.FC<ProjectGithubActivityTabProps> = ({
  repoUrl,
  activities
}) => {
  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1f2937', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>Hoạt Động GitHub & Tự Động Thưởng EXP</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
            HMAC-SHA256 Webhook tự động đối chiếu tài khoản, thưởng +5 EXP mỗi commit / +15 EXP mỗi PR merged.
          </p>
        </div>

        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 14px',
              backgroundColor: '#1f2937',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔗</span> Mở Kho GitHub
          </a>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}>Chưa ghi nhận commit hoặc PR nào qua Webhook.</div>
        ) : (
          activities.map((act) => (
            <div
              key={act.id}
              style={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{act.type === 'COMMIT' ? '📦' : '🔀'}</span>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: '500' }}>{act.message}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    @{act.githubUsername} ({act.authorName}) • {act.shaOrPrNumber} • {act.timestamp}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                +{act.expAwarded} EXP
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
