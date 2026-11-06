import React, { useState } from 'react';
import { CosmeticItem } from '../../features/gamification/WardrobeCustomizerView';

interface AdminCosmeticsManagerViewProps {
  catalog: CosmeticItem[];
  onCreateCosmetic: (item: { name: string; type: string; rarity: string; requiredLevel: number; filePath: string }) => Promise<void>;
  onMassAwardCosmetic: (cosmeticId: string, targetType: 'USER' | 'TEAM', targetIdentifier: string) => Promise<void>;
}

export const AdminCosmeticsManagerView: React.FC<AdminCosmeticsManagerViewProps> = ({
  catalog,
  onCreateCosmetic,
  onMassAwardCosmetic
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('AVATAR_FRAME_STATIC');
  const [rarity, setRarity] = useState('RARE');
  const [requiredLevel, setRequiredLevel] = useState(5);
  const [filePath, setFilePath] = useState('/storage/cosmetics/frame_gold.png');
  const [isCreating, setIsCreating] = useState(false);

  const [awardCosmeticId, setAwardCosmeticId] = useState(catalog[0]?.id || '');
  const [targetType, setTargetType] = useState<'USER' | 'TEAM'>('TEAM');
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [awardMsg, setAwardMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    await onCreateCosmetic({ name, type, rarity, requiredLevel, filePath });
    setIsCreating(false);
    setName('');
  };

  const handleAward = async (e: React.FormEvent) => {
    e.preventDefault();
    await onMassAwardCosmetic(awardCosmeticId, targetType, targetIdentifier);
    setAwardMsg(`✅ Đã trao tặng thành công cho ${targetType === 'TEAM' ? 'Team' : 'Thành viên'} ${targetIdentifier}!`);
    setTimeout(() => setAwardMsg(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>Quản Trị Kho Vật Phẩm Trang Trí & Trao Thưởng Hàng Loạt</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
          Tải lên tài nguyên ảnh tĩnh/GIF/Lottie vào /storage/cosmetics/ và cấp phát phần thưởng sự kiện.
        </p>
      </div>

      {/* Create New Cosmetic Form */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ffffff' }}>+ Tạo Vật Phẩm Trang Trí Mới</h4>

        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Tên vật phẩm</label>
            <input
              type="text"
              required
              placeholder="Khung Phượng Hoàng Lửa..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Loại vật phẩm</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
            >
              <option value="AVATAR_FRAME_STATIC">Khung Avatar Tĩnh (PNG/SVG)</option>
              <option value="AVATAR_FRAME_GIF">Khung Avatar Động (GIF/WebP)</option>
              <option value="PROFILE_BANNER">Khung Bìa Hồ Sơ (Banner)</option>
              <option value="NAME_COLOR">Màu Tên Gradient</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Độ hiếm</label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
            >
              <option value="COMMON">COMMON (Phổ thông)</option>
              <option value="RARE">RARE (Hiếm)</option>
              <option value="EPIC">EPIC (Sử thi)</option>
              <option value="LEGENDARY">LEGENDARY (Huyền thoại)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Level tối thiểu</label>
            <input
              type="number"
              min={1}
              value={requiredLevel}
              onChange={(e) => setRequiredLevel(parseInt(e.target.value) || 1)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Đường dẫn file lưu trữ (/storage/cosmetics/...)</label>
            <input
              type="text"
              required
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={isCreating}
              style={{ padding: '8px 18px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {isCreating ? 'Đang tạo...' : '+ Thêm Vật Phẩm Vào Kho'}
            </button>
          </div>
        </form>
      </div>

      {/* Mass Awarding Form */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ffffff' }}>🎁 Trao Thưởng Vật Phẩm Hàng Loạt</h4>

        {awardMsg && (
          <div style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>
            {awardMsg}
          </div>
        )}

        <form onSubmit={handleAward} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={awardCosmeticId}
            onChange={(e) => setAwardCosmeticId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', minWidth: '180px' }}
          >
            {catalog.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.rarity})</option>
            ))}
          </select>

          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as 'USER' | 'TEAM')}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
          >
            <option value="TEAM">Trao cho cả Team</option>
            <option value="USER">Trao cho cá nhân</option>
          </select>

          <input
            type="text"
            required
            placeholder={targetType === 'TEAM' ? "Mã Team (vd: TEAM_A)" : "Email cá nhân (@fpt.edu.vn)"}
            value={targetIdentifier}
            onChange={(e) => setTargetIdentifier(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px' }}
          />

          <button
            type="submit"
            style={{ padding: '8px 18px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Trao Thưởng Ngay
          </button>
        </form>
      </div>
    </div>
  );
};
