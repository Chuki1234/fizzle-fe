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

      'settings.account.overviewTitle': 'Thông tin tài khoản',
      'settings.account.overviewDesc': 'Quản lý thông tin mật khẩu, email và cài đặt phương thức xác thực tài khoản.',
      'settings.account.username': 'Username',
      'settings.account.email': 'Email Address',
      'settings.account.phone': 'Phone Number',
      'settings.account.password': 'Mật khẩu',
      'settings.account.2fa': 'Xác thực 2 yếu tố (2FA)',
      'settings.account.loginAlerts': 'Cảnh báo đăng nhập lạ',
      'settings.account.sudoMode': 'Yêu cầu mã 2FA cho thao tác nhạy cảm',
      'settings.account.sudoModeDesc': 'Yêu cầu xác minh lại mật khẩu/mã OTP khi đổi email, mật khẩu hoặc số điện thoại.',
      'settings.account.edit': 'Chỉnh sửa',
      'settings.account.reveal': 'Hiện',
      'settings.account.hide': 'Ẩn',

      'settings.theme.title': 'GIAO DIỆN HỆ THỐNG',
      'settings.theme.dark': 'Chế độ Tối',
      'settings.theme.light': 'Chế độ Sáng',
      'settings.fontScale.title': 'KÍCH THƯỚC PHÔNG CHỮ',
      'settings.fontScale.compact': 'Nhỏ',
      'settings.fontScale.normal': 'Mặc định',
      'settings.fontScale.large': 'Lớn',

      'settings.language.title': 'NGÔN NGỮ GIAO DIỆN',
      'settings.language.desc': 'Chọn ngôn ngữ hiển thị cho toàn bộ giao diện ứng dụng.',
      'settings.language.vi': 'Tiếng Việt',
      'settings.language.viDesc': 'Giao diện hiển thị bằng Tiếng Việt',
      'settings.language.en': 'English (US)',
      'settings.language.enDesc': 'Display interface in English (US)',

      'settings.profiles.title': 'Chỉnh sửa Profile',
      'settings.profiles.desc': 'Tùy chỉnh thông tin hiển thị, palette tông màu xám và trang trí avatar.',

      'settings.messaging.title': 'Quyền nhắn tin & An toàn',
      'settings.messaging.desc': 'Cài đặt quyền nhắn tin từ người lạ, bộ lọc từ ngữ cấm và chống spam.',

      'settings.notifications.title': 'Thông báo & Âm thanh',
      'settings.notifications.desc': 'Cài đặt thông báo push, nhạc chuông cuộc gọi và giờ yên tĩnh.',

      'settings.logoutConfirm.title': 'Bạn có chắc chắn muốn đăng xuất?',
      'settings.logoutConfirm.desc': 'Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Fizzle.',
      'settings.logoutConfirm.stay': 'Ở lại',
      'settings.logoutConfirm.confirm': 'Đăng xuất',

      // Server & Modals
      'server.createTitle': 'Tạo máy chủ của bạn',
      'server.createSubtitle': 'Máy chủ là nơi bạn và các chiến hữu dành thời gian cho nhau.',
      'server.avatarHint': 'Avatar sẽ được tự động tạo theo chữ cái đầu của tên máy chủ',
      'server.nameLabel': 'Tên máy chủ',
      'server.namePlaceholder': 'VD: Server Học Tập HSU',
      'server.cancel': 'Hủy',
      'server.createBtn': 'Tạo máy chủ',
      'server.close': 'Đóng',

      'server.settingsTitle': 'Cài đặt máy chủ',
      'server.settingsSubtitle': 'Quản lý tên, đại diện, phân quyền người dùng và tùy chỉnh máy chủ',
      'server.tabOverview': '⚙️ Tổng quan',
      'server.tabMembers': '👥 Thành viên & Phân quyền',
      'server.avatarLabel': 'Avatar máy chủ',
      'server.avatarPlaceholder': 'Dán URL ảnh Avatar (https://...)',
      'server.uploadBtn': '📁 Tải ảnh lên...',
      'server.removeAvatarBtn': 'Xóa ảnh (dùng chữ cái đầu)',
      'server.deleteServerBtn': '🗑️ Xóa máy chủ',
      'server.deleteConfirmText': 'Xác nhận xóa máy chủ này vĩnh viễn?',
      'server.deleteConfirmYes': 'Đúng, xóa vĩnh viễn',
      'server.deleting': 'Đang xóa...',
      'server.saving': 'Đang lưu...',
      'server.saveChanges': 'Lưu thay đổi',

      'server.searchMembersPlaceholder': 'Tìm kiếm thành viên...',
      'server.noMembersFound': 'Không tìm thấy thành viên nào phù hợp.',
      'server.roleOwner': 'Chủ sở hữu 👑',
      'server.roleAdmin': 'Admin 🛡️',
      'server.roleMod': 'Quản trị viên ⚔️',
      'server.roleMember': 'Thành viên 👤',
      'server.supremeRole': 'Tối cao',
      'server.kickTooltip': 'Xóa khỏi máy chủ',

      'server.membersHeader': 'Thành viên',
      'server.groupAdmin': 'ADMIN',
      'server.groupMod': 'QUẢN TRỊ VIÊN',
      'server.groupMember': 'THÀNH VIÊN',
      'server.noMembersInChannel': 'Chưa có thành viên nào.',

      'channel.createTitle': 'Tạo kênh',
      'channel.typeLabel': 'Loại kênh',
      'channel.textTitle': 'Text',
      'channel.textDesc': 'Gửi tin nhắn, ảnh',
      'channel.voiceTitle': 'Voice',
      'channel.voiceDesc': 'Nói chuyện trực tiếp',
      'channel.nameLabel': 'Tên kênh',
      'channel.namePlaceholder': 'new-channel',
      'channel.createBtn': 'Tạo kênh',

      'invite.title': 'Mời bạn bè vào',
      'invite.subtitle': 'Chia sẻ link hoặc mời trực tiếp từ danh sách bạn bè',
      'invite.linkLabel': 'Liên kết mời',
      'invite.copyBtn': 'Sao chép',
      'invite.copiedBtn': '✓ Đã sao chép!',
      'invite.friendsLabel': 'Bạn bè của bạn',
      'invite.joined': '✓ Đã tham gia',
      'invite.invited': '✓ Đã mời',
      'invite.inviting': '⏳ Đang gửi...',
      'invite.sendBtn': 'Mời',
      'invite.noFriends': 'Bạn chưa có bạn bè nào. Hãy thêm bạn bè trước!',

      // Voice Chat Room
      'voice.members': 'Thành viên',
      'voice.minimize': 'Thu nhỏ',
      'voice.minimizeHint': 'Thu nhỏ (cuộc gọi vẫn tiếp tục)',
      'voice.noUsersTitle': 'Chưa có ai trong kênh thoại này',
      'voice.noUsersDesc': 'Hãy bấm nút kết nối bên dưới để bắt đầu trò chuyện và chia sẻ màn hình!',
      'voice.join': 'Tham gia Kênh thoại',
      'voice.inviteFriends': 'Mời thêm bạn bè',
      'voice.inviteFriendsBtn': 'Mời bạn bè',
      'voice.leave': 'Thoát',
      'voice.mute': 'Tắt Mic',
      'voice.unmute': 'Bật Mic',
      'voice.camOn': 'Bật Cam',
      'voice.camOff': 'Tắt Cam',
      'voice.screenShare': 'Chia sẻ màn hình',
      'voice.stopScreenShare': 'Dừng chia sẻ',
      'voice.sharingScreen': 'đang chia sẻ màn hình',
      'voice.inCall': 'Đang trong cuộc gọi:',
      'voice.reopen': 'Mở lại phòng Voice',
      'voice.connected': 'Đã kết nối Voice',
      'voice.connecting': 'Đang kết nối...',
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

      // Server & Modals
      'server.createTitle': 'Create Your Server',
      'server.createSubtitle': 'A server is where you and your friends hang out together.',
      'server.avatarHint': 'Avatar will be automatically created using the server name initial',
      'server.nameLabel': 'Server Name',
      'server.namePlaceholder': 'e.g. HSU Study Server',
      'server.cancel': 'Cancel',
      'server.createBtn': 'Create Server',
      'server.close': 'Close',

      'server.settingsTitle': 'Server Settings',
      'server.settingsSubtitle': 'Manage name, icon, user permissions and customize server',
      'server.tabOverview': '⚙️ Overview',
      'server.tabMembers': '👥 Members & Roles',
      'server.avatarLabel': 'Server Avatar',
      'server.avatarPlaceholder': 'Paste Avatar image URL (https://...)',
      'server.uploadBtn': '📁 Upload Image...',
      'server.removeAvatarBtn': 'Remove Avatar (Use initial)',
      'server.deleteServerBtn': '🗑️ Delete Server',
      'server.deleteConfirmText': 'Confirm deleting this server permanently?',
      'server.deleteConfirmYes': 'Yes, delete permanently',
      'server.deleting': 'Deleting...',
      'server.saving': 'Saving...',
      'server.saveChanges': 'Save Changes',

      'server.searchMembersPlaceholder': 'Search members...',
      'server.noMembersFound': 'No matching members found.',
      'server.roleOwner': 'Owner 👑',
      'server.roleAdmin': 'Admin 🛡️',
      'server.roleMod': 'Moderator ⚔️',
      'server.roleMember': 'Member 👤',
      'server.supremeRole': 'Supreme',
      'server.kickTooltip': 'Kick from server',

      'server.membersHeader': 'Members',
      'server.groupAdmin': 'ADMIN',
      'server.groupMod': 'MODERATOR',
      'server.groupMember': 'MEMBERS',
      'server.noMembersInChannel': 'No members yet.',

      'channel.createTitle': 'Create Channel',
      'channel.typeLabel': 'Channel Type',
      'channel.textTitle': 'Text',
      'channel.textDesc': 'Send messages, images',
      'channel.voiceTitle': 'Voice',
      'channel.voiceDesc': 'Direct voice chat',
      'channel.nameLabel': 'Channel Name',
      'channel.namePlaceholder': 'new-channel',
      'channel.createBtn': 'Create Channel',

      'invite.title': 'Invite friends to',
      'invite.subtitle': 'Share invite link or directly invite friends',
      'invite.linkLabel': 'Invite Link',
      'invite.copyBtn': 'Copy',
      'invite.copiedBtn': '✓ Copied!',
      'invite.friendsLabel': 'Your Friends',
      'invite.joined': '✓ Joined',
      'invite.invited': '✓ Invited',
      'invite.inviting': '⏳ Sending...',
      'invite.sendBtn': 'Invite',
      'invite.noFriends': 'You have no friends yet. Add some friends first!',

      // Voice Chat Room
      'voice.members': 'Members',
      'voice.minimize': 'Minimize',
      'voice.minimizeHint': 'Minimize (call stays connected)',
      'voice.noUsersTitle': 'No one in this voice channel',
      'voice.noUsersDesc': 'Click the join button below to start chatting and screen sharing!',
      'voice.join': 'Join Voice Channel',
      'voice.inviteFriends': 'Invite friends to join',
      'voice.inviteFriendsBtn': 'Invite Friends',
      'voice.leave': 'Disconnect',
      'voice.mute': 'Mute',
      'voice.unmute': 'Unmute',
      'voice.camOn': 'Turn On Cam',
      'voice.camOff': 'Turn Off Cam',
      'voice.screenShare': 'Share Screen',
      'voice.stopScreenShare': 'Stop Sharing',
      'voice.sharingScreen': 'is sharing screen',
      'voice.inCall': 'In Voice Call:',
      'voice.reopen': 'Reopen Voice Room',
      'voice.connected': 'Voice Connected',
      'voice.connecting': 'Connecting...',
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
