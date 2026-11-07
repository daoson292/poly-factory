import React, { useState, useEffect } from 'react';

interface RoomAndShiftPageProps {
  token: string;
}

export const RoomAndShiftPage: React.FC<RoomAndShiftPageProps> = ({ token }) => {
  const [roomStatus, setRoomStatus] = useState<any>({ name: 'P407', status: 'OPEN', revertAt: null });
  const [urgentPopup, setUrgentPopup] = useState<any>(null);
  const [selectedShift, setSelectedShift] = useState<number>(1);
  const [ticketType, setTicketType] = useState<'LEAVE' | 'LATE'>('LEAVE');
  const [ticketReason, setTicketReason] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    // 1. Tải trạng thái phòng xưởng P407
    fetch('/api/rooms/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setRoomStatus(data);
      })
      .catch(() => {});

    // 2. Tải thông báo khẩn Popup nếu có
    fetch('/api/notifications/urgent-popup', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.length > 0) setUrgentPopup(data[0]);
      })
      .catch(() => {});
  }, [token]);

  const handleAcknowledgePopup = async () => {
    if (!urgentPopup) return;
    try {
      await fetch(`/api/notifications/${urgentPopup.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUrgentPopup(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterShift = async () => {
    setFeedback(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/schedules/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workDate: today,
          shiftNumber: selectedShift,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback('✅ Đăng ký ca trực thành công!');
      } else {
        setFeedback(`❌ Lỗi đăng ký: ${data.message}`);
      }
    } catch (err: any) {
      setFeedback(`❌ Lỗi mạng: ${err.message}`);
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketReason.trim()) {
      setFeedback('❌ Vui lòng nhập lý do xin nghỉ/đi muộn.');
      return;
    }
    setFeedback(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workDate: today,
          shiftNumber: selectedShift,
          ticketType,
          reason: ticketReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback('✅ Đã gửi đơn thành công. Đang chờ Team Lead / Mentor duyệt.');
        setTicketReason('');
      } else {
        setFeedback(`❌ Lỗi gửi đơn: ${data.message}`);
      }
    } catch (err: any) {
      setFeedback(`❌ Lỗi gửi đơn: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      {/* URGENT POPUP OVERLAY */}
      {urgentPopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%' }}>
            <h3 style={{ color: '#d32f2f', marginTop: 0 }}>🚨 THÔNG BÁO KHẨN TỪ XƯỞNG</h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: '#333' }}>{urgentPopup.content}</p>
            <button
              onClick={handleAcknowledgePopup}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#d32f2f',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Tôi đã nắm rõ thông tin
            </button>
          </div>
        </div>
      )}

      {/* ROOM STATUS CARD */}
      <div
        style={{
          background: roomStatus.status === 'OPEN' ? '#e8f5e9' : '#ffebee',
          padding: 16,
          borderRadius: 12,
          marginBottom: 20,
          border: `1px solid ${roomStatus.status === 'OPEN' ? '#a5d6a7' : '#ef9a9a'}`,
        }}
      >
        <h4 style={{ margin: 0, color: roomStatus.status === 'OPEN' ? '#2e7d32' : '#c62828' }}>
          Phòng xưởng {roomStatus.name}: {roomStatus.status}
        </h4>
        {roomStatus.revertAt && (
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Tự động hoàn về OPEN lúc: {new Date(roomStatus.revertAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* 6 SHIFTS REGISTRATION */}
      <div style={{ background: '#f5f7fa', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Đăng ký Ca trực hôm nay</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {[1, 2, 3, 4, 5, 6].map((shiftNum) => (
            <button
              key={shiftNum}
              onClick={() => setSelectedShift(shiftNum)}
              style={{
                padding: '10px 4px',
                borderRadius: 8,
                border: selectedShift === shiftNum ? '2px solid #0052cc' : '1px solid #ccc',
                backgroundColor: selectedShift === shiftNum ? '#e3f2fd' : '#fff',
                fontWeight: selectedShift === shiftNum ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
            >
              Ca {shiftNum}
            </button>
          ))}
        </div>
        <button
          onClick={handleRegisterShift}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#0052cc',
            color: '#fff',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Đăng ký Ca {selectedShift}
        </button>
      </div>

      {/* LEAVE / LATE TICKET FORM */}
      <div style={{ background: '#f5f7fa', padding: 16, borderRadius: 12 }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Gửi Đơn Xin Nghỉ / Đi Muộn</h4>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <button
            onClick={() => setTicketType('LEAVE')}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 6,
              border: ticketType === 'LEAVE' ? '2px solid #0052cc' : '1px solid #ccc',
              backgroundColor: ticketType === 'LEAVE' ? '#e3f2fd' : '#fff',
            }}
          >
            Xin nghỉ (LEAVE)
          </button>
          <button
            onClick={() => setTicketType('LATE')}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 6,
              border: ticketType === 'LATE' ? '2px solid #0052cc' : '1px solid #ccc',
              backgroundColor: ticketType === 'LATE' ? '#e3f2fd' : '#fff',
            }}
          >
            Đi muộn (LATE)
          </button>
        </div>
        <textarea
          value={ticketReason}
          onChange={(e) => setTicketReason(e.target.value)}
          placeholder="Lý do xin nghỉ / đi muộn (gửi trước ca >= 30 phút)..."
          rows={3}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ccc',
            boxSizing: 'border-box',
            marginBottom: 10,
          }}
        />
        <button
          onClick={handleSubmitTicket}
          style={{
            width: '100%',
            padding: 10,
            backgroundColor: '#e65100',
            color: '#fff',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Gửi đơn duyệt
        </button>
      </div>

      {feedback && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#fff3e0', fontSize: 14 }}>
          {feedback}
        </div>
      )}
    </div>
  );
};
export default RoomAndShiftPage;
