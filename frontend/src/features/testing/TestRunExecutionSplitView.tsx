import React, { useState } from 'react';
import { TestCaseItem } from '../../types';

export type ResultStatus = 'UNTESTED' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';

interface TestRunCase {
  id: string;
  testCase: TestCaseItem;
  status: ResultStatus;
  actualResult?: string;
  bugId?: string;
}

interface TestRunExecutionSplitViewProps {
  testRunTitle: string;
  cases: TestRunCase[];
  onSetResult: (resultId: string, status: ResultStatus, actualResult?: string) => Promise<void>;
  onCreateBugFromStep: (resultId: string, caseTitle: string, failedStep: number) => void;
  onCloseTestRun: () => Promise<void>;
}

export const TestRunExecutionSplitView: React.FC<TestRunExecutionSplitViewProps> = ({
  testRunTitle,
  cases,
  onSetResult,
  onCreateBugFromStep,
  onCloseTestRun
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || '');
  const [filter, setFilter] = useState<ResultStatus | 'ALL'>('ALL');
  const [actualResultInput, setActualResultInput] = useState('');

  const currentItem = cases.find(c => c.id === selectedCaseId) || cases[0];

  const total = cases.length;
  const executed = cases.filter(c => c.status !== 'UNTESTED').length;
  const passed = cases.filter(c => c.status === 'PASSED').length;
  const failed = cases.filter(c => c.status === 'FAILED').length;
  const progressPercent = total > 0 ? Math.round((executed / total) * 100) : 0;

  const filteredCases = filter === 'ALL' ? cases : cases.filter(c => c.status === filter);

  const handleQuickScore = async (status: ResultStatus) => {
    if (!currentItem) return;
    await onSetResult(currentItem.id, status, actualResultInput);
    setActualResultInput('');
    // Auto advance to next untested case
    const nextUntested = cases.find(c => c.id !== currentItem.id && c.status === 'UNTESTED');
    if (nextUntested) {
      setSelectedCaseId(nextUntested.id);
    }
  };

  const getStatusColor = (s: ResultStatus) => {
    switch (s) {
      case 'PASSED':
        return '#10b981';
      case 'FAILED':
        return '#ef4444';
      case 'BLOCKED':
        return '#f59e0b';
      case 'SKIPPED':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '20px', display: 'flex', flexDirection: 'column', height: '680px' }}>
      {/* Top Header & Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>🧪 {testRunTitle}</h3>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            Tiến độ: {executed}/{total} ({progressPercent}%) • Pass: {passed} • Fail: {failed}
          </span>
        </div>

        <button
          onClick={onCloseTestRun}
          disabled={progressPercent < 100}
          style={{
            padding: '8px 16px',
            backgroundColor: progressPercent === 100 ? '#10b981' : '#374151',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: progressPercent === 100 ? 'pointer' : 'not-allowed'
          }}
        >
          {progressPercent === 100 ? '🔒 Khóa Sổ Đợt Kiểm Thử (+15 EXP)' : `Chưa hoàn thành (${progressPercent}%)`}
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', backgroundColor: '#1f2937', borderRadius: '3px', marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s ease' }} />
      </div>

      {/* Split-View Layout */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
        {/* Left Column: Test Cases Checklist */}
        <div style={{ width: '320px', backgroundColor: '#1e293b', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {(['ALL', 'UNTESTED', 'PASSED', 'FAILED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: filter === st ? '#f97316' : '#0f172a',
                  color: '#ffffff',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredCases.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedCaseId(item.id)}
                style={{
                  backgroundColor: item.id === currentItem?.id ? '#334155' : '#0f172a',
                  borderLeft: `4px solid ${getStatusColor(item.status)}`,
                  padding: '8px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#ffffff' }}>{item.testCase.code}</div>
                <div style={{ color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.testCase.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Case Snapshot & Execution Evaluation */}
        {currentItem ? (
          <div style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f97316' }}>{currentItem.testCase.code}</span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '16px', color: '#ffffff' }}>{currentItem.testCase.title}</h4>
              </div>
              <span style={{
                backgroundColor: getStatusColor(currentItem.status),
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {currentItem.status}
              </span>
            </div>

            {/* Steps execution table */}
            <div style={{ flex: 1, marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '8px' }}>Các Bước Kiểm Thử:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentItem.testCase.steps.map((st) => (
                  <div key={st.stepNumber} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: '500' }}>Bước {st.stepNumber}: {st.action}</div>
                      <div style={{ color: '#94a3b8', marginTop: '2px' }}>Kỳ vọng: {st.expectedResult}</div>
                    </div>
                    <button
                      onClick={() => onCreateBugFromStep(currentItem.id, currentItem.testCase.title, st.stepNumber)}
                      style={{ padding: '3px 8px', backgroundColor: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      🐛 Báo Bug
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actual Result Input */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                Kết quả thực tế / Ghi chú (Bắt buộc nếu FAILED theo E-polyfactory-301):
              </label>
              <input
                type="text"
                placeholder="Hệ thống văng mã lỗi 500 thay vì hiển thị cảnh báo..."
                value={actualResultInput}
                onChange={(e) => setActualResultInput(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '13px' }}
              />
            </div>

            {/* Quick Evaluation 4 Buttons */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
              <button
                onClick={() => handleQuickScore('PASSED')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#064e3b', color: '#6ee7b7', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
              >
                ✓ PASSED
              </button>
              <button
                onClick={() => handleQuickScore('FAILED')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
              >
                ✕ FAILED
              </button>
              <button
                onClick={() => handleQuickScore('BLOCKED')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#78350f', color: '#fde68a', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
              >
                ⛔ BLOCKED
              </button>
              <button
                onClick={() => handleQuickScore('SKIPPED')}
                style={{ flex: 1, padding: '10px', backgroundColor: '#374151', color: '#cbd5e1', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
              >
                ⏭️ SKIPPED
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            Chọn kịch bản kiểm thử ở cột bên trái để bắt đầu chấm điểm.
          </div>
        )}
      </div>
    </div>
  );
};
