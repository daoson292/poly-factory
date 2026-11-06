import React, { useState } from 'react';

interface MemberQrScannerViewProps {
  onScanSuccess: (otpCode: string, lat: number, lng: number) => Promise<{ success: boolean; expAwarded?: number; message?: string }>;
}

export const MemberQrScannerView: React.FC<MemberQrScannerViewProps> = ({ onScanSuccess }) => {
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  const handleSimulateScan = async (codeToUse: string) => {
    setIsScanning(true);
    setResultMsg(null);

    // Mock geolocation: P407 is around 21.0381, 105.7468
    const lat = 21.0381;
    const lng = 105.7468;

    try {
      const res = await onScanSuccess(codeToUse, lat, lng);
      if (res.success) {
        setResultMsg({
          type: 'SUCCESS',
          text: `🎉 Điểm danh thành công! Nhận được +${res.expAwarded || 10} EXP.`
        });
      } else {
        setResultMsg({
          type: 'ERROR',
          text: res.message || 'Mã QR không hợp lệ hoặc đã hết hạn.'
        });
      }
    } catch (err: any) {
      setResultMsg({ type: 'ERROR', text: 'Lỗi kết nối khi quét mã điểm danh.' });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '20px', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#ffffff' }}>Quét Mã QR Điểm Danh Ca Trực</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#9ca3af' }}>
        Thiết bị được khóa 1 máy / 1 ca. Vui lòng bật định vị GPS trong bán kính 150m.
      </p>

      {/* Camera Preview Frame */}
      <div style={{
        width: '100%',
        maxWidth: '280px',
        height: '240px',
        margin: '0 auto 20px auto',
        backgroundColor: '#030712',
        border: '2px dashed #f97316',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <span style={{ fontSize: '48px', marginBottom: '8px' }}>📷</span>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Khung Camera Quét QR</span>
        <button
          onClick={() => handleSimulateScan('842910')}
          disabled={isScanning}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            backgroundColor: '#f97316',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {isScanning ? 'Đang xác thực GPS & Khóa máy...' : 'Bấm để Quét Nhanh'}
        </button>
      </div>

      {resultMsg && (
        <div style={{
          backgroundColor: resultMsg.type === 'SUCCESS' ? '#064e3b' : '#451a1a',
          border: `1px solid ${resultMsg.type === 'SUCCESS' ? '#059669' : '#ef4444'}`,
          borderRadius: '8px',
          padding: '12px',
          color: resultMsg.type === 'SUCCESS' ? '#6ee7b7' : '#fca5a5',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {resultMsg.text}
        </div>
      )}

      {/* Manual Code Input fallback */}
      <div style={{ borderTop: '1px solid #1f2937', paddingTop: '16px', marginTop: '16px' }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Hoặc nhập mã 6 số nếu camera bị mờ:</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', maxWidth: '280px', margin: '0 auto' }}>
          <input
            type="text"
            maxLength={6}
            placeholder="6 số TOTP"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', fontSize: '14px', letterSpacing: '2px' }}
          />
          <button
            onClick={() => handleSimulateScan(manualCode)}
            style={{ padding: '8px 14px', backgroundColor: '#374151', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
          >
            Nhập
          </button>
        </div>
      </div>
    </div>
  );
};
