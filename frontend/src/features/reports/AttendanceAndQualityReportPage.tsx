import React, { useState } from 'react';

interface AttendanceMetrics {
  totalScheduledShifts: number;
  attendedShifts: number;
  walkInShifts: number; // separated from scheduled denominator
  excusedAbsences: number;
  unexcusedAbsences: number;
  attendanceRatePercent: number;
}

interface TestingQualityMetrics {
  totalTestCases: number;
  executedCasesCount: number;
  passRatePercent: number;
  totalBugsReported: number;
  closedBugsCount: number;
  criticalBugsPending: number;
}

interface AttendanceAndQualityReportPageProps {
  attendanceMetrics: AttendanceMetrics;
  testingMetrics: TestingQualityMetrics;
  onDownloadAttendanceExcel: () => void;
  onDownloadTestingExcel: () => void;
}

export const AttendanceAndQualityReportPage: React.FC<AttendanceAndQualityReportPageProps> = ({
  attendanceMetrics,
  testingMetrics,
  onDownloadAttendanceExcel,
  onDownloadTestingExcel
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff' }}>Báo Cáo Thống Kê & Xuất Dữ Liệu Excel</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
          Tách biệt hoàn toàn ca Walk-in khỏi mẫu số chuyên cần theo luật BR-088 SRS v2.2.0.
        </p>
      </div>

      {/* Attendance Report Card */}
      <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>📊 Báo Cáo Chuyên Cần 4 Chỉ Số</h3>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>
              Tỷ Lệ Chuyên Cần Toàn Xưởng: {attendanceMetrics.attendanceRatePercent}%
            </span>
          </div>

          <button
            onClick={onDownloadAttendanceExcel}
            style={{ padding: '8px 16px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📥 Xuất File Excel (.xlsx)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Tổng ca đăng ký:</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>{attendanceMetrics.totalScheduledShifts}</div>
          </div>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Ca có mặt theo lịch:</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{attendanceMetrics.attendedShifts}</div>
          </div>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Ca tự do (Walk-in):</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>+{attendanceMetrics.walkInShifts}</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>(Không tính vào mẫu số)</div>
          </div>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Vắng có phép:</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{attendanceMetrics.excusedAbsences}</div>
          </div>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Vắng không phép (-20 EXP):</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>{attendanceMetrics.unexcusedAbsences}</div>
          </div>
        </div>
      </div>

      {/* Testing M17 Quality Report Card */}
      <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>🧪 Báo Cáo Chất Lượng Kiểm Thử M17</h3>
            <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}>
              Tỷ Lệ Test Pass: {testingMetrics.passRatePercent}%
            </span>
          </div>

          <button
            onClick={onDownloadTestingExcel}
            style={{ padding: '8px 16px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📥 Xuất Báo Cáo QA Excel (.xlsx)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Tổng số TestCase:</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>{testingMetrics.totalTestCases}</div>
          </div>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Đã thực thi (Executed):</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{testingMetrics.executedCasesCount}</div>
          </div>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Tổng số Bug đã bắt:</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>{testingMetrics.totalBugsReported}</div>
          </div>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Bug đã đóng (Closed):</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{testingMetrics.closedBugsCount}</div>
          </div>
          <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Bug CRITICAL chưa đóng:</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: testingMetrics.criticalBugsPending === 0 ? '#10b981' : '#ef4444' }}>
              {testingMetrics.criticalBugsPending}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
