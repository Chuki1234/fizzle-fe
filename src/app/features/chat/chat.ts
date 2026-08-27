import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    inject,
    OnInit,
    ViewChild,
    effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FriendService } from '../../core/services/friend';
import { ServerService } from '../../core/services/server';
import { AuthStore } from '../../core/auth/auth.store';

import { ChatMessage } from '../../core/models/friend.model';

import { LanguageService } from '../../core/services/language.service';

@Component({
    selector: 'fz-chat',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './chat.html',
    styleUrl: './chat.css',
})
export class Chat implements OnInit {
    public friendService = inject(FriendService);
    public serverService = inject(ServerService);
    public authStore = inject(AuthStore);
    public languageService = inject(LanguageService);
    private route = inject(ActivatedRoute);
    private cdr = inject(ChangeDetectorRef);

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

    constructor() {
        // Tự động cuộn xuống tin nhắn mới nhất và cập nhật view khi Signal tin nhắn thay đổi
        effect(() => {
            // Read signals để trigger effect khi có tin nhắn mới
            this.serverService.messages();
            this.friendService.messages();
            this.cdr.markForCheck();

            setTimeout(() => this.scrollToBottom(), 50);
        });
    }

    ngOnInit() {
        // Đọc params từ URL (/chat/:id hoặc /channels/:serverId/:channelId)
        this.route.paramMap.subscribe(params => {
            const serverId = params.get('serverId');
            const channelId = params.get('channelId');
            const friendId = params.get('id');

            // 1. Kênh Server Discord
            if (serverId && channelId) {
                this.serverService.activeServerId.set(serverId);
                this.serverService.activeChannelId.set(channelId);
                this.serverService.loadChannelMessages(channelId);
                this.serverService.loadServerMembers(serverId);
            }
            // 2. Chat Trực Tiếp 1-1 Bạn bè
            else if (friendId) {
                this.friendService.setActiveChat(friendId);
                this.serverService.activeServerId.set('');
            }
        });
    }

    get adminMembers() {
        return this.serverService.activeServerMembers().filter(m => m.role === 'owner' || m.role === 'admin');
    }

    get modMembers() {
        return this.serverService.activeServerMembers().filter(m => m.role === 'moderator');
    }

    get normalMembers() {
        return this.serverService.activeServerMembers().filter(m => m.role === 'member' || !m.role);
    }

    onSendMessage(text: string) {
        if (!text.trim()) return;

        const user = this.authStore.user();
        const senderName = user?.displayName || user?.username || 'Thiện Phúc';
        const senderId = user?.id || 'user';

        if (this.serverService.activeServerId()) {
            this.serverService.sendMessage(text, senderName, senderId);
        } else {
            this.friendService.sendMessage(text, senderName, senderId);
        }
    }

    failedAvatars = new Set<string>();

    onAvatarError(event: Event, msg: ChatMessage) {
        const img = event.target as HTMLImageElement;
        if (img?.src) {
            this.failedAvatars.add(img.src);
        }
        if (msg.id) {
            this.failedAvatars.add(msg.id);
        }
    }

    getSenderAvatar(msg: ChatMessage): string | null {
        if (msg.id && this.failedAvatars.has(msg.id)) return null;

        const candidateUrl = msg.senderAvatarUrl || msg.avatarUrl;
        if (candidateUrl) {
            if (this.failedAvatars.has(candidateUrl)) return null;
            return candidateUrl;
        }

        const currentUser = this.authStore.user();
        if (currentUser) {
            const currentUserId = currentUser.id || 'user';
            const sName = (msg.senderName || '').trim().toLowerCase();
            const sId = (msg.senderId || '').trim();
            if (
                sId === currentUserId ||
                sId === 'user' ||
                (currentUser.username && sId === currentUser.username) ||
                (currentUser.displayName && sName === currentUser.displayName.toLowerCase()) ||
                (currentUser.username && sName === currentUser.username.toLowerCase())
            ) {
                if (currentUser.avatarUrl && !this.failedAvatars.has(currentUser.avatarUrl)) {
                    return currentUser.avatarUrl;
                }
            }
        }

        const activeFriend = this.friendService.activeFriend();
        if (activeFriend && activeFriend.avatarUrl && !this.failedAvatars.has(activeFriend.avatarUrl)) {
            const sName = (msg.senderName || '').trim().toLowerCase();
            const sId = (msg.senderId || '').trim();
            if (
                sId === activeFriend.id ||
                sId === activeFriend.username ||
                sName === activeFriend.displayName.toLowerCase() ||
                sName === activeFriend.username.toLowerCase()
            ) {
                return activeFriend.avatarUrl;
            }
        }

        const sName = (msg.senderName || '').trim().toLowerCase();
        const sId = (msg.senderId || '').trim();
        const friend = this.friendService.friends().find(f =>
            f.id === sId ||
            f.username === sId ||
            (f.displayName && f.displayName.toLowerCase() === sName) ||
            (f.username && f.username.toLowerCase() === sName)
        );

        if (friend?.avatarUrl && !this.failedAvatars.has(friend.avatarUrl)) {
            return friend.avatarUrl;
        }

        return null;
    }

    getSenderInitial(msg: ChatMessage): string {
        if (msg.senderName) return msg.senderName.charAt(0).toUpperCase();
        const currentUserId = this.authStore.user()?.id || 'user';
        if (msg.senderId === currentUserId || msg.senderId === 'user') {
            const name = this.authStore.user()?.displayName || this.authStore.user()?.username || 'P';
            return name.charAt(0).toUpperCase();
        }
        const friend = this.friendService.friends().find(f => f.id === msg.senderId || f.username === msg.senderId);
        if (friend?.displayName) return friend.displayName.charAt(0).toUpperCase();
        return 'U';
    }

    private scrollToBottom(): void {
        if (this.scrollContainer) {
            this.scrollContainer.nativeElement.scrollTop =
                this.scrollContainer.nativeElement.scrollHeight;
        }
    }
}