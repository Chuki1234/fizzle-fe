import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../core/services/modal';
import { ServerService } from '../../../core/services/server';
import { FriendService } from '../../../core/services/friend';

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

    // Create Server Form State
    public serverName = signal('');
    public serverIcon = signal('🔥');

    // Create Channel Form State
    public channelName = signal('');
    public channelType = signal<'text' | 'voice'>('text');

    // Invite State
    public inviteCode = signal('');
    public invitingFriendIds = signal<Set<string>>(new Set());
    public invitedFriendIds = signal<Set<string>>(new Set());
    public inviteLinkLoaded = signal(false);

    constructor() {
        // Auto-load invite code when INVITE_FRIENDS modal opens
        effect(() => {
            const modal = this.modalService.activeModal();
            if (modal === 'INVITE_FRIENDS') {
                this.inviteLinkLoaded.set(false);
                this.invitingFriendIds.set(new Set());
                this.invitedFriendIds.set(new Set());
                this.onInviteModalOpen();
            }
        });
    }

    onCreateServer() {
        if (!this.serverName().trim()) return;
        this.serverService.addServer(this.serverName(), this.serverIcon());
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
            if (res) {
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
            navigator.clipboard.writeText(link).catch(() => {});
        }
    }

    inviteFriend(friendId: string) {
        const serverId = this.serverService.activeServerId();
        if (!serverId || this.invitingFriendIds().has(friendId) || this.invitedFriendIds().has(friendId)) return;

        this.invitingFriendIds.update(s => new Set([...s, friendId]));

        this.serverService.inviteFriendToServer(serverId, friendId).then(() => {
            this.invitingFriendIds.update(s => { const next = new Set(s); next.delete(friendId); return next; });
            this.invitedFriendIds.update(s => new Set([...s, friendId]));
        }).catch((err) => {
            console.warn('Invite failed:', err);
            this.invitingFriendIds.update(s => { const next = new Set(s); next.delete(friendId); return next; });
        });
    }

    getInviteStatus(friendId: string): 'idle' | 'inviting' | 'invited' {
        if (this.invitedFriendIds().has(friendId)) return 'invited';
        if (this.invitingFriendIds().has(friendId)) return 'inviting';
        return 'idle';
    }

    getFriends() {
        return this.friendService.friends().filter(f => f.relationshipStatus === 'friend');
    }
}