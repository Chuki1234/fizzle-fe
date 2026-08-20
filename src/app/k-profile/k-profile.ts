import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
}

@Component({
  selector: 'app-k-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './k-profile.html',
  styleUrl: './k-profile.css',
})
export class KProfile {
  // User Profile Signals
  displayName = signal<string>('Nguyễn Văn Khang');
  username = signal<string>('khang_discord');
  pronouns = signal<string>('he/him');
  customStatus = signal<string>('🚀 Đang xây dựng giao diện Discord Profile xám cực chất');
  customStatusEmoji = signal<string>('⚡');
  aboutMe = signal<string>(
    'Full-stack Developer & UI/UX enthusiast. Đam mê tối ưu hóa trải nghiệm người dùng, hệ thống Angular v21 và Tailwind CSS.\n\n"Coding with passion, designing with precision."'
  );
  joinedDiscord = signal<string>('12 Thg 5, 2020');
  joinedServer = signal<string>('01 Thg 3, 2023');

  // Status & Theme
  status = signal<'online' | 'idle' | 'dnd' | 'offline'>('online');
  bannerColor = signal<string>('#2b2d31');
  bannerType = signal<'color' | 'gradient' | 'image'>('gradient');
  bannerGradient = signal<string>('linear-gradient(135deg, #1e1f22 0%, #383a40 50%, #2b2d31 100%)');
  avatarFrame = signal<string>('cyber-glow');

  // Avatar Customization
  avatarUrl = signal<string | null>(null);
  showAvatarModal = signal<boolean>(false);

