import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../auth/auth.service';
import { FriendService } from './friend';
import { ServerService } from './server';
import { User, PresenceStatus } from '../models/user.model';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  active: boolean;
}

export interface MutualServer {
  id: string;
  name: string;
  iconText: string;
  bgColor: string;
  members: number;
  mutualFriendsCount: number;
}

export interface MutualFriend {
  id: string;
  name: string;
  tag: string;
  avatarBg: string;
  avatarText: string;
  status: PresenceStatus;
  customStatus?: string | null;
  avatarUrl?: string | null;
}

export function cleanStatusString(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const custom = (typeof parsed.customStatus === 'string' && !parsed.customStatus.trim().startsWith('{')) ? parsed.customStatus.trim() : null;
      const statusMsg = (typeof parsed.statusMessage === 'string' && !parsed.statusMessage.trim().startsWith('{')) ? parsed.statusMessage.trim() : null;
      const text = custom || statusMsg || (typeof parsed.statusText === 'string' && !parsed.statusText.trim().startsWith('{') ? parsed.statusText.trim() : null);
      const emoji = typeof parsed.customStatusEmoji === 'string' ? parsed.customStatusEmoji.trim() : null;
      if (text) {
        return emoji ? `${emoji} ${text}` : text;
      }
      if (emoji) return emoji;
    } catch {
      // ignore
    }
    return null;
  }
  return trimmed;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private authStore = inject(AuthStore);
  private authService = inject(AuthService);
  private friendService = inject(FriendService);
  private serverService = inject(ServerService);

  // Profile fields (Reactive signals)
  displayName = signal<string>('User');
  username = signal<string>('user');
  pronouns = signal<string>('');
  customStatus = signal<string>('🚀 Mintlify Settings System');
  customStatusEmoji = signal<string>('⚡');
  aboutMe = signal<string>(
    'Full-stack Developer & UI/UX enthusiast. Designing calm and responsive interfaces with Angular & Mintlify.'
  );
  joinedDiscord = signal<string>('12 Thg 5, 2020');
  joinedServer = signal<string>('01 Thg 3, 2023');

  // Status & Appearance
  status = signal<PresenceStatus>('online');
  bannerColor = signal<string>('#2b2d31');
  bannerGradient = signal<string>('linear-gradient(135deg, #1e1f22 0%, #383a40 50%, #00d4a4 100%)');
  avatarFrame = signal<string>('cyber-glow');
  avatarUrl = signal<string | null>(null);

  // Fallback status display: custom status if non-empty, otherwise selected presence status label
  displayCustomStatus = computed(() => {
    const custom = this.customStatus()?.trim();
    if (custom && !custom.startsWith('{')) return custom;
    return this.getStatusLabel(this.status());
  });

  // Badges
  badges = signal<Badge[]>([
    { id: 'active-dev', name: 'Active Developer', icon: '💻', color: '#00d4a4', description: 'Đã phát triển bot Discord được xác minh', active: true },
    { id: 'hypesquad', name: 'HypeSquad Bravery', icon: '⚔️', color: '#9b59b6', description: 'Thành viên HypeSquad House of Bravery', active: true },
    { id: 'early-supporter', name: 'Early Supporter', icon: '👾', color: '#f1c40f', description: 'Ủng hộ Discord từ những ngày đầu', active: true },
    { id: 'nitro-boost', name: 'Server Booster (24 tháng)', icon: '💎', color: '#f47fff', description: 'Nâng cấp máy chủ trong 24 tháng', active: true },
    { id: 'bug-hunter', name: 'Bug Hunter Lv2', icon: '🐛', color: '#1abc9c', description: 'Báo cáo lỗi quan trọng cho hệ thống', active: false },
    { id: 'quest-completed', name: 'Discord Quests Champion', icon: '🛡️', color: '#e67e22', description: 'Hoàn thành thử thách Discord Quests', active: true },
  ]);

  activeBadges = computed(() => this.badges().filter(b => b.active));

  // Activity Status (Rich Presence)
  isPlayingGame = signal<boolean>(true);
  activityTitle = signal<string>('Visual Studio Code');
  activityDetails = signal<string>('Editing khang.html');
  activityState = signal<string>('Mintlify Settings · Angular v21');
  activityTimeElapsed = signal<string>('02:15:40');

  // Mutual Servers (Synced with ServerService + details)
  mutualServers = computed<MutualServer[]>(() => {
    const list = this.serverService.servers();
    return list.map((s, idx) => ({
      id: s.id,
      name: s.name,
      iconText: s.icon && s.icon.length <= 3 ? s.icon : s.name.substring(0, 2).toUpperCase(),
      bgColor: ['#383a40', '#4e5058', '#2b2d31', '#0a0a0a'][idx % 4],
      members: (idx + 1) * 1420,
      mutualFriendsCount: (idx + 1) * 4,
    }));
  });

  // Mutual Friends (Synced with FriendService)
  mutualFriends = computed<MutualFriend[]>(() => {
    const friendsList = this.friendService.friends().filter(f => f.relationshipStatus === 'friend');
    return friendsList.map((f, idx) => {
      const parts = (f.displayName || f.username || '').split(' ');
      const avatarText = parts.length > 1
        ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
        : (f.displayName || f.username || 'U').substring(0, 2).toUpperCase();

      const rawStatus = (f as any).customStatus || f.statusText;
      const cleanStatus = cleanStatusString(rawStatus);

      return {
        id: f.id,
        name: f.displayName,
        tag: f.username,
        avatarBg: ['#4e5058', '#383a40', '#2b2d31', '#6d6f78'][idx % 4],
        avatarText,
        status: f.presence as PresenceStatus,
        customStatus: cleanStatus,
        avatarUrl: f.avatarUrl || null,
      };
    });
  });

  // Toast feedback signal
  toastMessage = signal<string | null>(null);

  constructor() {
    // Synchronize with AuthStore user whenever updated
    effect(() => {
      const user = this.authStore.user();
      if (!user) return;

      if (user.username) this.username.set(user.username);
      if (user.displayName) this.displayName.set(user.displayName);
      if (user.pronouns !== undefined) this.pronouns.set(user.pronouns ?? '');
      if (user.customStatus !== undefined) {
        const raw = user.customStatus ?? '';
        const clean = (typeof raw === 'string' && !raw.trim().startsWith('{')) ? raw : '';
        this.customStatus.set(clean);
      }
      if (user.customStatusEmoji !== undefined) {
        const raw = user.customStatusEmoji ?? '';
        const clean = (typeof raw === 'string' && !raw.trim().startsWith('{')) ? raw : '';
        this.customStatusEmoji.set(clean);
      }
      if (user.aboutMe !== undefined) this.aboutMe.set(user.aboutMe ?? '');
      if (user.bannerColor !== undefined && user.bannerColor !== null) {
        this.bannerColor.set(user.bannerColor);
      }
      if ((user as any).bannerGradient) {
        this.bannerGradient.set((user as any).bannerGradient);
      } else if (user.bannerColor) {
        const presets = [
          { hex: '#2b2d31', gradient: 'linear-gradient(135deg, #1e1f22 0%, #2b2d31 100%)' },
          { hex: '#0a0a0a', gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1c1c1e 50%, #00d4a4 100%)' },
          { hex: '#1e1f22', gradient: 'linear-gradient(135deg, #111214 0%, #1e1f22 100%)' },
          { hex: '#383a40', gradient: 'linear-gradient(135deg, #2b2d31 0%, #383a40 100%)' },
          { hex: '#4e5058', gradient: 'linear-gradient(135deg, #313338 0%, #4e5058 100%)' },
          { hex: '#111214', gradient: 'linear-gradient(135deg, #090a0b 0%, #00d4a4 100%)' },
        ];
        const matched = presets.find(p => p.hex === user.bannerColor);
        if (matched) {
          this.bannerGradient.set(matched.gradient);
        } else {
          this.bannerGradient.set(`linear-gradient(135deg, #1e1f22 0%, ${user.bannerColor} 50%, #00d4a4 100%)`);
        }
      }
      if (user.avatarFrame !== undefined && user.avatarFrame !== null) this.avatarFrame.set(user.avatarFrame);
      if (user.avatarUrl !== undefined) this.avatarUrl.set(user.avatarUrl);
      if (user.presence) this.status.set(user.presence);
    });
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  setStatus(newStatus: PresenceStatus): void {
    this.status.set(newStatus);
    this.authService.updateProfile({ presence: newStatus }).subscribe({
      next: () => this.showToast(`Đã đổi trạng thái thành: ${this.getStatusLabel(newStatus)}`),
      error: () => this.showToast('Lỗi khi cập nhật trạng thái!'),
    });
  }

  selectPresetColor(preset: { hex: string; gradient: string; name: string }): void {
    this.bannerColor.set(preset.hex);
    this.bannerGradient.set(preset.gradient);
    this.authService.updateProfile({ bannerColor: preset.hex, bannerGradient: preset.gradient } as any).subscribe({
      next: () => this.showToast(`Đã áp dụng tông màu: ${preset.name}`),
      error: () => this.showToast('Lỗi khi lưu màu banner!'),
    });
  }

  setAvatarFrame(frameId: string): void {
    this.avatarFrame.set(frameId);
    this.authService.updateProfile({ avatarFrame: frameId }).subscribe();
  }

  toggleBadge(badgeId: string): void {
    this.badges.update(current =>
      current.map(b => (b.id === badgeId ? { ...b, active: !b.active } : b))
    );
  }

  selectAllBadges(): void {
    this.badges.update(list => list.map(b => ({ ...b, active: true })));
    this.showToast('Đã bật tất cả huy hiệu!');
  }

  deselectAllBadges(): void {
    this.badges.update(list => list.map(b => ({ ...b, active: false })));
    this.showToast('Đã tắt tất cả huy hiệu!');
  }

  saveProfileChanges(): Observable<User> {
    const nameToSave = this.displayName()?.trim();
    const unameToSave = this.username()?.trim();

    const payload: Partial<User> = {
      displayName: nameToSave,
      username: unameToSave || undefined,
      avatarUrl: this.avatarUrl(),
      presence: this.status(),
      pronouns: this.pronouns() || null,
      customStatus: this.customStatus() || null,
      customStatusEmoji: this.customStatusEmoji() || null,
      aboutMe: this.aboutMe() || null,
      bannerColor: this.bannerColor() || null,
      bannerGradient: this.bannerGradient() || null,
      avatarFrame: this.avatarFrame() || null,
    };

    const obs = this.authService.updateProfile(payload);
    obs.subscribe({
      next: (updatedUser) => {
        this.showToast('Tất cả thay đổi hồ sơ đã được lưu đồng bộ! ✨');
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Lỗi khi lưu thay đổi hồ sơ.');
      }
    });

    return obs;
  }

  resetDefault(): void {
    this.displayName.set('Flow Of Calamity');
    this.username.set('enderman1154');
    this.pronouns.set('he/him');
    this.customStatus.set('🚀 Mintlify Settings System');
    this.customStatusEmoji.set('⚡');
    this.aboutMe.set(
      'Full-stack Developer & UI/UX enthusiast. Designing calm and responsive interfaces with Angular & Mintlify.'
    );
    this.bannerColor.set('#2b2d31');
    this.bannerGradient.set('linear-gradient(135deg, #1e1f22 0%, #383a40 50%, #00d4a4 100%)');
    this.status.set('online');
    this.avatarFrame.set('cyber-glow');
    this.showToast('Đã khôi phục cài đặt mặc định!');
  }

  getStatusLabel(statusKey: string): string {
    switch (statusKey) {
      case 'online': return 'Trực tuyến';
      case 'idle': return 'Chờ';
      case 'dnd': return 'Đừng làm phiền';
      case 'offline': return 'Ngoại tuyến';
      default: return statusKey;
    }
  }

  getStatusColor(statusKey: string): string {
    switch (statusKey) {
      case 'online': return '#00d4a4';
      case 'idle': return '#f0b232';
      case 'dnd': return '#f23f43';
      case 'offline': return '#80848e';
      default: return '#80848e';
    }
  }
}
