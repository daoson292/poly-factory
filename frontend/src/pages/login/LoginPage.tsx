import React, { useState } from 'react';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSimulateGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setErrorCode(null);

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          googleId: `google_${Date.now()}`,
          name: emailInput.split('@')[0]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorCode(data.errorCode || 'E-polyfactory-001');
        setErrorMsg(data.message || 'Đăng nhập không thành công.');
        return;
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg('Không thể kết nối đến máy chủ PolyFactory.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '28px', fontWeight: 'bold', marginBottom: '12px' }}>
            PF
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 6px 0' }}>PolyFactory v2.2.0</h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Cổng Thông Tin Xưởng Thực Chiến FPT Polytechnic</p>
        </div>

        {errorCode && (
          <div style={{ backgroundColor: '#451a1a', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#fca5a5', fontSize: '13px' }}>
            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span> Mã lỗi: {errorCode}
            </div>
            <div style={{ marginTop: '4px' }}>{errorMsg}</div>
            {errorCode === 'E-polyfactory-001' && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#f87171' }}>
                * Vui lòng liên hệ Thầy/Mentor bộ môn để được thêm vào danh sách Whitelist của xưởng.
              </div>
            )}
            {errorCode === 'E-polyfactory-002' && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#f87171' }}>
                * Tài khoản đã bị khóa do vi phạm quy định hoặc tích lũy Tag xấu vượt giới hạn.
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSimulateGoogleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#d1d5db', marginBottom: '6px', fontWeight: '500' }}>
              Email FPT Education (@fpt.edu.vn)
            </label>
            <input
              type="email"
              required
              placeholder="sondaopk@fpt.edu.vn"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #374151', backgroundColor: '#1e293b', color: '#ffffff', fontSize: '14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f97316',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập với Google FPT'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
          Đăng nhập an toàn theo cơ chế Whitelist & PolyPerms 7 bước
        </div>
      </div>
    </div>
  );
};