  presetAvatars = [
    { name: 'Cyber Neon', icon: '🤖', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80' },
    { name: 'Gamer Anime', icon: '🎮', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80' },
    { name: 'Astro Explorer', icon: '🚀', url: 'https://images.unsplash.com/photo-1614680376593-902f749f7b64?w=200&auto=format&fit=crop&q=80' },
    { name: 'Cool Cat', icon: '🐱', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80' },
    { name: 'Minimal Dark', icon: '⚡', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  ];

  // Navigation Tabs
  activeNavTab = signal<'customizer' | 'preview-only'>('customizer');
  activeCardTab = signal<'user-info' | 'mutual-servers' | 'mutual-friends' | 'activity'>('user-info');
  customizerTab = signal<'general' | 'appearance' | 'badges' | 'presence'>('general');

  // Toast Feedback State
  toastMessage = signal<string | null>(null);

  // Gray Color Presets
  grayColorPresets = [
    { name: 'Discord Dark Gray', hex: '#2b2d31', gradient: 'linear-gradient(135deg, #1e1f22 0%, #2b2d31 100%)' },
    { name: 'Midnight Graphite', hex: '#1e1f22', gradient: 'linear-gradient(135deg, #111214 0%, #1e1f22 100%)' },
    { name: 'Steel Metallic Gray', hex: '#383a40', gradient: 'linear-gradient(135deg, #2b2d31 0%, #383a40 100%)' },
    { name: 'Cool Slate Gray', hex: '#4e5058', gradient: 'linear-gradient(135deg, #313338 0%, #4e5058 100%)' },
    { name: 'Ash Platinum Gray', hex: '#6d6f78', gradient: 'linear-gradient(135deg, #383a40 0%, #6d6f78 100%)' },
    { name: 'Obsidian Deep Gray', hex: '#111214', gradient: 'linear-gradient(135deg, #090a0b 0%, #1b1c1e 100%)' },
  ];

  // Avatar Frames
  avatarFrames = [
    { id: 'none', name: 'Không có khung', class: '' },
    { id: 'cyber-glow', name: 'Hào quang Xám Neon', class: 'frame-cyber-glow' },
    { id: 'nitro-boost', name: 'Nitro Booster Gray', class: 'frame-nitro-boost' },
    { id: 'golden-crown', name: 'Vương miện Vàng', class: 'frame-golden-crown' },
    { id: 'tech-ring', name: 'Tech Circuit Ring', class: 'frame-tech-ring' },
  ];

  // Discord Badges
  badges = signal<Badge[]>([
    { id: 'active-dev', name: 'Active Developer', icon: '💻', color: '#5865f2', description: 'Đã phát triển bot Discord được xác minh', active: true },
    { id: 'hypesquad', name: 'HypeSquad Bravery', icon: '⚔️', color: '#9b59b6', description: 'Thành viên HypeSquad House of Bravery', active: true },
    { id: 'early-supporter', name: 'Early Supporter', icon: '👾', color: '#f1c40f', description: 'Ủng hộ Discord từ những ngày đầu', active: true },
    { id: 'nitro-boost', name: 'Server Booster (24 tháng)', icon: '💎', color: '#f47fff', description: 'Nâng cấp máy chủ trong 24 tháng', active: true },
    { id: 'bug-hunter', name: 'Bug Hunter Lv2', icon: '🐛', color: '#1abc9c', description: 'Báo cáo lỗi quan trọng cho Discord', active: false },
    { id: 'quest-completed', name: 'Discord Quests Champion', icon: '🛡️', color: '#e67e22', description: 'Hoàn thành thử thách Discord Quests', active: true },
  ]);

  // Active Badges computed
  activeBadges = computed(() => this.badges().filter((b) => b.active));

  // Activity Status Signal
  isPlayingGame = signal<boolean>(true);
  activityTitle = signal<string>('Visual Studio Code');
  activityDetails = signal<string>('Đang chỉnh sửa k-profile.html');
  activityState = signal<string>('Workspace: Fizzle Frontend (Angular v21)');
  activityTimeElapsed = signal<string>('02:45:12');

  // Mutual Servers Mock Data
  mutualServers: MutualServer[] = [
    { id: 's1', name: 'Fizzle Developer Hub', iconText: 'FD', bgColor: '#383a40', members: 1420, mutualFriendsCount: 8 },
    { id: 's2', name: 'Angular Việt Nam Community', iconText: 'NG', bgColor: '#4e5058', members: 8900, mutualFriendsCount: 15 },
    { id: 's3', name: 'Discord Bot Developers', iconText: 'DB', bgColor: '#2b2d31', members: 34500, mutualFriendsCount: 4 },
    { id: 's4', name: 'Tailwind CSS Architects', iconText: 'TW', bgColor: '#1e1f22', members: 12100, mutualFriendsCount: 9 },
    { id: 's5', name: 'UI/UX Design Mastermind', iconText: 'UI', bgColor: '#5865f2', members: 5600, mutualFriendsCount: 3 },
  ];

  // Mutual Friends Mock Data
  mutualFriends: MutualFriend[] = [
    { id: 'f1', name: 'Minh Tuấn', tag: 'tuan_dev', avatarBg: '#4e5058', avatarText: 'MT', status: 'online', customStatus: '☕ Đang uống cafe code Angular' },
    { id: 'f2', name: 'Bảo Ngọc', tag: 'ngoc_ui', avatarBg: '#383a40', avatarText: 'BN', status: 'idle', customStatus: '🎨 Designing new Figma components' },
    { id: 'f3', name: 'Hoàng Nam', tag: 'nam_backend', avatarBg: '#2b2d31', avatarText: 'HN', status: 'dnd', customStatus: '⛔ Đang họp sprint planning' },
    { id: 'f4', name: 'Thùy Dương', tag: 'duong_qa', avatarBg: '#6d6f78', avatarText: 'TD', status: 'offline', customStatus: '🌙 Trực tuyến sau 8h tối' },
  ];

  // Actions & Methods
  openAvatarModal() {
    this.showAvatarModal.set(true);
  }

  closeAvatarModal() {
    this.showAvatarModal.set(false);
  }

  selectPresetAvatar(url: string) {
    this.avatarUrl.set(url);
    this.showToast('Đã đổi Ảnh đại diện thành công!');
    this.closeAvatarModal();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          this.avatarUrl.set(result);
          this.showToast('Đã tải lên Ảnh đại diện mới!');
          this.closeAvatarModal();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar() {
    this.avatarUrl.set(null);
    this.showToast('Đã chuyển về tên viết tắt (Default Initials)');
    this.closeAvatarModal();
  }

  setStatus(newStatus: 'online' | 'idle' | 'dnd' | 'offline') {
    this.status.set(newStatus);
    this.showToast(`Đã đổi trạng thái thành: ${this.getStatusLabel(newStatus)}`);
  }

  selectPresetColor(preset: { hex: string; gradient: string; name: string }) {
    this.bannerColor.set(preset.hex);
    this.bannerGradient.set(preset.gradient);
    this.showToast(`Đã áp dụng tông màu xám: ${preset.name}`);
  }

  toggleBadge(badgeId: string) {
    this.badges.update((current) =>
      current.map((b) => (b.id === badgeId ? { ...b, active: !b.active } : b))
    );
  }

  copyProfileLink() {
    navigator.clipboard?.writeText(window.location.href);
    this.showToast('Đã sao chép liên kết hồ sơ Discord!');
  }

  saveProfileChanges() {
    this.showToast('Đã lưu tất cả thay đổi hồ sơ cá nhân thành công!');
  }

  resetDefault() {
    this.displayName.set('Nguyễn Văn Khang');
    this.username.set('khang_discord');
    this.pronouns.set('he/him');
    this.customStatus.set('🚀 Đang xây dựng giao diện Discord Profile xám cực chất');
    this.customStatusEmoji.set('⚡');
    this.bannerColor.set('#2b2d31');
    this.bannerGradient.set('linear-gradient(135deg, #1e1f22 0%, #383a40 50%, #2b2d31 100%)');
    this.status.set('online');
    this.avatarFrame.set('cyber-glow');
    this.showToast('Đã khôi phục cài đặt mặc định!');
  }

  private showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  getStatusLabel(statusKey: string): string {
    switch (statusKey) {
      case 'online':
        return 'Trực tuyến';
      case 'idle':
        return 'Chờ';
      case 'dnd':
        return 'Đừng làm phiền';
      case 'offline':
        return 'Ngoại tuyến';
      default:
        return statusKey;
    }
  }

  getStatusColor(statusKey: string): string {
    switch (statusKey) {
      case 'online':
        return '#23a55a';
      case 'idle':
        return '#f0b232';
      case 'dnd':
        return '#f23f43';
      case 'offline':
        return '#80848e';
      default:
        return '#80848e';
    }
  }
}
