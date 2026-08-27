import { Component, inject, signal, effect, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../core/services/modal';
import { ServerService } from '../../../core/services/server';
import { FriendService } from '../../../core/services/friend';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStore } from '../../../core/auth/auth.store';

import { LanguageService } from '../../../core/services/language.service';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [FormsModule, CommonModule],
    templateUrl: './modal.html',
    styleUrl: './modal.css'
})
export class ModalComponent {
    public modalService = inject(ModalService);
    public serverService = inject(ServerService);
    public friendService = inject(FriendService);
    public authStore = inject(AuthStore);
    public languageService = inject(LanguageService);
    private notificationService = inject(NotificationService);

    // Create Server Form State
    public serverName = signal('');
    public serverInitialIcon = computed(() => this.serverName().trim().charAt(0).toUpperCase() || 'S');

    // Create Channel Form State
    public channelName = signal('');
    public channelType = signal<'text' | 'voice'>('text');

    // Invite State
    public inviteCode = signal('');
    public invitedByServer = signal<Record<string, string[]>>({});
    public invitingIds = signal<string[]>([]);
    public copied = signal(false);
    public inviteLinkLoaded = signal(false);

    // Server Settings State
    public settingsTab = signal<'overview' | 'members'>('overview');
    public editServerName = signal('');
    public editServerIcon = signal('');
    public showDeleteConfirm = signal(false);
    public memberSearchQuery = signal('');
    public isSavingSettings = signal(false);
    public isDeletingServer = signal(false);

    constructor() {
        effect(() => {
            const modal = this.modalService.activeModal();
            if (modal === 'INVITE_FRIENDS') {
                this.inviteLinkLoaded.set(false);
                this.invitingIds.set([]);
                this.copied.set(false);
                this.onInviteModalOpen();
            }
            if (modal === 'SERVER_SETTINGS') {
                const activeServer = this.serverService.activeServer();
                this.editServerName.set(activeServer?.name || '');
                this.editServerIcon.set(activeServer?.icon || activeServer?.name?.charAt(0).toUpperCase() || 'S');
                this.settingsTab.set('overview');
                this.showDeleteConfirm.set(false);
                this.memberSearchQuery.set('');
                if (activeServer?.id) {
                    this.serverService.loadServerMembers(activeServer.id);
                }
            }
        });
    }

    onCreateServer() {
        if (!this.serverName().trim()) return;
        this.serverService.createServer(this.serverName());
        this.serverName.set('');
        this.modalService.close();
    }

    onCreateChannel() {
        if (!this.channelName().trim()) return;
        this.serverService.addChannel(this.channelName(), this.channelType());
        this.channelName.set('');
        this.modalService.close();
    }

    // Called when INVITE_FRIENDS modal opens
    onInviteModalOpen() {
        const serverId = this.serverService.activeServerId();
        if (!serverId || this.inviteLinkLoaded()) return;

        this.serverService.generateInviteCode(serverId).then((res) => {
            if (res && res.code) {
                this.inviteCode.set(`http://localhost:4200/join/${res.code}`);
                this.inviteLinkLoaded.set(true);
            }
        }).catch(() => {
            this.inviteCode.set(`http://localhost:4200/join/fizzle-${serverId}`);
            this.inviteLinkLoaded.set(true);
        });
    }

    copyInviteLink() {
        const link = this.inviteCode();
        if (link) {
            void navigator.clipboard.writeText(link).catch(() => {});
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        }
    }

    inviteFriend(friendId: string) {
        const serverId = this.serverService.activeServerId();
        if (!serverId || this.isInviting(friendId) || this.isInvited(friendId)) return;

        // Khóa nút NGAY LẬP TỨC sau 1 lần bấm (Single-click disabled vĩnh viễn)
        this.invitingIds.update(ids => [...ids, friendId]);
        this.invitedByServer.update(store => {
            const current = store[serverId] || [];
            if (current.includes(friendId)) return store;
            return { ...store, [serverId]: [...current, friendId] };
        });

        this.serverService.inviteFriendToServer(serverId, friendId).then(() => {
            this.invitingIds.update(ids => ids.filter(id => id !== friendId));

            const friend = this.getFriends().find(f => f.id === friendId);
            this.notificationService.show({
                type: 'server_invite',
                title: 'Đã gửi lời mời! 🎉',
                message: `Đã mời "${friend?.displayName || 'bạn bè'}" vào ${this.serverService.activeServer()?.name}!`,
            });
        }).catch(() => {
            this.invitingIds.update(ids => ids.filter(id => id !== friendId));
        });
    }

