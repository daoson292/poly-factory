import React, { useState } from 'react';
import { AvatarWithFrame } from './AvatarWithFrame';

export interface CosmeticItem {
  id: string;
  name: string;
  type: 'AVATAR_FRAME_STATIC' | 'AVATAR_FRAME_GIF' | 'PROFILE_BANNER' | 'NAME_COLOR';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  filePath: string;
  requiredLevel: number;
  isUnlocked: boolean;
  isEquipped: boolean;
}

interface WardrobeCustomizerViewProps {
  userLevel: number;
  userName: string;
  inventory: CosmeticItem[];
  onEquipCosmetic: (cosmeticId: string) => Promise<void>;
  onUnequipCosmetic: (cosmeticId: string) => Promise<void>;
}

export const WardrobeCustomizerView: React.FC<WardrobeCustomizerViewProps> = ({
  userLevel,
  userName,
  inventory,
  onEquipCosmetic,
  onUnequipCosmetic
}) => {
  const [activeTab, setActiveTab] = useState<'FRAME' | 'BANNER' | 'COLOR'>('FRAME');

  const equippedFrame = inventory.find(i => (i.type === 'AVATAR_FRAME_STATIC' || i.type === 'AVATAR_FRAME_GIF') && i.isEquipped);
  const equippedBanner = inventory.find(i => i.type === 'PROFILE_BANNER' && i.isEquipped);
  const equippedColor = inventory.find(i => i.type === 'NAME_COLOR' && i.isEquipped);

  const filteredItems = inventory.filter(i => {
    if (activeTab === 'FRAME') return i.type === 'AVATAR_FRAME_STATIC' || i.type === 'AVATAR_FRAME_GIF';
    if (activeTab === 'BANNER') return i.type === 'PROFILE_BANNER';
    return i.type === 'NAME_COLOR';
  });

  const getRarityColor = (r: string) => {
    switch (r) {
      case 'LEGENDARY':
        return '#f59e0b'; // Gold
      case 'EPIC':
        return '#a855f7'; // Purple
      case 'RARE':
        return '#3b82f6'; // Blue
      default:
        return '#94a3b8'; // Grey
    }
  };

  return (
    <div style={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #1f2937', padding: '24px' }}>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#ffffff' }}>Tủ Đồ & Trang Trí Hồ Sơ Cá Nhân (Wardrobe)</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#9ca3af' }}>
        Trang bị khung avatar tĩnh & GIF, hình nền bìa và màu tên đặc trưng mở khóa theo cấp độ.
      </p>

      {/* Live Preview Box */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        backgroundImage: equippedBanner ? `url(${equippedBanner.filePath})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <AvatarWithFrame
            name={userName}
            frameUrl={equippedFrame?.filePath}
            size={80}
          />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: equippedColor ? equippedColor.filePath : '#ffffff' }}>
              {userName}
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
              Level {userLevel} • PolyFactory Workshop
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1f2937', paddingBottom: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('FRAME')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'FRAME' ? '#f97316' : '#1e293b', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
        >
          Khung Avatar
        </button>
        <button
          onClick={() => setActiveTab('BANNER')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'BANNER' ? '#f97316' : '#1e293b', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
        >
          Khung Bìa
        </button>
        <button
          onClick={() => setActiveTab('COLOR')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'COLOR' ? '#f97316' : '#1e293b', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
        >
          Màu Tên
        </button>
      </div>

      {/* Inventory Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {filteredItems.map((item) => {
          const isLocked = !item.isUnlocked && userLevel < item.requiredLevel;

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: item.isEquipped ? '#14532d' : '#1e293b',
                border: `1px solid ${item.isEquipped ? '#22c55e' : getRarityColor(item.rarity)}`,
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>{item.name}</span>
                  <span style={{ fontSize: '10px', color: getRarityColor(item.rarity), fontWeight: 'bold' }}>{item.rarity}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  {item.requiredLevel > 0 ? `Yêu cầu: Level ${item.requiredLevel}` : 'Vật phẩm mặc định'}
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                {isLocked ? (
                  <button
                    disabled
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: 'none', backgroundColor: '#374151', color: '#9ca3af', fontSize: '12px', cursor: 'not-allowed' }}
                  >
                    🔒 Mở khóa ở Lv.{item.requiredLevel}
                  </button>
                ) : item.isEquipped ? (
                  <button
                    onClick={() => onUnequipCosmetic(item.id)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: 'none', backgroundColor: '#ef4444', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Tháo Ra
                  </button>
                ) : (
                  <button
                    onClick={() => onEquipCosmetic(item.id)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: 'none', backgroundColor: '#f97316', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Trang Bị
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
