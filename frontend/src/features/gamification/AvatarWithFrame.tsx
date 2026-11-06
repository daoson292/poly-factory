import React from 'react';

interface AvatarWithFrameProps {
  avatarUrl?: string;
  frameUrl?: string;
  name: string;
  size?: number; // default 64px
}

export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  avatarUrl,
  frameUrl,
  name,
  size = 64
}) => {
  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, display: 'inline-block' }}>
      {/* Base Avatar Circle */}
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: '#2563eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: `${size * 0.4}px`
      }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          name.charAt(0)
        )}
      </div>

      {/* Frame Overlay (Static or GIF) */}
      {frameUrl && (
        <img
          src={frameUrl}
          alt="Avatar Frame"
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-15%',
            width: '130%',
            height: '130%',
            pointerEvents: 'none',
            objectFit: 'contain'
          }}
        />
      )}
    </div>
  );
};
