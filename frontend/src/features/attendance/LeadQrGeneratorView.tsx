import React, { useState, useEffect } from 'react';
import { AttendanceRecord } from '../../types';

interface LeadQrGeneratorViewProps {
  shiftNumber: number;
  records: AttendanceRecord[];
  onDelegateShift: () => void;
  onManualCheckIn: (userEmail: string) => void;
}

export const LeadQrGeneratorView: React.FC<LeadQrGeneratorViewProps> = ({
  shiftNumber,
  records,
  onDelegateShift,
  onManualCheckIn
}) => {
  const [cycleSeconds, setCycleSeconds] = useState<10 | 20 | 30>(20);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [currentOtpCode, setCurrentOtpCode] = useState<string>('842910');

  useEffect(() => {
    setTimeLeft(cycleSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Regenerate dynamic OTP code locally
          setCurrentOtpCode(Math.floor(100000 + Math.random() * 900000).toString());
          return cycleSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cycleSeconds]);

  const progressPercent = (timeLeft / cycleSeconds) * 100;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      {/* QR Display Panel */}
      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f97316' }}>MÃ QR ĐIỂM DANH CA {shiftNumber}</span>
          <button
            onClick={onDelegateShift}
            style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#374151', color: '#fbbf24', border: '1px solid #d97706', borderRadius: '6px', cursor: 'pointer' }}
          >
            🤝 Ủy quyền trực ca hôm nay
          </button>
        </div>

        {/* Cycle selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          {[10, 20, 30].map((sec) => (
            <button
              key={sec}
              onClick={() => setCycleSeconds(sec as 10 | 20 | 30)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: cycleSeconds === sec ? '#f97316' : '#1e293b',
                color: '#ffffff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Chu kỳ {sec}s
            </button>
          ))}
        </div>

        {/* QR Code Canvas Box */}
        <div style={{
          width: '240px',
          height: '240px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
        }}>
          {/* Simulated QR Pattern */}
          <div style={{ width: '180px', height: '180px', backgroundColor: '#000000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '20px', fontWeight: 'bold' }}>
            PF-{currentOtpCode}
          </div>
          <div style={{ color: '#000000', fontSize: '11px', marginTop: '6px', fontWeight: 'bold' }}>
            TOTP: {currentOtpCode}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: '240px', height: '6px', backgroundColor: '#374151', borderRadius: '3px', margin: '16px auto 8px auto', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#f97316', transition: 'width 1s linear' }} />
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Đổi mã sau: {timeLeft}s</div>
      </div>

      {/* Attendance Realtime Log Panel */}
      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
          Danh Sách Điểm Danh ({records.length} người)
        </h3>

        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {records.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '30px 0' }}>Chưa có thành viên quét mã trong ca này.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {records.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    backgroundColor: '#1f2937',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#ffffff' }}>{rec.userName}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{rec.userEmail} • {rec.checkInTime}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {rec.isWalkIn && <span style={{ fontSize: '10px', backgroundColor: '#374151', color: '#d1d5db', padding: '2px 6px', borderRadius: '4px' }}>WALK-IN</span>}
                    {rec.isGpsValid ? (
                      <span title={`Hợp lệ (${rec.distanceMeters}m)`} style={{ color: '#10b981', fontSize: '16px' }}>🟢</span>
                    ) : (
                      <span title={`Ngoài bán kính (${rec.distanceMeters}m)`} style={{ color: '#ef4444', fontSize: '16px' }}>🔴</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
