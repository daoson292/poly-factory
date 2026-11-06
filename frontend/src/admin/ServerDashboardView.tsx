import React from 'react';

interface ServerMetrics {
  cpuUsagePercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number; // 1200 MB
  postgresConnections: number;
  maxPostgresConnections: number; // 18
  uptimeSeconds: number;
}

interface ServerDashboardViewProps {
  metrics: ServerMetrics;
}

export const ServerDashboardView: React.FC<ServerDashboardViewProps> = ({ metrics }) => {
  const ramPercent = Math.round((metrics.memoryUsedMb / metrics.memoryLimitMb) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ marginBottom: '6px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff' }}>Giám Sát Hạ Tầng & Phần Cứng Server</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
          Đảm bảo toàn bộ hệ thống vận hành trong giới hạn RAM trần ≤ 1.2 GB (NFR-polyfactory-030).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {/* RAM Metric Card */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>TỔNG RAM DOCKER COMPOSE</span>
            <span style={{ fontSize: '18px' }}>💾</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: ramPercent > 85 ? '#ef4444' : '#10b981', margin: '12px 0 6px 0' }}>
            {metrics.memoryUsedMb} MB / {metrics.memoryLimitMb} MB
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${ramPercent}%`, height: '100%', backgroundColor: ramPercent > 85 ? '#ef4444' : '#10b981' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
            Giới hạn: Postgres (400M) • Backend (600M) • Nginx (100M)
          </div>
        </div>

        {/* CPU Metric Card */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>TẢI CPU</span>
            <span style={{ fontSize: '18px' }}>⚡</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', margin: '12px 0 6px 0' }}>
            {metrics.cpuUsagePercent}%
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${metrics.cpuUsagePercent}%`, height: '100%', backgroundColor: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
            CPU 2 vCPU Intel Xeon máy chủ xưởng P407
          </div>
        </div>

        {/* Postgres Pool Card */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>POSTGRESQL CONNECTION POOL</span>
            <span style={{ fontSize: '18px' }}>🐘</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a855f7', margin: '12px 0 6px 0' }}>
            {metrics.postgresConnections} / {metrics.maxPostgresConnections} Pools
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(metrics.postgresConnections / metrics.maxPostgresConnections) * 100}%`, height: '100%', backgroundColor: '#a855f7' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
            Cấu hình Connection Limit = 18 chống tràn tài nguyên
          </div>
        </div>
      </div>
    </div>
  );
};