    isMember(friendId: string): boolean {
        const activeServer = this.serverService.activeServer();
        if (!activeServer || !activeServer.members) return false;
        return activeServer.members.includes(friendId);
    }

    isInviting(friendId: string): boolean {
        return this.invitingIds().includes(friendId);
    }

    isInvited(friendId: string): boolean {
        const serverId = this.serverService.activeServerId();
        if (!serverId) return false;
        if (this.isMember(friendId)) return true;
        const list = this.invitedByServer()[serverId] || [];
        return list.includes(friendId);
    }

    getFriends() {
        return this.friendService.friends().filter(f => f.relationshipStatus === 'friend');
    }

    public isImageUrl(icon: string | undefined): boolean {
        if (!icon) return false;
        return icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:image/') || icon.startsWith('/') || icon.includes('/');
    }

    public onServerAvatarFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.notificationService.show({
                type: 'message',
                title: 'Lỗi định dạng',
                message: 'Vui lòng chọn một file hình ảnh (PNG, JPG, WEBP, GIF).'
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            if (result) {
                this.editServerIcon.set(result);
            }
        };
        reader.readAsDataURL(file);
    }

    // --- SERVER SETTINGS ACTIONS ---
    onSaveServerSettings() {
        const serverId = this.serverService.activeServerId();
        if (!serverId || !this.editServerName().trim()) return;

        this.isSavingSettings.set(true);
        this.serverService.updateServer(serverId, this.editServerName().trim(), this.editServerIcon().trim())
            .then(() => {
                this.notificationService.show({
                    type: 'message',
                    title: 'Thành công!',
                    message: 'Đã cập nhật thông tin máy chủ.'
                });
                this.modalService.close();
            })
            .catch(() => {
                this.notificationService.show({
                    type: 'message',
                    title: 'Lỗi',
                    message: 'Không thể cập nhật máy chủ.'
                });
            })
            .finally(() => this.isSavingSettings.set(false));
    }

    onDeleteServer() {
        const serverId = this.serverService.activeServerId();
        if (!serverId) return;

        this.isDeletingServer.set(true);
        this.serverService.deleteServer(serverId)
            .then(() => {
                this.notificationService.show({
                    type: 'message',
                    title: 'Đã xóa máy chủ',
                    message: 'Máy chủ đã được xóa thành công.'
                });
                this.modalService.close();
            })
            .catch((err: any) => {
                const msg = err?.error?.message || err?.message || 'Bạn không có quyền xóa máy chủ này.';
                this.notificationService.show({
                    type: 'message',
                    title: 'Không thể xóa',
                    message: msg
                });
            })
            .finally(() => this.isDeletingServer.set(false));
    }

    onChangeMemberRole(targetUserId: string, event: Event) {
        const serverId = this.serverService.activeServerId();
        const role = (event.target as HTMLSelectElement).value as 'admin' | 'moderator' | 'member';
        if (!serverId || !targetUserId || !role) return;

        this.serverService.updateMemberRole(serverId, targetUserId, role)
            .then(() => {
                this.notificationService.show({
                    type: 'message',
                    title: 'Đã cập nhật vai trò',
                    message: 'Phân quyền người dùng đã được lưu thành công.'
                });
            });
    }

    onKickMember(targetUserId: string, memberName: string) {
        const serverId = this.serverService.activeServerId();
        if (!serverId || !targetUserId) return;

        if (confirm(`Bạn có chắc chắn muốn xóa "${memberName}" khỏi máy chủ này?`)) {
            this.serverService.removeMember(serverId, targetUserId)
                .then(() => {
                    this.notificationService.show({
                        type: 'message',
                        title: 'Đã xóa thành viên',
                        message: `Đã xóa ${memberName} khỏi máy chủ.`
                    });
                });
        }
    }

    get filteredServerMembers() {
        const query = this.memberSearchQuery().trim().toLowerCase();
        const members = this.serverService.activeServerMembers();
        if (!query) return members;
        return members.filter(m =>
            m.displayName.toLowerCase().includes(query) ||
            m.username.toLowerCase().includes(query)
        );
    }

    getRoleLabel(role: string): string {
        switch (role) {
            case 'owner': return this.languageService.t('server.roleOwner');
            case 'admin': return this.languageService.t('server.roleAdmin');
            case 'moderator': return this.languageService.t('server.roleMod');
            default: return this.languageService.t('server.roleMember');
        }
    }

    canManageMembers(): boolean {
        const currentUserId = this.authStore.user()?.id;
        const members = this.serverService.activeServerMembers();
        const me = members.find(m => m.userId === currentUserId);
        return me?.role === 'owner' || me?.role === 'admin' || me?.role === 'moderator' || !me; // default allow for creator/owner
    }
}