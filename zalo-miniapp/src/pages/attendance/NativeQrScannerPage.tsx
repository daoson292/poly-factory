import React, { useState } from 'react';

interface NativeQrScannerPageProps {
  token: string;
}

export const NativeQrScannerPage: React.FC<NativeQrScannerPageProps> = ({ token }) => {
  const [scanning, setScanning] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'LOCATING' | 'IN_RANGE' | 'OUT_OF_RANGE'>('IDLE');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [checkinResult, setCheckinResult] = useState<{ success: boolean; message: string; expGained?: number } | null>(null);

  // Tọa độ tham chiếu chuẩn của Xưởng P407 FPT Polytechnic (Hà Nội)
  const WORKSHOP_LAT = 21.0381;
  const WORKSHOP_LNG = 105.7468;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleStartCheckin = async () => {
    setScanning(true);
    setCheckinResult(null);
    setGpsStatus('LOCATING');

    try {
      // 1. Lấy tọa độ GPS gốc qua HTML5 Geolocation hoặc Zalo SDK
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ latitude: lat, longitude: lng });

          const distance = calculateDistance(lat, lng, WORKSHOP_LAT, WORKSHOP_LNG);
          if (distance <= 150) {
            setGpsStatus('IN_RANGE');
          } else {
            setGpsStatus('OUT_OF_RANGE');
          }

          // 2. Mở Camera quét mã QR (hoặc nhập mã TOTP)
          const scannedTotpToken = window.prompt('Nhập mã TOTP từ màn hình Lead hoặc giả lập quét QR:', '123456');
          if (!scannedTotpToken) {
            setScanning(false);
            return;
          }

          // 3. Gửi điểm danh lên backend
          const res = await fetch('/api/attendance/check-in', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              totpToken: scannedTotpToken,
              latitude: lat,
              longitude: lng,
              deviceId: `zalo_device_${window.navigator.userAgent.slice(0, 20)}`,
            }),
          });

          const data = await res.json();
          if (res.ok) {
            setCheckinResult({
              success: true,
              message: 'Điểm danh ca trực thành công!',
              expGained: data.expGained ?? 10,
            });
          } else {
            setCheckinResult({
              success: false,
              message: data.message || `Lỗi điểm danh (${data.errorCode || 'UNKNOWN'}).`,
            });
          }
          setScanning(false);
        },
        (error) => {
          setScanning(false);
          setGpsStatus('OUT_OF_RANGE');
          setCheckinResult({
            success: false,
            message: `Không lấy được tọa độ GPS: ${error.message}. Vui lòng cấp quyền vị trí cho Zalo.`,
          });
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    } catch (err: any) {
      setScanning(false);
      setCheckinResult({ success: false, message: err.message });
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h3 style={{ color: '#0052cc', marginBottom: 12 }}>Điểm danh QR & GPS Native Zalo</h3>

      <div style={{ background: '#f5f7fa', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>Trạng thái GPS xưởng:</span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 'bold',
              color: '#fff',
              backgroundColor:
                gpsStatus === 'IN_RANGE' ? '#2e7d32' : gpsStatus === 'OUT_OF_RANGE' ? '#d32f2f' : '#757575',
            }}
          >
            {gpsStatus === 'IN_RANGE'
              ? 'Xanh (Hợp lệ <= 150m)'
              : gpsStatus === 'OUT_OF_RANGE'
              ? 'Đỏ (Ngoài bán kính)'
              : 'Chưa định vị'}
          </span>
        </div>
        {coords && (
          <div style={{ fontSize: 12, color: '#666' }}>
            Tọa độ: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
          </div>
        )}
      </div>

      <button
        onClick={handleStartCheckin}
        disabled={scanning}
        style={{
          width: '100%',
          padding: '14px 20px',
          backgroundColor: scanning ? '#888' : '#2e7d32',
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          border: 'none',
          borderRadius: 8,
          cursor: scanning ? 'not-allowed' : 'pointer',
          marginBottom: 16,
        }}
      >
        {scanning ? 'Đang bật Camera Zalo & GPS...' : 'Bật Camera Zalo Quét Mã QR'}
      </button>

      {checkinResult && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            backgroundColor: checkinResult.success ? '#e8f5e9' : '#ffebee',
            color: checkinResult.success ? '#2e7d32' : '#c62828',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {checkinResult.success ? '✅ ' : '❌ '} {checkinResult.message}
          {checkinResult.expGained && <div>Thưởng: +{checkinResult.expGained} EXP</div>}
        </div>
      )}
    </div>
  );
};
export default NativeQrScannerPage;
