import React, { useState } from 'react';

interface SimulationStep {
  stepNumber: number;
  stepName: string;
  result: 'PASS' | 'FAIL' | 'SKIPPED' | 'MATCHED';
  detail: string;
}

interface SimulationResult {
  hasPermission: boolean;
  finalStepMatched: number;
  reason: string;
  steps: SimulationStep[];
}

interface PermissionSimulatorPanelProps {
  onSimulate: (userEmail: string, node: string) => Promise<SimulationResult>;
}

export const PermissionSimulatorPanel: React.FC<PermissionSimulatorPanelProps> = ({
  onSimulate
}) => {
  const [userEmail, setUserEmail] = useState('');
  const [permissionNode, setPermissionNode] = useState('attendance.close');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    const simRes = await onSimulate(userEmail, permissionNode);
    setResult(simRes);
    setIsSimulating(false);
  };

  return (
    <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', padding: '24px' }}>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#ffffff' }}>🧪 Khung Thử Quyền Động (7-Step Simulator)</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>
        Kiểm tra và giải trình nguồn gốc quyền của bất kỳ thành viên nào theo thuật toán 7 bước PolyPerms.
      </p>

      <form onSubmit={handleSimulate} style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="email"
          required
          placeholder="Email thành viên: sondao@fpt.edu.vn"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
        />
        <input
          type="text"
          required
          placeholder="Node quyền: attendance.close"
          value={permissionNode}
          onChange={(e) => setPermissionNode(e.target.value)}
          style={{ flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', fontFamily: 'monospace' }}
        />
        <button
          type="submit"
          disabled={isSimulating}
          style={{ padding: '10px 20px', backgroundColor: '#f97316', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
        >
          {isSimulating ? 'Đang tính toán...' : 'Thử Quyền Ngay'}
        </button>
      </form>

      {/* Simulator 7 Steps Output */}
      {result && (
        <div>
          {/* Final Verdict Banner */}
          <div style={{
            backgroundColor: result.hasPermission ? '#064e3b' : '#451a1a',
            border: `1px solid ${result.hasPermission ? '#059669' : '#ef4444'}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: result.hasPermission ? '#6ee7b7' : '#fca5a5' }}>
                KẾT QUẢ: {result.hasPermission ? '✅ ĐƯỢC PHÉP THỰC HIỆN' : '⛔ BỊ TỪ CHỐI QUYỀN'}
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px' }}>
                {result.reason} (Chốt tại Bước {result.finalStepMatched})
              </div>
            </div>
          </div>

          {/* 7 Steps Detail Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.steps.map((st) => (
              <div
                key={st.stepNumber}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: st.result === 'MATCHED' ? '#f97316' : '#334155',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {st.stepNumber}
                  </span>
                  <div>
                    <div style={{ fontWeight: '600', color: '#ffffff' }}>{st.stepName}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{st.detail}</div>
                  </div>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: st.result === 'MATCHED' ? '#f97316' : st.result === 'PASS' ? '#064e3b' : '#374151',
                  color: st.result === 'MATCHED' ? '#ffffff' : st.result === 'PASS' ? '#6ee7b7' : '#94a3b8'
                }}>
                  {st.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
