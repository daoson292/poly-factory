import React, { useState } from 'react';
import { ProjectCertificateCard } from '../../features/projects/ProjectCertificateCard';
import { Position } from '../../types';

export const VerifyCertificatePage: React.FC = () => {
  const [searchCode, setSearchCode] = useState('');
  const [certData, setCertData] = useState<{
    certificateCode: string;
    recipientName: string;
    projectName: string;
    position: Position;
    issuedDate: string;
    metricsSummary: string;
  } | null>(null);
  const [searched, setSearched] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);

    // Mock look up by code pattern PF-CERT-YYYY-XXXX
    if (searchCode.toUpperCase().startsWith('PF-CERT-')) {
      setCertData({
        certificateCode: searchCode.toUpperCase(),
        recipientName: 'Đào Duy Sơn',
        projectName: 'PolyFactory v2.2.0 Monolith',
        position: 'FULLSTACK',
        issuedDate: new Date().toISOString().split('T')[0],
        metricsSummary: '48 Commits • 14 PRs Merged • 77 Unit Tests Passing'
      });
    } else {
      setCertData(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#ffffff', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#f59e0b' }}>
          Tra Cứu & Xác Thực Chứng Chỉ PolyFactory
        </h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          Hệ thống xác thực chứng chỉ trực tuyến chống làm giả của FPT Polytechnic
        </p>

        <form onSubmit={handleVerify} style={{ display: 'flex', gap: '8px', maxWidth: '420px', margin: '24px auto 0 auto' }}>
          <input
            type="text"
            required
            placeholder="PF-CERT-2026-0001"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '14px', textAlign: 'center', fontFamily: 'monospace' }}
          />
          <button
            type="submit"
            style={{ padding: '12px 20px', backgroundColor: '#f97316', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
          >
            Tra Cứu
          </button>
        </form>
      </div>

      {searched && (
        certData ? (
          <div>
            <ProjectCertificateCard {...certData} />
          </div>
        ) : (
          <div style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#451a1a', border: '1px solid #ef4444', borderRadius: '10px', padding: '20px', textAlign: 'center', color: '#fca5a5', fontSize: '14px' }}>
            ❌ Không tìm thấy chứng chỉ với mã số này trên hệ thống PolyFactory.
          </div>
        )
      )}
    </div>
  );
};
