import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    inject,
    OnInit,
    ViewChild,
    effect,
    HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FriendService } from '../../core/services/friend';
import { ServerService } from '../../core/services/server';
import { AuthStore } from '../../core/auth/auth.store';
import { ChatMessage } from '../../core/models/friend.model';

import { MediaPickerComponent, GifItem } from './components/media-picker/media-picker.component';
import { AttachmentPreviewComponent, PendingAttachment } from './components/attachment-preview/attachment-preview.component';
import { MediaViewerComponent } from './components/media-viewer/media-viewer.component';

@Component({
    selector: 'fz-chat',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MediaPickerComponent,
        AttachmentPreviewComponent,
        MediaViewerComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './chat.html',
    styleUrl: './chat.css',
})
export class Chat implements OnInit {
    public friendService = inject(FriendService);
    public serverService = inject(ServerService);
    public authStore = inject(AuthStore);
    private route = inject(ActivatedRoute);
    private cdr = inject(ChangeDetectorRef);

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
    @ViewChild('msgInput') private msgInputRef!: ElementRef<HTMLInputElement>;
    @ViewChild('fileInput') private fileInputRef!: ElementRef<HTMLInputElement>;

    // Message Input State
    messageText: string = '';

    // Media Picker State
    showMediaPicker: boolean = false;
    mediaPickerTab: 'emoji' | 'gif' = 'emoji';

    // File Attachments State
    pendingAttachments: PendingAttachment[] = [];
    isDraggingOver: boolean = false;

    // Lightbox State
    lightboxMedia: { src: string; type: 'image' | 'gif' | 'video'; title: string } | null = null;

