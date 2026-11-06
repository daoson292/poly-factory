import React from 'react';
import { Position } from '../../types';

interface ProjectCertificateCardProps {
  certificateCode: string; // PF-CERT-YYYY-XXXX
  recipientName: string;
  projectName: string;
  position: Position;
  issuedDate: string;
  metricsSummary: string; // e.g. "32 Commits • 6 PRs Merged • 12 Test Cases Executed"
}

export const ProjectCertificateCard: React.FC<ProjectCertificateCardProps> = ({
  certificateCode,
  recipientName,
  projectName,
  position,
  issuedDate,
  metricsSummary
}) => {
  return (
    <div style={{
      maxWidth: '560px',
      margin: '0 auto',
      backgroundColor: '#0f172a',
      border: '2px solid #f59e0b',
      borderRadius: '16px',
      padding: '32px',
      textAlign: 'center',
      position: 'relative',
      boxShadow: '0 10px 30px rgba(245, 158, 11, 0.2)',
      backgroundImage: 'radial-gradient(circle at top right, rgba(245, 158, 11, 0.1), transparent)'
    }}>
      {/* Seal / Badge */}
      <div style={{ display: 'inline-flex', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#000', marginBottom: '16px' }}>
        🎖️
      </div>

      <div style={{ fontSize: '13px', letterSpacing: '0.15em', color: '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase' }}>
        FPT POLYTECHNIC • POLYFACTORY WORKSHOP
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '8px 0 4px 0' }}>
        CHỨNG CHỈ ĐÓNG GÓP DỰ ÁN THỰC CHIẾN
      </h2>

      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px 0' }}>
        Chứng nhận thành tích hoàn thành dự án xuất sắc theo chuẩn công nghiệp
      </p>

      {/* Recipient */}
      <div style={{ borderTop: '1px solid #334155', borderBottom: '1px solid #334155', padding: '16px 0', margin: '16px 0' }}>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>Trao tặng cho:</div>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
          {recipientName}
        </div>
        <div style={{ marginTop: '8px' }}>
          <span style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            Công Pháp: {position}
          </span>
        </div>
      </div>

      {/* Project & Metrics */}
      <div style={{ marginBottom: '20px', fontSize: '13px', color: '#cbd5e1' }}>
        <div>Dự án: <strong style={{ color: '#ffffff' }}>{projectName}</strong></div>
        <div style={{ color: '#10b981', marginTop: '4px', fontSize: '12px' }}>{metricsSummary}</div>
      </div>

      {/* Footer & Verification Code */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px dashed #334155', paddingTop: '16px', fontSize: '11px', color: '#94a3b8' }}>
        <div style={{ textAlign: 'left' }}>
          <div>Ngày cấp: {issuedDate}</div>
          <div style={{ marginTop: '2px' }}>Hội đồng Ban Chủ nhiệm Xưởng</div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#cbd5e1' }}>Mã tra cứu xác thực:</div>
          <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '13px', fontFamily: 'monospace' }}>
            {certificateCode}
          </div>
        </div>
      </div>
    </div>
  );
};
