import React from 'react';

interface ProfileEffectOverlayProps {
  effectType: 'NEON_PULSE' | 'CYBER_GLITCH' | 'GOLDEN_AURA' | 'NONE';
  children: React.ReactNode;
}

export const ProfileEffectOverlay: React.FC<ProfileEffectOverlayProps> = ({
  effectType,
  children
}) => {
  if (effectType === 'NONE') {
    return <>{children}</>;
  }

  const getEffectStyle = (): React.CSSProperties => {
    switch (effectType) {
      case 'NEON_PULSE':
        return {
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.4), inset 0 0 20px rgba(56, 189, 248, 0.2)',
          border: '1px solid #38bdf8'
        };
      case 'GOLDEN_AURA':
        return {
          boxShadow: '0 0 24px rgba(245, 158, 11, 0.45), inset 0 0 16px rgba(245, 158, 11, 0.25)',
          border: '1px solid #f59e0b'
        };
      case 'CYBER_GLITCH':
        return {
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
          border: '1px solid #a855f7'
        };
      default:
        return {};
    }
  };

  return (
    <div style={{ position: 'relative', borderRadius: '12px', transition: 'box-shadow 0.3s ease', willChange: 'transform, opacity', ...getEffectStyle() }}>
      {children}
    </div>
  );
};
