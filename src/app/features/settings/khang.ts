import { Component, HostBinding, HostListener, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService, Badge, MutualServer, MutualFriend } from '../../core/services/profile';

export interface SettingFeatureItem {
  id: string;
  section: 'account-info' | 'profiles' | 'badges-presence' | 'accessibility' | 'privacy' | 'messaging' | 'notifications';
  sectionName: string;
  sectionIcon: string;
  title: string;
  description: string;
  keywords: string[];
}

@Component({
  selector: 'app-khang',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './khang.html',
  styleUrl: './khang.css',
})
export class Khang {
  private authService = inject(AuthService);
  public profileService = inject(ProfileService);

  // Signal điều khiển ẩn/hiện Modal đăng xuất
  showLogoutConfirm = signal<boolean>(false);

  /**
   * Bước 1: Mở popup xác nhận đăng xuất
   */
  logout(): void {
    this.showLogoutConfirm.set(true);
  }

  /**
   * Bước 2: Đóng popup nếu người dùng chọn "Ở lại"
   */
  cancelLogout(): void {
    this.showLogoutConfirm.set(false);
  }

  /**
   * Bước 3: Xác nhận đăng xuất -> Xóa Token/Session -> Quay lại trang Login (/auth/login)
   */
  confirmLogout(): void {
    // 1. Xóa Token hoặc dữ liệu phiên đăng nhập cục bộ
    localStorage.removeItem('access_token');
    sessionStorage.clear();
    this.authStore.clear();

    // 2. Đóng Modal
    this.showLogoutConfirm.set(false);

    // 3. Gọi API đăng xuất & chuyển hướng về /auth/login
    this.authService.logout().subscribe({
      next: () => {
        void this.router.navigate(['/auth/login']);
      },
      error: () => {
        void this.router.navigate(['/auth/login']);
      },
    });
  }

  settingsForm: FormGroup;

  // Section Navigation matching the sample image
  activeSection = signal<
    'account-info' | 'profiles' | 'badges-presence' | 'accessibility' | 'privacy' | 'messaging' | 'notifications'
  >('account-info');

  // Accessibility & Display Signals
  fontScale = signal<'compact' | 'normal' | 'large'>('normal');
  reducedMotion = signal<boolean>(false);
  highContrast = signal<boolean>(false);

  activeCardTab = signal<'user-info' | 'mutual-servers' | 'mutual-friends' | 'activity'>('user-info');

  // Collapsible Account sub-menu state
  isAccountExpanded = signal<boolean>(true);

  toggleAccountExpand() {
    this.isAccountExpanded.set(!this.isAccountExpanded());
  }

  // Search query in sidebar
  searchQuery = signal<string>('');

