import {
    ChangeDetectionStrategy,
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
    private route = inject(ActivatedRoute);

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

    constructor() {
        // Tự động cuộn xuống tin nhắn mới nhất khi Signal tin nhắn thay đổi
        effect(() => {
            // Read signals để trigger effect khi có tin nhắn mới
            this.serverService.messages();
            this.friendService.messages();

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
            }
            // 2. Chat Trực Tiếp 1-1 Bạn bè
            else if (friendId) {
                this.friendService.setActiveChat(friendId);
                this.serverService.activeServerId.set('');
            }
        });
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

    private scrollToBottom(): void {
        if (this.scrollContainer) {
            this.scrollContainer.nativeElement.scrollTop =
                this.scrollContainer.nativeElement.scrollHeight;
        }
    }
}