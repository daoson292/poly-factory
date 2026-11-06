import React, { useState } from 'react';
import { ShiftSchedule } from '../../types';

interface WeeklyShiftGridProps {
  shifts: ShiftSchedule[];
  onRegisterShift: (shiftId: string) => void;
  onCancelShift: (shiftId: string) => void;
  onCopyLastWeek: () => void;
}

export const WeeklyShiftGrid: React.FC<WeeklyShiftGridProps> = ({
  shifts,
  onRegisterShift,
  onCancelShift,
  onCopyLastWeek
}) => {
  const [selectedShiftForLeave, setSelectedShiftForLeave] = useState<string | null>(null);

  const shiftTimes = [
    { number: 1, time: '07:30 - 09:30' },
    { number: 2, time: '09:45 - 11:45' },
    { number: 3, time: '12:30 - 14:30' },
    { number: 4, time: '14:45 - 16:45' },
    { number: 5, time: '17:15 - 19:15' },
    { number: 6, time: '19:30 - 21:30' }
  ];

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>Lịch 6 Ca Trực Trong Tuần</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>Đăng ký hoặc hủy ca trước tối thiểu 2 tiếng (luật BR-060).</p>
        </div>
        <button
          onClick={onCopyLastWeek}
          style={{
            padding: '8px 14px',
            backgroundColor: '#374151',
            color: '#f97316',
            border: '1px solid #4b5563',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          📋 Sao chép lịch tuần trước
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {shiftTimes.map((st) => {
          const shiftItem = shifts.find(s => s.shiftNumber === st.number);
          const isRegistered = shiftItem?.isRegistered;
          const isAssigned = shiftItem?.isAssigned;
          const canCancel = shiftItem?.canCancel ?? true;

          return (
            <div
              key={st.number}
              style={{
                backgroundColor: isAssigned ? '#2e1065' : isRegistered ? '#14532d' : '#1e293b',
                border: `1px solid ${isAssigned ? '#9333ea' : isRegistered ? '#22c55e' : '#334155'}`,
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#ffffff' }}>Ca {st.number}</span>
                  {isAssigned && <span style={{ fontSize: '10px', backgroundColor: '#7e22ce', padding: '2px 6px', borderRadius: '4px' }}>TRIỆU TẬP</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>{st.time}</div>
              </div>

              <div style={{ marginTop: '12px' }}>
                {isRegistered || isAssigned ? (
                  <button
                    disabled={!canCancel}
                    onClick={() => shiftItem && onCancelShift(shiftItem.id)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: canCancel ? '#ef4444' : '#6b7280',
                      color: '#ffffff',
                      fontSize: '12px',
                      cursor: canCancel ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {canCancel ? 'Hủy đăng ký' : 'Khóa hủy (< 2h)'}
                  </button>
                ) : (
                  <button
                    onClick={() => shiftItem && onRegisterShift(shiftItem.id)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#f97316',
                      color: '#ffffff',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Đăng ký ca (+EXP)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
