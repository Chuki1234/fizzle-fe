import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProfileService, Badge, MutualServer, MutualFriend } from '../../core/services/profile';
import { PresenceStatus } from '../../core/models/user.model';

@Component({
  selector: 'app-k-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './k-profile.html',
  styleUrl: './k-profile.css',
})
export class KProfile {
  private router = inject(Router);
  public profileService = inject(ProfileService);

  @HostListener('window:keydown.escape')
  @HostListener('document:keydown.escape')
  closeProfile() {
    this.router.navigate(['..']);
  }

  // Profile fields reference ProfileService signals directly
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

  // Status & Theme
  status = this.profileService.status;
  bannerColor = this.profileService.bannerColor;
  bannerGradient = this.profileService.bannerGradient;
  avatarFrame = this.profileService.avatarFrame;
  avatarUrl = this.profileService.avatarUrl;

  // Navigation Tabs
  activeNavTab = signal<'customizer' | 'preview-only'>('customizer');
  activeCardTab = signal<'user-info' | 'mutual-servers' | 'mutual-friends' | 'activity'>('user-info');
  
  // Toast Feedback State
  toastMessage = this.profileService.toastMessage;

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

  presetAvatars = [
    { name: 'Cyber Neon', icon: '🤖', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80' },
    { name: 'Gamer Anime', icon: '🎮', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80' },
    { name: 'Astro Explorer', icon: '🚀', url: 'https://images.unsplash.com/photo-1614680376593-902f749f7b64?w=200&auto=format&fit=crop&q=80' },
    { name: 'Cool Cat', icon: '🐱', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80' },
    { name: 'Minimal Dark', icon: '⚡', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  ];

  // Badges & Activity
  badges = this.profileService.badges;
  activeBadges = this.profileService.activeBadges;
  isPlayingGame = this.profileService.isPlayingGame;
  activityTitle = this.profileService.activityTitle;
  activityDetails = this.profileService.activityDetails;
  activityState = this.profileService.activityState;
  activityTimeElapsed = this.profileService.activityTimeElapsed;

  // Mutual Servers & Friends computed from ProfileService
  get mutualServers(): MutualServer[] {
    return this.profileService.mutualServers();
  }

  get mutualFriends(): MutualFriend[] {
    return this.profileService.mutualFriends();
  }

  // Avatar Modal State
  showAvatarModal = signal<boolean>(false);

  openAvatarModal() {
    this.showAvatarModal.set(true);
  }

  closeAvatarModal() {
    this.showAvatarModal.set(false);
  }

  selectPresetAvatar(url: string) {
    this.avatarUrl.set(url);
    this.profileService.saveProfileChanges();
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
          this.profileService.saveProfileChanges();
          this.closeAvatarModal();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar() {
    this.avatarUrl.set(null);
    this.profileService.saveProfileChanges();
    this.closeAvatarModal();
  }

  setStatus(newStatus: PresenceStatus) {
    this.profileService.setStatus(newStatus);
  }

  selectPresetColor(preset: { hex: string; gradient: string; name: string }) {
    this.profileService.selectPresetColor(preset);
  }

  toggleBadge(badgeId: string) {
    this.profileService.toggleBadge(badgeId);
  }

  copyProfileLink() {
    navigator.clipboard?.writeText(window.location.href);
    this.profileService.showToast('Đã sao chép liên kết hồ sơ Discord!');
  }

  saveProfileChanges() {
    this.profileService.saveProfileChanges();
  }

  resetDefault() {
    this.profileService.resetDefault();
  }

  getStatusLabel(statusKey: string): string {
    return this.profileService.getStatusLabel(statusKey);
  }

  getStatusColor(statusKey: string): string {
    return this.profileService.getStatusColor(statusKey);
  }
}