  // Search Index Database
  searchableFeatures: SettingFeatureItem[] = [
    { id: 'sec-username', section: 'account-info', sectionName: 'Account Info', sectionIcon: '👤', title: 'Username & Tên người dùng', description: 'Thay đổi username và thông tin tài khoản công khai', keywords: ['username', 'tên', 'tài khoản', 'account', 'user'] },
    { id: 'sec-email', section: 'account-info', sectionName: 'Account Info', sectionIcon: '👤', title: 'Email & Số điện thoại', description: 'Xem và chỉnh sửa email chính cũng như số điện thoại liên lạc', keywords: ['email', 'thư', 'sdt', 'phone', 'điện thoại'] },
    { id: 'sec-password', section: 'account-info', sectionName: 'Account Info', sectionIcon: '🔑', title: 'Mật khẩu (Password)', description: 'Thay đổi mật khẩu đăng nhập định kỳ để bảo vệ tài khoản', keywords: ['password', 'mật khẩu', 'đổi mật khẩu', 'pass', 'khóa'] },
    { id: 'sec-2fa', section: 'account-info', sectionName: 'Account Info', sectionIcon: '🛡️', title: 'Xác thực 2 yếu tố (2FA)', description: 'Thiết lập mã OTP Google Authenticator / Authy để tăng cường bảo mật', keywords: ['2fa', 'otp', 'xác thực', 'bảo mật', 'authenticator', 'security'] },
    { id: 'sec-login-alerts', section: 'account-info', sectionName: 'Account Info', sectionIcon: '🔔', title: 'Cảnh báo đăng nhập lạ & Sudo Mode', description: 'Nhận email cảnh báo khi có thiết bị lạ hoặc yêu cầu mã khi thao tác nhạy cảm', keywords: ['cảnh báo', 'alert', 'sudo', 'login', 'đăng nhập'] },
    { id: 'sec-devices', section: 'account-info', sectionName: 'Account Info', sectionIcon: '💻', title: 'Thiết bị đang hoạt động (Active Sessions)', description: 'Xem danh sách các trình duyệt/ứng dụng và đăng xuất từ xa', keywords: ['thiết bị', 'device', 'session', 'đăng xuất', 'session', 'chrome', 'iphone'] },

    { id: 'sec-avatar', section: 'profiles', sectionName: 'Profiles & Appearance', sectionIcon: '🎨', title: 'Ảnh đại diện (Avatar)', description: 'Tải ảnh đại diện từ máy tính hoặc chọn các mẫu avatar có sẵn', keywords: ['avatar', 'ảnh đại diện', 'ảnh', 'hình', 'profile picture'] },
    { id: 'sec-decor', section: 'profiles', sectionName: 'Profiles & Appearance', sectionIcon: '🎨', title: 'Khung Avatar & Trang trí (Decoration)', description: 'Chọn hiệu ứng hào quang Cyber Glow, Nitro Boost, Vương miện', keywords: ['khung', 'decor', 'frame', 'hào quang', 'nitro', 'crown'] },
    { id: 'sec-banner', section: 'profiles', sectionName: 'Profiles & Appearance', sectionIcon: '🎨', title: 'Tông màu Banner (Profile Color)', description: 'Tùy chỉnh dải màu Gradient xám và phong cách thẻ cá nhân', keywords: ['banner', 'màu', 'color', 'gradient', 'theme'] },
    { id: 'sec-status', section: 'profiles', sectionName: 'Profiles & Appearance', sectionIcon: '🎨', title: 'Trạng thái tùy chỉnh (Custom Status)', description: 'Nhập emoji và dòng trạng thái suy nghĩ cá nhân', keywords: ['custom status', 'trạng thái', 'emoji', 'tiểu sử', 'about me'] },

    { id: 'sec-badges', section: 'badges-presence', sectionName: 'Badges & Rich Presence', sectionIcon: '👾', title: 'Huy hiệu Discord (Badges)', description: 'Bật/tắt các huy hiệu Developer, HypeSquad, Supporter, Nitro Boost', keywords: ['badge', 'huy hiệu', 'hypesquad', 'developer', 'nitro'] },
    { id: 'sec-presence', section: 'badges-presence', sectionName: 'Badges & Rich Presence', sectionIcon: '🎮', title: 'Hoạt động Rich Presence (Playing Status)', description: 'Cấu hình hiển thị game đang chơi: VS Code, Spotify, League of Legends', keywords: ['presence', 'rich presence', 'game', 'playing', 'vs code', 'spotify', 'lol'] },

    { id: 'sec-theme-mode', section: 'accessibility', sectionName: 'Accessibility & Theme', sectionIcon: '♿', title: 'Chế độ Tối / Sáng (Dark & Light Mode)', description: 'Chuyển đổi giao diện Dark Mode và Light Mode mượt mà', keywords: ['dark mode', 'light mode', 'giao diện', 'tối', 'sáng', 'theme'] },
    { id: 'sec-font-scale', section: 'accessibility', sectionName: 'Accessibility & Theme', sectionIcon: '♿', title: 'Kích thước chữ (Font Scaling)', description: 'Tùy chỉnh phông chữ theo các cấp độ Compact, Standard, Large', keywords: ['font', 'chữ', 'scale', 'kích thước', 'compact', 'large'] },

    { id: 'sec-dms', section: 'messaging', sectionName: 'Messaging Permissions', sectionIcon: '💬', title: 'Quyền nhắn tin từ người lạ (Direct Messages)', description: 'Bật/tắt nhận tin nhắn từ thành viên cùng máy chủ hoặc người lạ', keywords: ['dm', 'tin nhắn', 'người lạ', 'stranger', 'nhắn tin', 'message'] },
    { id: 'sec-filter', section: 'messaging', sectionName: 'Messaging Permissions', sectionIcon: '💬', title: 'Bộ lọc từ ngữ cấm & Nội dung độc hại', description: 'Cài đặt cấp độ lọc tin nhắn thô tục và quản lý danh sách từ cấm', keywords: ['lọc', 'filter', 'từ cấm', 'banned words', 'thô tục', 'explicit'] },
    { id: 'sec-anti-scam', section: 'messaging', sectionName: 'Messaging Permissions', sectionIcon: '🛡️', title: 'Chống tin nhắn Lừa đảo & Spam (Anti-Scam)', description: 'Tự động chặn link phishing, lừa đảo Nitro giả mạo và bot spam', keywords: ['scam', 'phishing', 'lừa đảo', 'spam', 'bot', 'link'] },

    { id: 'sec-quiet-hours', section: 'notifications', sectionName: 'Notifications', sectionIcon: '🔔', title: 'Giờ yên tĩnh & Tắt thông báo (Quiet Hours)', description: 'Hẹn giờ tự động tắt âm thông báo và tắt popup khi ở chế độ Fullscreen', keywords: ['quiet hours', 'dnd', 'giờ yên tĩnh', 'tắt thông báo', 'hẹn giờ'] },
    { id: 'sec-sounds', section: 'notifications', sectionName: 'Notifications', sectionIcon: '🔔', title: 'Âm thanh & Nhạc chuông thông báo', description: 'Tùy chỉnh và nghe thử âm báo tin nhắn mới và nhạc chuông cuộc gọi', keywords: ['âm thanh', 'sound', 'nhạc chuông', 'nghe thử', 'ringtone', 'bell'] },
    { id: 'sec-email-digest', section: 'notifications', sectionName: 'Notifications', sectionIcon: '🔔', title: 'Thông báo Push & Email Digest', description: 'Cấu hình nhận thông báo qua desktop, di động và tần suất gộp email', keywords: ['email', 'push', 'desktop', 'digest', 'thông báo'] },
  ];

  searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];

    return this.searchableFeatures.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchSection = item.sectionName.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchSection || matchKeywords;
    });
  });

  goToSearchResult(item: SettingFeatureItem) {
    this.activeSection.set(item.section);
    this.searchQuery.set('');
  }

  // Reveal state for sensitive data matching screenshot
  revealEmail = signal<boolean>(false);
  revealPhone = signal<boolean>(false);
  actualEmail = signal<string>('');
  maskedEmail = computed(() => {
    const email = this.actualEmail();
    if (!email || !email.includes('@')) return '*************@gmail.com';
    const [name, domain] = email.split('@');
    const visible = name.slice(0, 3);
    return `${visible}${'*'.repeat(Math.max(1, name.length - 3))}@${domain}`;
  });
  actualPhone = signal<string>('');
  maskedPhone = computed(() => {
    const phone = this.actualPhone();
    if (!phone) return 'Chưa thêm số điện thoại';
    return '********' + phone.slice(-4);
  });

  // Multi-Factor Auth & Devices
  mfaEnabled = signal<boolean>(true);
  loggedInDevicesCount = signal<number>(11);

  // Edit Modal State
  editingField = signal<'username' | 'email' | 'phone' | 'password' | null>(null);
  // Username change state
  usernameChangePendingName = signal<string>('');
  usernameChangePassword = signal<string>('');
  usernameChangeLoading = signal<boolean>(false);
  usernameChangeError = signal<string | null>(null);

  // Email change OTP flow
  emailChangeStep = signal<'input' | 'otp'>('input');
  emailChangeOtp = signal<string>('');
  emailChangePendingEmail = signal<string>('');
  emailChangePassword = signal<string>('');
  emailChangeLoading = signal<boolean>(false);
  emailChangeError = signal<string | null>(null);
  // Password change state
  passwordChangeLoading = signal<boolean>(false);
  passwordChangeError = signal<string | null>(null);
  passwordChangeSuccess = signal<boolean>(false);

  // Profile signals synced from ProfileService
  displayName = this.profileService.displayName;
  username = this.profileService.username;
  userInitial = computed(() => (this.displayName() || this.username() || 'U').charAt(0).toUpperCase());
  pronouns = this.profileService.pronouns;
  customStatus = this.profileService.customStatus;
  customStatusEmoji = this.profileService.customStatusEmoji;
  displayCustomStatus = this.profileService.displayCustomStatus;
  aboutMe = this.profileService.aboutMe;
  joinedDiscord = this.profileService.joinedDiscord;
  joinedServer = this.profileService.joinedServer;

  // Status & Appearance
  status = this.profileService.status;
  bannerColor = this.profileService.bannerColor;
  bannerGradient = this.profileService.bannerGradient;
  avatarFrame = this.profileService.avatarFrame;

  // Avatar Customization
  avatarUrl = this.profileService.avatarUrl;
  showAvatarModal = signal<boolean>(false);

  presetAvatars = [
    { name: 'Cyber Neon', icon: '🤖', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80' },
    { name: 'Gamer Anime', icon: '🎮', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80' },
    { name: 'Astro Explorer', icon: '🚀', url: 'https://images.unsplash.com/photo-1614680376593-902f749f7b64?w=200&auto=format&fit=crop&q=80' },
    { name: 'Cool Cat', icon: '🐱', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80' },
    { name: 'Minimal Dark', icon: '⚡', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  ];

  // Toast feedback state
  toastMessage = this.profileService.toastMessage;
  isDarkMode = true;

  // Security Signals & State
  twoFactorEnabled = signal<boolean>(true);
  loginAlertsEnabled = signal<boolean>(true);
  sudoModeEnabled = signal<boolean>(true);
  show2FAModal = signal<boolean>(false);
  twoFAStep = signal<'qr' | 'verify' | 'success'>('qr');
  twoFAVerificationCode = signal<string>('');

  activeDevices = signal([
    { id: 'dev-1', icon: '💻', name: 'Windows PC (Chrome Browser)', location: 'Hà Nội, Việt Nam • IP: 113.190.14.88', lastActive: 'Đang hoạt động (Trình duyệt này)', isCurrent: true },
    { id: 'dev-2', icon: '📱', name: 'iPhone 15 Pro (Discord Mobile)', location: 'TP. Hồ Chí Minh, Việt Nam', lastActive: '2 giờ trước', isCurrent: false },
    { id: 'dev-3', icon: '🌐', name: 'MacBook Pro (Safari App)', location: 'Đà Nẵng, Việt Nam', lastActive: '3 ngày trước', isCurrent: false },
  ]);

  // Messaging Permissions Signals & State
  allowServerDMs = signal<boolean>(true);
  allowStrangerDMs = signal<boolean>(false);
  filterStrangerDMsToRequests = signal<boolean>(true);
  contentFilterLevel = signal<'strict' | 'medium' | 'off'>('medium');
  blockScamLinks = signal<boolean>(true);
  blockSpamMessages = signal<boolean>(true);
  blockSpamFriendRequests = signal<boolean>(true);
  enableReadReceipts = signal<boolean>(true);
  autoLoadStrangerMedia = signal<boolean>(false);
  customBannedWords = signal<string[]>([
    'scam',
    'free nitro',
    'hack account',
    'token grabber',
    'bit.ly/claim',
  ]);
  newBannedWordInput = signal<string>('');

  // Notifications Signals & State
  quietHoursEnabled = signal<boolean>(true);
  quietHoursStart = signal<string>('23:00');
  quietHoursEnd = signal<string>('07:00');
  dndInFullScreen = signal<boolean>(true);
  desktopPushNotifications = signal<boolean>(true);
  emailNotificationsEnabled = signal<boolean>(false);
  emailDigestFrequency = signal<'instant' | 'daily' | 'weekly' | 'off'>('daily');
  mobilePushNotifications = signal<boolean>(true);
  suppressEveryoneMentions = signal<boolean>(false);
  directMentionsOnly = signal<boolean>(false);
  voiceCallNotifications = signal<boolean>(true);
  serverEventNotifications = signal<boolean>(true);
  friendNotifications = signal<boolean>(true);
  muteAllSounds = signal<boolean>(false);
  messageSound = signal<string>('mint-sparkle');
  callSound = signal<string>('mint-melody');
  voiceJoinLeaveSound = signal<boolean>(true);
  audioPlaying = signal<string | null>(null);

  @HostBinding('class.light-theme') get isLightTheme() {
    return !this.isDarkMode;
  }

  @HostBinding('class.dark-theme') get isDarkTheme() {
    return this.isDarkMode;
  }

  // Gray Color Presets
  grayColorPresets = [
    { name: 'Discord Dark Gray', hex: '#2b2d31', gradient: 'linear-gradient(135deg, #1e1f22 0%, #2b2d31 100%)' },
    { name: 'Mintlify Gradient', hex: '#0a0a0a', gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1c1c1e 50%, #00d4a4 100%)' },
    { name: 'Midnight Graphite', hex: '#1e1f22', gradient: 'linear-gradient(135deg, #111214 0%, #1e1f22 100%)' },
    { name: 'Steel Metallic Gray', hex: '#383a40', gradient: 'linear-gradient(135deg, #2b2d31 0%, #383a40 100%)' },
    { name: 'Cool Slate Gray', hex: '#4e5058', gradient: 'linear-gradient(135deg, #313338 0%, #4e5058 100%)' },
    { name: 'Obsidian Emerald', hex: '#111214', gradient: 'linear-gradient(135deg, #090a0b 0%, #00d4a4 100%)' },
  ];

  // Avatar Frames
  avatarFrames = [
    { id: 'none', name: 'Không có khung', class: '' },
    { id: 'cyber-glow', name: 'Hào quang Mint Neon', class: 'frame-cyber-glow' },
    { id: 'nitro-boost', name: 'Nitro Booster Gray', class: 'frame-nitro-boost' },
    { id: 'golden-crown', name: 'Vương miện Vàng', class: 'frame-golden-crown' },
    { id: 'tech-ring', name: 'Tech Circuit Ring', class: 'frame-tech-ring' },
  ];

  // Discord Badges synced with ProfileService
  badges = this.profileService.badges;
  activeBadges = this.profileService.activeBadges;

  // Activity Status Signal synced with ProfileService
  isPlayingGame = this.profileService.isPlayingGame;
  activityType = signal<string>('Playing');
  activityTitle = this.profileService.activityTitle;
  activityDetails = this.profileService.activityDetails;
  activityState = this.profileService.activityState;
  activityTimeElapsed = this.profileService.activityTimeElapsed;

  activityTypes = ['Playing', 'Streaming', 'Listening to', 'Watching', 'Competing in'];

  activityPresets = [
    { title: 'Visual Studio Code', details: 'Editing khang.html', state: 'Mintlify Settings · Angular v21', icon: '💻' },
    { title: 'Spotify', details: 'Listening to Starboy', state: 'by The Weeknd', icon: '🎵' },
    { title: 'League of Legends', details: 'In Game - Summoner\'s Rift', state: 'Ranked Solo/Duo (15:20)', icon: '⚔️' },
    { title: 'Figma', details: 'Designing Discord UI', state: 'Fizzle Design System v2.0', icon: '🎨' },
  ];

  get mutualServers() {
    return this.profileService.mutualServers();
  }

  get mutualFriends() {
    return this.profileService.mutualFriends();
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authStore: AuthStore,
  ) {
    // Reactive sync: whenever AuthStore user changes, update local signals
    effect(() => {
      const user = this.authStore.user();
      if (!user) return;
      if (user.email) this.actualEmail.set(user.email);
      if (user.username) this.username.set(user.username);
      if (user.displayName) this.displayName.set(user.displayName);
      if (user.pronouns !== undefined && user.pronouns !== null) this.pronouns.set(user.pronouns);
      if (user.customStatus !== undefined && user.customStatus !== null) this.customStatus.set(user.customStatus);
      if (user.customStatusEmoji !== undefined && user.customStatusEmoji !== null) this.customStatusEmoji.set(user.customStatusEmoji);
      if (user.aboutMe !== undefined && user.aboutMe !== null) this.aboutMe.set(user.aboutMe);
      if (user.bannerColor !== undefined && user.bannerColor !== null) this.bannerColor.set(user.bannerColor);
      if (user.avatarFrame !== undefined && user.avatarFrame !== null) this.avatarFrame.set(user.avatarFrame);
      if (user.avatarUrl !== undefined) this.avatarUrl.set(user.avatarUrl);
      if (user.presence) this.status.set(user.presence);
      if (typeof user.twoFactorEnabled === 'boolean') {
        this.twoFactorEnabled.set(user.twoFactorEnabled);
      }
    });

    this.settingsForm = this.fb.group({
      fullName: [this.displayName(), [Validators.required]],
      email: [this.actualEmail(), [Validators.required, Validators.email]],
      phone: [this.actualPhone()],
      username: [this.username(), [Validators.required]],
      twoFactor: [this.twoFactorEnabled()],
      loginAlerts: [true],
      emailNotifications: [false],
      currentPassword: [''],
      newPassword: [''],
      confirmPassword: [''],
    });
  }

  @HostListener('window:keydown.escape')
  closeSettings() {
    this.router.navigate(['..']);
  }

  openAvatarModal() {
    this.showAvatarModal.set(true);
  }

  closeAvatarModal() {
    this.showAvatarModal.set(false);
  }

  selectPresetAvatar(url: string) {
    this.avatarUrl.set(url);
    this.authService.updateProfile({ avatarUrl: url }).subscribe({
      next: () => this.showToast('Đã đổi Ảnh đại diện thành công!'),
      error: () => this.showToast('Lỗi khi lưu ảnh đại diện!'),
    });
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
          this.authService.updateProfile({ avatarUrl: result }).subscribe({
            next: () => this.showToast('Đã tải lên Ảnh đại diện mới!'),
            error: () => this.showToast('Lỗi khi tải ảnh đại diện!'),
          });
          this.closeAvatarModal();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar() {
    this.avatarUrl.set(null);
    this.authService.updateProfile({ avatarUrl: null }).subscribe({
      next: () => this.showToast('Đã chuyển về tên viết tắt'),
      error: () => this.showToast('Lỗi khi xoá ảnh đại diện!'),
    });
    this.closeAvatarModal();
  }

  // Security & 2FA Methods
  toggle2FA() {
    if (this.twoFactorEnabled()) {
      this.twoFactorEnabled.set(false);
      this.authService.updateProfile({ twoFactorEnabled: false }).subscribe();
    } else {
      this.open2FAModal();
    }
  }

  open2FAModal() {
    this.twoFAStep.set('qr');
    this.twoFAVerificationCode.set('');
    this.show2FAModal.set(true);
  }

  close2FAModal() {
    this.show2FAModal.set(false);
  }

  verify2FA() {
    if (this.twoFAVerificationCode().length >= 4) {
      this.twoFAStep.set('success');
      this.twoFactorEnabled.set(true);
      this.authService.updateProfile({ twoFactorEnabled: true }).subscribe();
    }
  }

  toggleLoginAlerts() {
    this.loginAlertsEnabled.set(!this.loginAlertsEnabled());
  }

  toggleSudoMode() {
    this.sudoModeEnabled.set(!this.sudoModeEnabled());
  }

  revokeDevice(deviceId: string) {
    this.activeDevices.update((list) => list.filter((d) => d.id !== deviceId));
  }

  revokeAllOtherDevices() {
    this.activeDevices.update((list) => list.filter((d) => d.isCurrent));
  }

  // Messaging Permissions Methods
  addCustomBannedWord() {
    const word = this.newBannedWordInput().trim().toLowerCase();
    if (word && !this.customBannedWords().includes(word)) {
      this.customBannedWords.update((list) => [...list, word]);
      this.newBannedWordInput.set('');
    }
  }

  removeCustomBannedWord(word: string) {
    this.customBannedWords.update((list) => list.filter((w) => w !== word));
  }

  setContentFilterLevel(level: 'strict' | 'medium' | 'off') {
    this.contentFilterLevel.set(level);
  }

  // Notifications Methods
  testSound(soundName: string) {
    this.audioPlaying.set(soundName);
    setTimeout(() => {
      if (this.audioPlaying() === soundName) {
        this.audioPlaying.set(null);
      }
    }, 1500);
  }

  setSection(
    section:
      | 'account-info'
      | 'profiles'
      | 'badges-presence'
      | 'accessibility'
      | 'privacy'
      | 'messaging'
      | 'notifications'
  ) {
    this.activeSection.set(section);
  }

  setFontScale(scale: 'compact' | 'normal' | 'large') {
    this.fontScale.set(scale);
    this.showToast(`Đã đổi kích thước phông chữ: ${scale.toUpperCase()}`);
  }

  toggleReducedMotion() {
    this.reducedMotion.set(!this.reducedMotion());
    this.showToast(this.reducedMotion() ? 'Đã bật giảm chuyển động' : 'Đã tắt giảm chuyển động');
  }

  toggleHighContrast() {
    this.highContrast.set(!this.highContrast());
    this.showToast(this.highContrast() ? 'Đã bật chế độ tương phản cao' : 'Đã tắt chế độ tương phản cao');
  }

  toggleRevealEmail() {
    this.revealEmail.set(!this.revealEmail());
  }

  toggleRevealPhone() {
    this.revealPhone.set(!this.revealPhone());
  }

  openEditModal(field: 'username' | 'email' | 'phone' | 'password') {
    this.editingField.set(field);
    if (field === 'username') {
      this.usernameChangePendingName.set(this.username());
      this.usernameChangePassword.set('');
      this.usernameChangeError.set(null);
      this.usernameChangeLoading.set(false);
    }
    // Reset OTP flow state when opening email modal
    if (field === 'email') {
      this.emailChangeStep.set('input');
      this.emailChangeOtp.set('');
      this.emailChangePendingEmail.set('');
      this.emailChangePassword.set('');
      this.emailChangeError.set(null);
      this.emailChangeLoading.set(false);
    }
    if (field === 'password') {
      this.passwordChangeError.set(null);
      this.passwordChangeSuccess.set(false);
      this.settingsForm.patchValue({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  }

  closeEditModal() {
    this.editingField.set(null);
    this.usernameChangePassword.set('');
    this.usernameChangeError.set(null);
    this.emailChangeStep.set('input');
    this.emailChangeOtp.set('');
    this.emailChangePassword.set('');
    this.emailChangeError.set(null);
    this.passwordChangeError.set(null);
    this.passwordChangeSuccess.set(false);
  }

  /** Change Username via BE with password verification */
  saveUsernameChange() {
    const newUsername = this.usernameChangePendingName().trim();
    const password = this.usernameChangePassword().trim();

    if (!newUsername) {
      this.usernameChangeError.set('Vui lòng nhập Username mới.');
      return;
    }
    if (!password) {
      this.usernameChangeError.set('Vui lòng nhập mật khẩu xác nhận.');
      return;
    }

    this.usernameChangeLoading.set(true);
    this.usernameChangeError.set(null);
    this.authService.changeUsername(newUsername, password).subscribe({
      next: (updatedUser) => {
        this.usernameChangeLoading.set(false);
        this.username.set(updatedUser.username);
        this.showToast('Username đã được thay đổi thành công! ✨');
        this.closeEditModal();
      },
      error: (err) => {
        this.usernameChangeLoading.set(false);
        const errData = err?.error;
        const msg =
          typeof errData === 'string'
            ? errData
            : Array.isArray(errData?.message)
              ? errData.message[0]
              : errData?.message || err?.message || 'Không thể đổi Username. Vui lòng thử lại.';
        this.usernameChangeError.set(msg);
      },
    });
  }

  /** Step 1 — request OTP for email change with password verification */
  requestEmailChangeOtp() {
    const newEmail = this.emailChangePendingEmail().trim();
    const password = this.emailChangePassword().trim();

    if (!newEmail || !newEmail.includes('@')) {
      this.emailChangeError.set('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (newEmail.toLowerCase() === this.actualEmail().trim().toLowerCase()) {
      this.emailChangeError.set('Email mới phải khác với email hiện tại của tài khoản.');
      return;
    }
    if (!password) {
      this.emailChangeError.set('Vui lòng nhập mật khẩu xác nhận.');
      return;
    }

    this.emailChangeLoading.set(true);
    this.emailChangeError.set(null);
    this.authService.requestEmailChange(newEmail, password).subscribe({
      next: () => {
        this.emailChangeLoading.set(false);
        this.emailChangeStep.set('otp');
      },
      error: (err) => {
        this.emailChangeLoading.set(false);
        const errData = err?.error;
        const msg =
          typeof errData === 'string'
            ? errData
            : Array.isArray(errData?.message)
              ? errData.message[0]
              : errData?.message || err?.message || 'Không thể gửi yêu cầu đổi email.';
        this.emailChangeError.set(msg);
      },
    });
  }

  /** Step 2 — verify OTP and confirm email change */
  confirmEmailChange() {
    const code = this.emailChangeOtp().trim();
    const newEmail = this.emailChangePendingEmail().trim();
    if (!code) {
      this.emailChangeError.set('Vui lòng nhập mã OTP.');
      return;
    }
    this.emailChangeLoading.set(true);
    this.emailChangeError.set(null);
    this.authService.verifyEmailChange(newEmail, code).subscribe({
      next: (updatedUser) => {
        this.emailChangeLoading.set(false);
        this.actualEmail.set(updatedUser.email);
        this.showToast('Email đã được cập nhật thành công! ✅');
        this.closeEditModal();
      },
      error: (err) => {
        this.emailChangeLoading.set(false);
        const errData = err?.error;
        const msg =
          typeof errData === 'string'
            ? errData
            : Array.isArray(errData?.message)
              ? errData.message[0]
              : errData?.message || err?.message || 'Mã OTP không đúng hoặc đã hết hạn.';
        this.emailChangeError.set(msg);
      },
    });
  }

  /** Change password via BE */
  savePasswordChange() {
    const currentPassword = this.settingsForm.get('currentPassword')?.value;
    const newPassword = this.settingsForm.get('newPassword')?.value;
    const confirmPassword = this.settingsForm.get('confirmPassword')?.value;

    if (!currentPassword || !newPassword) {
      this.passwordChangeError.set('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.passwordChangeError.set('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 8) {
      this.passwordChangeError.set('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    this.passwordChangeLoading.set(true);
    this.passwordChangeError.set(null);
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordChangeLoading.set(false);
        this.passwordChangeSuccess.set(true);
        this.showToast('Đã thay đổi mật khẩu thành công! 🔑');
        setTimeout(() => this.closeEditModal(), 1500);
      },
      error: (err) => {
        this.passwordChangeLoading.set(false);
        this.passwordChangeError.set(err?.error?.message || 'Không thể đổi mật khẩu.');
      },
    });
  }

  saveFieldEdit() {
    if (this.editingField() === 'username') {
      const val = this.settingsForm.get('username')?.value?.trim();
      if (val) {
        this.username.set(val);
        this.authService.updateProfile({ username: val }).subscribe({
          next: () => this.showToast('Đã cập nhật Username thành công!'),
          error: (err) => this.showToast(err?.error?.message || 'Lỗi khi cập nhật Username!'),
        });
      }
    } else if (this.editingField() === 'phone') {
      const val = this.settingsForm.get('phone')?.value?.trim();
      if (val) this.actualPhone.set(val);
      this.showToast('Đã cập nhật Số điện thoại thành công!');
    }
    this.closeEditModal();
  }

  setStatus(newStatus: 'online' | 'idle' | 'dnd' | 'offline') {
    this.status.set(newStatus);
    this.authService.updateProfile({ presence: newStatus }).subscribe({
      next: () => this.showToast(`Đã đổi trạng thái thành: ${this.getStatusLabel(newStatus)}`),
      error: () => this.showToast('Lỗi khi cập nhật trạng thái!'),
    });
  }

  selectPresetColor(preset: { hex: string; gradient: string; name: string }) {
    this.profileService.selectPresetColor(preset);
  }

  setAvatarFrame(frameId: string) {
    this.profileService.setAvatarFrame(frameId);
  }

  toggleBadge(badgeId: string) {
    this.badges.update((current) =>
      current.map((b) => (b.id === badgeId ? { ...b, active: !b.active } : b))
    );
  }

  selectAllBadges() {
    this.badges.update((list) => list.map((b) => ({ ...b, active: true })));
    this.showToast('Đã bật tất cả huy hiệu!');
  }

  deselectAllBadges() {
    this.badges.update((list) => list.map((b) => ({ ...b, active: false })));
    this.showToast('Đã tắt tất cả huy hiệu!');
  }

  selectActivityPreset(preset: { title: string; details: string; state: string; icon: string }) {
    this.activityTitle.set(preset.title);
    this.activityDetails.set(preset.details);
    this.activityState.set(preset.state);
    this.showToast(`Đã chọn mẫu Rich Presence: ${preset.title}`);
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.showToast(this.isDarkMode ? 'Chế độ tối đang được sử dụng.' : 'Chế độ sáng đang được sử dụng.');
  }

  copyProfileLink() {
    navigator.clipboard?.writeText(window.location.href);
    this.showToast('Đã sao chép liên kết hồ sơ!');
  }

  saveProfileChanges() {
    const nameToSave = this.displayName()?.trim();
    const unameToSave = this.username()?.trim();

    if (!nameToSave) {
      this.showToast('Tên hiển thị không được để trống.');
      return;
    }

    this.settingsForm.patchValue({
      fullName: nameToSave,
      username: unameToSave,
    });

    this.profileService.saveProfileChanges().subscribe({
      next: () => {
        this.settingsForm.markAsPristine();
      }
    });
  }

  resetDefault() {
    this.profileService.resetDefault();
    this.revealEmail.set(false);
    this.revealPhone.set(false);
  }

  showToast(msg: string) {
    this.profileService.showToast(msg);
  }

  getStatusLabel(statusKey: string): string {
    return this.profileService.getStatusLabel(statusKey);
  }

  getStatusColor(statusKey: string): string {
    return this.profileService.getStatusColor(statusKey);
  }
}