    failedAvatars = new Set<string>();

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
            }
            // 2. Chat Trực Tiếp 1-1 Bạn bè
            else if (friendId) {
                this.friendService.setActiveChat(friendId);
                this.serverService.activeServerId.set('');
            }
            this.pendingAttachments = [];
            this.showMediaPicker = false;
            this.cdr.markForCheck();
        });
    }

    // --- GỬI TIN NHẮN CHUNG ---

    onSendMessage() {
        const text = this.messageText.trim();
        const hasAttachments = this.pendingAttachments.length > 0;

        if (!text && !hasAttachments) return;

        const user = this.authStore.user();
        const senderName = user?.displayName || user?.username || 'Thiện Phúc';
        const senderId = user?.id || 'user';

        // Upload attachments to server first, then send message
        if (hasAttachments) {
            this.uploadAndSend(text, senderName, senderId);
        } else {
            this.sendTextMessage(text, senderName, senderId);
        }

        // Reset state
        this.messageText = '';
        this.pendingAttachments = [];
        this.showMediaPicker = false;
        this.cdr.markForCheck();
    }

    private sendTextMessage(text: string, senderName: string, senderId: string) {
        if (this.serverService.activeServerId()) {
            this.serverService.sendMessage(text, senderName, senderId, { type: 'text' });
        } else {
            this.friendService.sendMessage(text, senderName, senderId, { type: 'text' });
        }
    }

    private async uploadAndSend(text: string, senderName: string, senderId: string) {
        const attachmentsToUpload = [...this.pendingAttachments];
        const backendBase = 'http://localhost:3000';

        const uploadedAttachments = await Promise.all(
            attachmentsToUpload.map(async (p) => {
                try {
                    const formData = new FormData();
                    formData.append('file', p.file);
                    const res = await fetch(`${backendBase}/upload/file`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                    });
                    if (!res.ok) throw new Error('Upload thất bại');
                    const data = await res.json() as { url: string; name: string; size: number; mimeType: string };
                    return {
                        url: `${backendBase}${data.url}`,
                        name: data.name,
                        size: data.size,
                        type: p.type
                    };
                } catch {
                    // Fallback: dùng object URL local
                    return {
                        url: p.previewUrl,
                        name: p.name,
                        size: p.size,
                        type: p.type
                    };
                }
            })
        );

        const type = uploadedAttachments[0].type as any;
        const opts = { type, attachments: uploadedAttachments };

        if (this.serverService.activeServerId()) {
            this.serverService.sendMessage(text, senderName, senderId, opts);
        } else {
            this.friendService.sendMessage(text, senderName, senderId, opts);
        }
        this.cdr.markForCheck();
    }

    // --- MEDIA PICKER & ACTIONS ---

    toggleMediaPicker(tab: 'emoji' | 'gif' = 'emoji') {
        if (this.showMediaPicker && this.mediaPickerTab === tab) {
            this.showMediaPicker = false;
        } else {
            this.showMediaPicker = true;
            this.mediaPickerTab = tab;
        }
        this.cdr.markForCheck();
    }

    closeMediaPicker() {
        this.showMediaPicker = false;
        this.cdr.markForCheck();
    }

    onSelectEmoji(emoji: string) {
        if (this.msgInputRef?.nativeElement) {
            const input = this.msgInputRef.nativeElement;
            const start = input.selectionStart || this.messageText.length;
            const end = input.selectionEnd || this.messageText.length;
            this.messageText = this.messageText.slice(0, start) + emoji + this.messageText.slice(end);

            setTimeout(() => {
                input.focus();
                input.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 0);
        } else {
            this.messageText += emoji;
        }
        this.cdr.markForCheck();
    }

    onSelectGif(gif: GifItem) {
        const user = this.authStore.user();
        const senderName = user?.displayName || user?.username || 'Thiện Phúc';
        const senderId = user?.id || 'user';

        if (this.serverService.activeServerId()) {
            this.serverService.sendMessage(gif.title || 'GIF', senderName, senderId, {
                type: 'gif',
                mediaUrl: gif.url || gif.previewUrl,
                metadata: { gifId: gif.id, title: gif.title }
            });
        } else {
            this.friendService.sendMessage(gif.title || 'GIF', senderName, senderId, {
                type: 'gif',
                mediaUrl: gif.url || gif.previewUrl,
                metadata: { gifId: gif.id, title: gif.title }
            });
        }

        this.showMediaPicker = false;
        this.cdr.markForCheck();
    }

    // --- ATTACHMENTS HANDLING ---

    triggerFileInput() {
        if (this.fileInputRef?.nativeElement) {
            this.fileInputRef.nativeElement.value = '';
            this.fileInputRef.nativeElement.click();
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input?.files && input.files.length > 0) {
            this.handleFiles(input.files);
        }
    }

    handleFiles(fileList: FileList | File[]) {
        const files = Array.from(fileList);
        for (const file of files) {
            let type: 'image' | 'video' | 'audio' | 'file' = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            // Create a local object URL for preview (không gửi base64 to lên server)
            const previewUrl = URL.createObjectURL(file);
            this.pendingAttachments = [
                ...this.pendingAttachments,
                {
                    file,
                    previewUrl,
                    type,
                    name: file.name,
                    size: file.size
                }
            ];
            this.cdr.markForCheck();
        }
    }

    removeAttachment(index: number) {
        // Revoke object URL to avoid memory leak
        const att = this.pendingAttachments[index];
        if (att?.previewUrl && att.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(att.previewUrl);
        }
        this.pendingAttachments = this.pendingAttachments.filter((_, i) => i !== index);
        this.cdr.markForCheck();
    }

    // --- TEXTAREA HANDLING ---

    onTextareaEnter(event: KeyboardEvent) {
        if (!event.shiftKey) {
            event.preventDefault();
            this.onSendMessage();
        }
    }

    autoResizeTextarea(event: Event) {
        const el = event.target as HTMLTextAreaElement;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 144) + 'px';
    }

    // --- DRAG AND DROP ---

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver = true;
        this.cdr.markForCheck();
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver = false;
        this.cdr.markForCheck();
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver = false;
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            this.handleFiles(event.dataTransfer.files);
        }
        this.cdr.markForCheck();
    }

    // --- LIGHTBOX VIEWER ---

    openLightbox(src: string, type: 'image' | 'gif' | 'video' = 'image', title: string = '') {
        this.lightboxMedia = { src, type, title };
        this.cdr.markForCheck();
    }

    closeLightbox() {
        this.lightboxMedia = null;
        this.cdr.markForCheck();
    }

    // --- HELPERS ---

    isOnlyEmoji(text: string): boolean {
        if (!text) return false;
        const trimmed = text.trim();
        if (!trimmed) return false;
        try {
            const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u;
            return emojiRegex.test(trimmed) && trimmed.length <= 20;
        } catch {
            return false;
        }
    }

    formatFileSize(bytes?: number): string {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

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

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        // Close media picker if clicked outside
        const target = event.target as HTMLElement;
        if (!target.closest('.media-picker-panel') && !target.closest('.media-trigger-btn')) {
            if (this.showMediaPicker) {
                this.showMediaPicker = false;
                this.cdr.markForCheck();
            }
        }
    }
}