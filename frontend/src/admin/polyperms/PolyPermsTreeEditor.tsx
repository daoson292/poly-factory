import React, { useState } from 'react';

interface RoleNode {
  role: string;
  inheritsFrom?: string;
  nodes: string[];
}

interface PolyPermsTreeEditorProps {
  rolesHierarchy: RoleNode[];
  allPermissionNodes: string[];
  onToggleNode: (role: string, node: string, isAllowed: boolean) => Promise<void>;
}

export const PolyPermsTreeEditor: React.FC<PolyPermsTreeEditorProps> = ({
  rolesHierarchy,
  allPermissionNodes,
  onToggleNode
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(rolesHierarchy[0]?.role || 'TRAINEE');
  const [customNodeInput, setCustomNodeInput] = useState('');

  const currentRoleConfig = rolesHierarchy.find(r => r.role === selectedRole) || rolesHierarchy[0];

  const handleAddCustomNode = async () => {
    if (!customNodeInput.trim()) return;
    const isNegative = customNodeInput.startsWith('-');
    const cleanNode = isNegative ? customNodeInput.substring(1) : customNodeInput;
    await onToggleNode(selectedRole, cleanNode, !isNegative);
    setCustomNodeInput('');
  };

  return (
    <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>Trình Chỉnh Sửa Cây Phân Quyền Động (PolyPerms Tree Editor)</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
          Mô hình kế thừa 5 cấp: DEFAULT &rarr; TRAINEE/MEMBER &rarr; TEAM_LEAD &rarr; MENTOR &rarr; DEVELOPER. Hỗ trợ cú pháp ghi đè ngoại lệ <code>-node</code>.
        </p>
      </div>

      {/* Role Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
        {rolesHierarchy.map((r) => (
          <button
            key={r.role}
            onClick={() => setSelectedRole(r.role)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: selectedRole === r.role ? '#f97316' : '#1e293b',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: selectedRole === r.role ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            {r.role} {r.inheritsFrom ? `(kế thừa ${r.inheritsFrom})` : ''}
          </button>
        ))}
      </div>

      {/* Permission Nodes Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        {allPermissionNodes.map((node) => {
          const isGranted = currentRoleConfig?.nodes.includes(node);
          const isRevoked = currentRoleConfig?.nodes.includes(`-${node}`);

          return (
            <div
              key={node}
              style={{
                backgroundColor: isRevoked ? '#451a1a' : isGranted ? '#064e3b' : '#1e293b',
                border: `1px solid ${isRevoked ? '#ef4444' : isGranted ? '#059669' : '#334155'}`,
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px'
              }}
            >
              <span style={{ fontFamily: 'monospace', color: '#ffffff', fontWeight: '500' }}>{node}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => onToggleNode(selectedRole, node, true)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: isGranted ? '#10b981' : '#374151',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Cho phép
                </button>
                <button
                  onClick={() => onToggleNode(selectedRole, node, false)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: isRevoked ? '#ef4444' : '#374151',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Cấm (-node)
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct node exception input */}
      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Nhập node quyền cá biệt, vd: testing.bug.triage hoặc -attendance.close..."
          value={customNodeInput}
          onChange={(e) => setCustomNodeInput(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', fontFamily: 'monospace' }}
        />
        <button
          onClick={handleAddCustomNode}
          style={{ padding: '10px 18px', backgroundColor: '#38bdf8', color: '#090d16', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
        >
          Áp Dụng Cho {selectedRole}
        </button>
      </div>
    </div>
  );
};
