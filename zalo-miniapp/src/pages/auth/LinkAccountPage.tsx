import React, { useState, useEffect } from 'react';

interface LinkAccountPageProps {
  onSuccess: (token: string, user: any) => void;
}

export const LinkAccountPage: React.FC<LinkAccountPageProps> = ({ onSuccess }) => {
  const [linkingCode, setLinkingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zaloUserId, setZaloUserId] = useState<string | null>(null);

  useEffect(() => {
    // T064: Tự động đăng nhập nhanh < 0.5s nếu đã liên kết tài khoản trước đó
    const attemptAutoLogin = async () => {
      try {
        setLoading(true);
        // Giả lập hoặc gọi SDK Zalo lấy ID người dùng
        const simulatedZaloId = window.localStorage.getItem('polyfactory_zalo_uid') || 'zalo_member_mock_id';
        setZaloUserId(simulatedZaloId);

        const response = await fetch('/api/zalo/auto-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zaloUserId: simulatedZaloId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            onSuccess(data.token, data.user);
            return;
          }
        }
      } catch (err) {
        console.warn('Auto login not ready, proceed to link code:', err);
      } finally {
        setLoading(false);
      }
    };

    attemptAutoLogin();
  }, [onSuccess]);

  const handleLinkAccount = async () => {
    if (linkingCode.trim().length !== 6) {
      setErrorMessage('Mã liên kết phải gồm đúng 6 chữ số được lấy từ Web PolyFactory.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/zalo/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: linkingCode.trim(),
          zaloUserId: zaloUserId || 'zalo_member_mock_id',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.errorCode === 'E-polyfactory-282') {
          setErrorMessage('Mã liên kết không hợp lệ hoặc đã hết hạn (TTL 10 phút). Vui lòng lấy mã mới trên Web.');
        } else {
          setErrorMessage(data.message || 'Liên kết thất bại. Vui lòng thử lại.');
        }
        return;
      }

      window.localStorage.setItem('polyfactory_zalo_uid', zaloUserId || 'zalo_member_mock_id');
      onSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#0052cc', marginBottom: 8 }}>PolyFactory Zalo Mini App</h2>
        <p style={{ color: '#666', fontSize: 14 }}>
          Liên kết 1 lần duy nhất với tài khoản FPT để điểm danh và nhận thông báo ca trực
        </p>
      </div>

      <div style={{ background: '#f5f7fa', padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
          Nhập mã 6 chữ số từ Web:
        </label>
        <input
          type="text"
          maxLength={6}
          value={linkingCode}
          onChange={(e) => setLinkingCode(e.target.value.replace(/\D/g, ''))}
          placeholder="VD: 123456"
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 24,
            textAlign: 'center',
            letterSpacing: 6,
            fontWeight: 'bold',
            borderRadius: 8,
            border: '1px solid #ccc',
            boxSizing: 'border-box',
          }}
        />
        {errorMessage && (
          <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 10, textAlign: 'left' }}>
            ⚠️ {errorMessage}
          </div>
        )}
      </div>

      <button
        onClick={handleLinkAccount}
        disabled={loading || linkingCode.length !== 6}
        style={{
          width: '100%',
          padding: '12px 20px',
          backgroundColor: loading || linkingCode.length !== 6 ? '#a0bce8' : '#0052cc',
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          border: 'none',
          borderRadius: 8,
          cursor: loading || linkingCode.length !== 6 ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Đang xác thực...' : 'Liên kết tài khoản'}
      </button>
    </div>
  );
};
export default LinkAccountPage;
