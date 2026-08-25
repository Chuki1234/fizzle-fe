import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../core/services/modal';
import { ServerService } from '../../../core/services/server';
import { FriendService } from '../../../core/services/friend';
import { NotificationService } from '../../../core/services/notification.service';

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
    private notificationService = inject(NotificationService);

    // Create Server Form State
    public serverName = signal('');
    public serverIcon = signal('🔥');

    // Create Channel Form State
    public channelName = signal('');
    public channelType = signal<'text' | 'voice'>('text');

    // Invite State
    public inviteCode = signal('');
    public invitedByServer = signal<Record<string, string[]>>({});
    public invitingIds = signal<string[]>([]);
    public copied = signal(false);
    public inviteLinkLoaded = signal(false);

    constructor() {
        // Auto-load invite code when INVITE_FRIENDS modal opens
        effect(() => {
            const modal = this.modalService.activeModal();
            if (modal === 'INVITE_FRIENDS') {
                this.inviteLinkLoaded.set(false);
                this.invitingIds.set([]);
                this.copied.set(false);
                this.onInviteModalOpen();
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
}