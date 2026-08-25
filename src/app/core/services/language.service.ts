import { Injectable, signal, inject, effect } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../auth/auth.service';

export type AppLanguage = 'vi' | 'en';

export interface LanguageOption {
  code: AppLanguage;
  name: string;
  nativeName: string;
  flag: string;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private authStore = inject(AuthStore);
  private authService = inject(AuthService);

  readonly currentLang = signal<AppLanguage>('vi');

  readonly availableLanguages: LanguageOption[] = [
    {
      code: 'vi',
      name: 'Tiếng Việt',
      nativeName: 'Tiếng Việt',
      flag: '🇻🇳',
      description: 'Giao diện hiển thị bằng Tiếng Việt',
    },
    {
      code: 'en',
      name: 'English (US)',
      nativeName: 'English (US)',
      flag: '🇺🇸',
      description: 'Display interface in English (US)',
    },
  ];

  // Full App Translations Dictionary
  private readonly translations: Record<AppLanguage, Record<string, string>> = {
    vi: {
      // Navigation & Layout
      'nav.home': 'Trang chủ & DMs',
      'nav.addServer': 'Thêm máy chủ',
      'nav.inviteFriends': 'Mời bạn bè',
      'nav.textChannels': 'KÊNH TRÒ CHUYỆN',
      'nav.addChannel': 'Thêm kênh',
      'nav.deleteChannel': 'Xóa kênh',
      'nav.friends': 'Bạn bè',
      'nav.requests': 'Yêu cầu tin nhắn',
      'nav.directMessages': 'TIN NHẮN TRỰC TIẾP',
      'nav.searchPlaceholder': 'Tìm hoặc bắt đầu cuộc trò chuyện',
      'nav.profile': 'Trang cá nhân',
      'nav.settings': 'Cài đặt',
      'nav.logout': 'Đăng xuất',
      'status.online': 'Đang hoạt động',
      'status.idle': 'Chờ',
      'status.dnd': 'Không làm phiền',
      'status.offline': 'Ngoại tuyến',

      // Dashboard
      'dashboard.title': 'Các server bạn đang tham gia',
      'dashboard.createServer': '+ Tạo máy chủ',
      'dashboard.textChannelsCount': 'kênh trò chuyện',
      'dashboard.voiceChannelsCount': 'kênh thoại',
      'dashboard.noServers': 'Bạn chưa tham gia máy chủ nào.',
      'dashboard.createFirstServer': 'Tạo máy chủ đầu tiên',
      'dashboard.voiceHeader': 'KÊNH THOẠI & PHÒNG CHỜ TRỰC TUYẾN 🔥',

      // Friends Page
      'friends.online': 'Trực tuyến',
      'friends.all': 'Tất cả',
      'friends.pending': 'Đang chờ',
      'friends.add': 'Thêm bạn bè',
      'friends.addTitle': 'Thêm bạn bè',
      'friends.addSubtitle': 'Tìm kiếm bạn bè theo tên người dùng hoặc tên hiển thị',
      'friends.searchPlaceholder': 'Nhập username hoặc tên hiển thị...',
      'friends.searchBtn': 'Tìm kiếm',
      'friends.noFriends': 'Chưa có bạn bè nào ở danh sách này.',
      'friends.message': 'Nhắn tin',
      'friends.remove': 'Xóa bạn',
      'friends.accept': 'Chấp nhận',
      'friends.decline': 'Từ chối',

      // Settings (khang)
      'settings.title': 'Cài đặt hệ thống',
      'settings.editProfiles': 'Chỉnh sửa trang cá nhân ✎',
      'settings.searchPlaceholder': 'Tìm kiếm cài đặt (VD: Mật khẩu, Theme...)',

      'settings.nav.accountGroup': '👤 Thông tin tài khoản',
      'settings.nav.accountOverview': 'Tổng quan & Chi tiết',
      'settings.nav.profiles': 'Hồ sơ & Giao diện',
      'settings.nav.badges': 'Huy hiệu & Trạng thái',
      'settings.nav.accessibilityGroup': '♿ Hỗ trợ tiếp cận & Ngôn ngữ',
      'settings.nav.privacyGroup': '🛡️ Dữ liệu & Quyền riêng tư',
      'settings.nav.messagingGroup': '💬 Quyền nhắn tin',
      'settings.nav.notificationsGroup': '🔔 Thông báo',
      'settings.nav.logout': '🚪 Đăng xuất',

      'settings.header.account': 'Tài khoản',
      'settings.header.profiles': 'Hồ sơ & Giao diện',
      'settings.header.badges': 'Huy hiệu & Trạng thái',
      'settings.header.accessibility': 'Hỗ trợ tiếp cận & Ngôn ngữ',
      'settings.header.privacy': 'Dữ liệu & Quyền riêng tư',
      'settings.header.messaging': 'Quyền nhắn tin',
      'settings.header.notifications': 'Thông báo',
      'settings.header.searchResults': '🔍 Kết quả tìm kiếm',
      'settings.closeTooltip': 'Thoát Cài đặt (Về Dashboard)',

      'settings.search.heading': '🔍 Kết quả tìm kiếm cho:',
      'settings.search.foundCount': 'Tìm thấy',
      'settings.search.featuresMatch': 'tính năng phù hợp trong Cài đặt.',
      'settings.search.openFeature': 'Mở tính năng ➔',
      'settings.search.notFoundTitle': 'Không tìm thấy tính năng nào phù hợp',
      'settings.search.notFoundDesc': 'Rất tiếc! Hệ thống không tìm thấy kết quả nào trùng khớp với từ khóa',

      'settings.account.overviewTitle': 'Thông tin tài khoản (Account Details)',
      'settings.account.overviewDesc': 'Quản lý thông tin mật khẩu, email và cài đặt phương thức xác thực tài khoản.',
      'settings.account.username': 'Username',
      'settings.account.email': 'Email Address',
      'settings.account.phone': 'Phone Number',
      'settings.account.password': 'Mật khẩu (Password)',
      'settings.account.2fa': 'Xác thực 2 yếu tố (2FA)',
      'settings.account.loginAlerts': 'Cảnh báo đăng nhập lạ',
      'settings.account.sudoMode': 'Yêu cầu mã 2FA cho thao tác nhạy cảm (Sudo Mode)',
      'settings.account.sudoModeDesc': 'Yêu cầu xác minh lại mật khẩu/mã OTP khi đổi email, mật khẩu hoặc số điện thoại.',
      'settings.account.edit': 'Chỉnh sửa',
      'settings.account.reveal': 'Hiện',
      'settings.account.hide': 'Ẩn',

      'settings.theme.title': 'GIAO DIỆN HỆ THỐNG (THEME MODE)',
      'settings.theme.dark': 'Chế độ Tối (Dark Mode)',
      'settings.theme.light': 'Chế độ Sáng (Light Mode)',
      'settings.fontScale.title': 'KÍCH THƯỚC PHÔNG CHỮ (FONT SCALING)',
      'settings.fontScale.compact': 'Nhỏ (Compact)',
      'settings.fontScale.normal': 'Mặc định (Standard)',
      'settings.fontScale.large': 'Lớn (Large)',

      'settings.language.title': 'NGÔN NGỮ GIAO DIỆN (LANGUAGE SELECTION)',
      'settings.language.desc': 'Chọn ngôn ngữ hiển thị cho toàn bộ giao diện ứng dụng.',
      'settings.language.vi': 'Tiếng Việt',
      'settings.language.viDesc': 'Giao diện hiển thị bằng Tiếng Việt',
      'settings.language.en': 'English (US)',
      'settings.language.enDesc': 'Display interface in English (US)',

      'settings.profiles.title': 'Profiles Customizer',
      'settings.profiles.desc': 'Tùy chỉnh thông tin hiển thị, palette tông màu xám và trang trí avatar.',

      'settings.messaging.title': 'Quyền nhắn tin & An toàn',
      'settings.messaging.desc': 'Cài đặt quyền nhắn tin từ người lạ, bộ lọc từ ngữ cấm và chống spam.',

      'settings.notifications.title': 'Thông báo & Âm thanh',
      'settings.notifications.desc': 'Cài đặt thông báo push, nhạc chuông cuộc gọi và giờ yên tĩnh.',

      'settings.logoutConfirm.title': 'Bạn có chắc chắn muốn đăng xuất?',
      'settings.logoutConfirm.desc': 'Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Fizzle.',
      'settings.logoutConfirm.stay': 'Ở lại',
      'settings.logoutConfirm.confirm': 'Đăng xuất',
    },
    en: {
      // Navigation & Layout
      'nav.home': 'Home & DMs',
      'nav.addServer': 'Add Server',
      'nav.inviteFriends': 'Invite Friends',
      'nav.textChannels': 'TEXT CHANNELS',
      'nav.addChannel': 'Add Channel',
      'nav.deleteChannel': 'Delete Channel',
      'nav.friends': 'Friends',
      'nav.requests': 'Message Requests',
      'nav.directMessages': 'DIRECT MESSAGES',
      'nav.searchPlaceholder': 'Find or start a conversation',
      'nav.profile': 'Profile',
      'nav.settings': 'Settings',
      'nav.logout': 'Log Out',
      'status.online': 'Online',
      'status.idle': 'Idle',
      'status.dnd': 'Do Not Disturb',
      'status.offline': 'Offline',

      // Dashboard
      'dashboard.title': 'Servers You Joined',
      'dashboard.createServer': '+ Create Server',
      'dashboard.textChannelsCount': 'text channels',
      'dashboard.voiceChannelsCount': 'voice channels',
      'dashboard.noServers': "You haven't joined any servers yet.",
      'dashboard.createFirstServer': 'Create First Server',
      'dashboard.voiceHeader': 'VOICE CHANNELS & ONLINE LOUNGE 🔥',

      // Friends Page
      'friends.online': 'Online',
      'friends.all': 'All',
      'friends.pending': 'Pending',
      'friends.add': 'Add Friend',
      'friends.addTitle': 'Add Friend',
      'friends.addSubtitle': 'Search for friends by username or display name',
      'friends.searchPlaceholder': 'Enter username or display name...',
      'friends.searchBtn': 'Search',
      'friends.noFriends': 'No friends in this list yet.',
      'friends.message': 'Message',
      'friends.remove': 'Remove',
      'friends.accept': 'Accept',
      'friends.decline': 'Decline',

      // Settings (khang)
      'settings.title': 'System Settings',
      'settings.editProfiles': 'Edit Profiles ✎',
      'settings.searchPlaceholder': 'Search settings (e.g. Password, Theme...)',

      'settings.nav.accountGroup': '👤 Account Info',
      'settings.nav.accountOverview': 'Overview & Details',
      'settings.nav.profiles': 'Profiles & Appearance',
      'settings.nav.badges': 'Badges & Presence',
      'settings.nav.accessibilityGroup': '♿ Accessibility & Theme',
      'settings.nav.privacyGroup': '🛡️ Data & Privacy',
      'settings.nav.messagingGroup': '💬 Messaging Permissions',
      'settings.nav.notificationsGroup': '🔔 Notifications',
      'settings.nav.logout': '🚪 Log Out',

      'settings.header.account': 'Account',
      'settings.header.profiles': 'Profiles & Appearance',
      'settings.header.badges': 'Badges & Presence',
      'settings.header.accessibility': 'Accessibility & Theme',
      'settings.header.privacy': 'Data & Privacy',
      'settings.header.messaging': 'Messaging Permissions',
      'settings.header.notifications': 'Notifications',
      'settings.header.searchResults': '🔍 Search Results',
      'settings.closeTooltip': 'Close Settings (Back to Dashboard)',

      'settings.search.heading': '🔍 Search results for:',
      'settings.search.foundCount': 'Found',
      'settings.search.featuresMatch': 'matching features in Settings.',
      'settings.search.openFeature': 'Open feature ➔',
      'settings.search.notFoundTitle': 'No matching features found',
      'settings.search.notFoundDesc': 'Sorry! No results found matching keyword',

      'settings.account.overviewTitle': 'Account Details',
      'settings.account.overviewDesc': 'Manage password, email, and authentication settings.',
      'settings.account.username': 'Username',
      'settings.account.email': 'Email Address',
      'settings.account.phone': 'Phone Number',
      'settings.account.password': 'Password',
      'settings.account.2fa': 'Two-Factor Authentication (2FA)',
      'settings.account.loginAlerts': 'Unfamiliar Login Alerts',
      'settings.account.sudoMode': 'Require 2FA for Sensitive Actions (Sudo Mode)',
      'settings.account.sudoModeDesc': 'Require password or OTP verification when changing sensitive info.',
      'settings.account.edit': 'Edit',
      'settings.account.reveal': 'Reveal',
      'settings.account.hide': 'Hide',

      'settings.theme.title': 'SYSTEM THEME (THEME MODE)',
      'settings.theme.dark': 'Dark Mode',
      'settings.theme.light': 'Light Mode',
      'settings.fontScale.title': 'FONT SCALING',
      'settings.fontScale.compact': 'Compact',
      'settings.fontScale.normal': 'Standard',
      'settings.fontScale.large': 'Large',

      'settings.language.title': 'DISPLAY LANGUAGE (LANGUAGE SELECTION)',
      'settings.language.desc': 'Select display language for the entire application interface.',
      'settings.language.vi': 'Vietnamese',
      'settings.language.viDesc': 'Interface displayed in Vietnamese',
      'settings.language.en': 'English (US)',
      'settings.language.enDesc': 'Display interface in English (US)',

      'settings.profiles.title': 'Profiles Customizer',
      'settings.profiles.desc': 'Customize display info, theme banner gradient, and avatar decorations.',

      'settings.messaging.title': 'Messaging Permissions & Safety',
      'settings.messaging.desc': 'Set stranger DM permissions, banned words filters, and anti-spam controls.',

      'settings.notifications.title': 'Notifications & Sound',
      'settings.notifications.desc': 'Configure push notifications, call ringtones, and quiet hours.',

      'settings.logoutConfirm.title': 'Are you sure you want to log out?',
      'settings.logoutConfirm.desc': 'You will need to log in again to continue using Fizzle.',
      'settings.logoutConfirm.stay': 'Stay',
      'settings.logoutConfirm.confirm': 'Log Out',
    },
  };

  constructor() {
    // Synchronize language with logged in User profile state in real-time
    effect(() => {
      const user = this.authStore.user();
      if (user) {
        const userLang = (user as any).language as AppLanguage | undefined;
        if (userLang === 'vi' || userLang === 'en') {
          if (this.currentLang() !== userLang) {
            this.currentLang.set(userLang);
            document.documentElement.lang = userLang;
          }
        }
      }
    });
  }

  setLanguage(lang: AppLanguage) {
    this.currentLang.set(lang);
    document.documentElement.lang = lang;

    // Persist to user profile in real-time if user is logged in
    const user = this.authStore.user();
    if (user) {
      this.authService.updateProfile({ language: lang } as any).subscribe({
        next: () => {
          // Real-time synced with backend user profile
        },
        error: () => {
          // Graceful fallback
        }
      });
    }
  }

  t(key: string, defaultText?: string): string {
    const lang = this.currentLang();
    return this.translations[lang]?.[key] ?? defaultText ?? key;
  }
}
