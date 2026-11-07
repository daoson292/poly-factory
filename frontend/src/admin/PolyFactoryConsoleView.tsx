import React, { useState, useEffect, useRef } from 'react';

interface LogLine {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

interface PolyFactoryConsoleViewProps {
  initialLogs?: LogLine[];
}

export const PolyFactoryConsoleView: React.FC<PolyFactoryConsoleViewProps> = ({
  initialLogs = []
}) => {
  const [logs, setLogs] = useState<LogLine[]>(initialLogs);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom whenever new logs arrive
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addSimulatedLog = (level: 'INFO' | 'WARN' | 'ERROR', msg: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message: msg
      }
    ]);
  };

  const getLevelColor = (level: 'INFO' | 'WARN' | 'ERROR') => {
    switch (level) {
      case 'INFO':
        return '#4ade80'; // Success green
      case 'WARN':
        return '#facc15'; // Warning amber
      case 'ERROR':
        return '#f87171'; // Error red
    }
  };

  return (
    <div style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', height: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>💻</span>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff', fontFamily: 'monospace' }}>
            POLYFACTORY CONSOLE (WS: /ws/console)
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => addSimulatedLog('INFO', '[TOTP] Session QR P407 rotated successfully.')}
            style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#14532d', color: '#86efac', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Info
          </button>
          <button
            onClick={() => addSimulatedLog('WARN', '[GPS] Check-in distance 162m exceeds 150m threshold.')}
            style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#713f12', color: '#fef08a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Warn
          </button>
          <button
            onClick={() => addSimulatedLog('ERROR', '[AUTH] E-polyfactory-001: Email not in whitelist.')}
            style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Error
          </button>
          <button
            onClick={() => setLogs([])}
            style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#374151', color: '#cbd5e1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div style={{
        flex: 1,
        backgroundColor: '#020617',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '16px',
        fontFamily: 'Consolas, "Fira Code", monospace',
        fontSize: '13px',
        lineHeight: 1.6,
        overflowY: 'auto'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#475569' }}>Connected to /ws/console. Listening for server events...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={{ display: 'flex', gap: '10px' }}>
              <span style={{ color: '#64748b' }}>[{log.timestamp}]</span>
              <span style={{ color: getLevelColor(log.level), fontWeight: 'bold' }}>[{log.level}]</span>
              <span style={{ color: '#f1f5f9' }}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};

