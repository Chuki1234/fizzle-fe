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
import { SocketService } from '../../core/services/socket';
import { AuthStore } from '../../core/auth/auth.store';
import { ChatMessage } from '../../core/models/friend.model';
import { API_CONFIG, getDynamicBaseUrl } from '../../core/http/api.config';

import { MediaPickerComponent, GifItem } from './components/media-picker/media-picker.component';
import { AttachmentPreviewComponent, PendingAttachment } from './components/attachment-preview/attachment-preview.component';
import { MediaViewerComponent } from './components/media-viewer/media-viewer.component';

import { LanguageService } from '../../core/services/language.service';

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
    public socketService = inject(SocketService);
    public authStore = inject(AuthStore);
    public languageService = inject(LanguageService);
    private route = inject(ActivatedRoute);
    private cdr = inject(ChangeDetectorRef);
    private apiConfig = inject(API_CONFIG, { optional: true });

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
    @ViewChild('msgInput') private msgInputRef!: ElementRef<HTMLTextAreaElement>;
    @ViewChild('fileInput') private fileInputRef!: ElementRef<HTMLInputElement>;

    // Message Input State
    messageText: string = '';
    isUploading: boolean = false;

    // Replying State
    replyingTo: ChatMessage | null = null;

    // Reactions State
    activeReactionMsgId: string | null = null;
    quickEmojis: string[] = ['❤️', '👍', '🔥', '😂', '😮', '😢', '🎉'];

    // Real-time Typing State
    typingUsersMap = new Map<string, { displayName: string; timer: any }>();
    typingUsers: string[] = [];
    private myTypingTimeout: any = null;
    private isCurrentlyTyping = false;

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

        // Register Real-time Typing Listeners
        this.socketService.registerChannelTypingHandler((data) => {
            const currentChannelId = this.serverService.activeChannelId();
            if (!currentChannelId || data.channelId !== currentChannelId) return;
            this.handleRemoteTyping(data.userId, data.displayName, data.isTyping);
        });

        this.socketService.registerDmTypingHandler((data) => {
            const activeFriendId = this.friendService.activeChatId();
            if (!activeFriendId) return;
            // Show typing if incoming sender is the currently active friend or sent to current user
            const currentUserId = this.authStore.user()?.id;
            if (data.userId === activeFriendId || data.recipientId === currentUserId) {
                this.handleRemoteTyping(data.userId, data.displayName, data.isTyping);
            }
        });
    }

    private handleRemoteTyping(userId: string, displayName: string, isTyping: boolean) {
        const currentUserId = this.authStore.user()?.id || 'user';
        if (userId === currentUserId) return;

        if (this.typingUsersMap.has(userId)) {
            clearTimeout(this.typingUsersMap.get(userId)!.timer);
        }

        if (isTyping) {
            const timer = setTimeout(() => {
                this.typingUsersMap.delete(userId);
                this.updateTypingList();
            }, 3500);

            this.typingUsersMap.set(userId, { displayName: displayName || 'Ai đó', timer });
        } else {
            this.typingUsersMap.delete(userId);
        }

        this.updateTypingList();
    }

    private updateTypingList() {
        this.typingUsers = Array.from(this.typingUsersMap.values()).map(u => u.displayName);
        this.cdr.markForCheck();
    }

    onInputChange() {
        const user = this.authStore.user();
        const userId = user?.id || 'user';
        const displayName = user?.displayName || user?.username || 'Bạn';

        if (!this.isCurrentlyTyping && this.messageText.trim().length > 0) {
            this.isCurrentlyTyping = true;
            this.broadcastTyping(true, userId, displayName);
        }

        if (this.myTypingTimeout) clearTimeout(this.myTypingTimeout);
        this.myTypingTimeout = setTimeout(() => {
            this.isCurrentlyTyping = false;
            this.broadcastTyping(false, userId, displayName);
        }, 2500);
    }

    private broadcastTyping(isTyping: boolean, userId: string, displayName: string) {
        const serverId = this.serverService.activeServerId();
        const channelId = this.serverService.activeChannelId();
        const activeFriendId = this.friendService.activeChatId();

        if (serverId && channelId) {
            this.socketService.sendChannelTyping(channelId, userId, displayName, isTyping);
        } else if (activeFriendId) {
            this.socketService.sendDmTyping(activeFriendId, userId, displayName, isTyping);
        }
    }

    // --- REACTION ACTIONS ---
    toggleReactionPicker(msgId: string, event?: Event) {
        if (event) event.stopPropagation();
        this.activeReactionMsgId = this.activeReactionMsgId === msgId ? null : msgId;
        this.cdr.markForCheck();
    }

    closeReactionPicker() {
        this.activeReactionMsgId = null;
        this.cdr.markForCheck();
    }

    onToggleReaction(msg: ChatMessage, emoji: string, event?: Event) {
        if (event) event.stopPropagation();
        if (!msg?.id || !emoji) return;

        this.activeReactionMsgId = null;

        if (this.serverService.activeServerId()) {
            this.serverService.toggleReaction(msg.id, emoji);
        } else {
            this.friendService.toggleReaction(msg.id, emoji);
        }
        this.cdr.markForCheck();
    }

    hasUserReacted(msg: ChatMessage, emoji: string): boolean {
        if (!msg?.reactions || !msg.reactions[emoji]) return false;
        const currentUserId = this.authStore.user()?.id || 'user';
        return msg.reactions[emoji].includes(currentUserId);
    }

    getReactionEntries(msg: ChatMessage): Array<{ emoji: string; count: number; reacted: boolean; users: string[] }> {
        if (!msg?.reactions) return [];
        const currentUserId = this.authStore.user()?.id || 'user';
        return Object.entries(msg.reactions)
            .filter(([_, users]) => users && users.length > 0)
            .map(([emoji, users]) => ({
                emoji,
                count: users.length,
                reacted: users.includes(currentUserId),
                users,
            }));
    }

    // --- REPLY ACTIONS ---
    onReplyMessage(msg: ChatMessage, event?: Event) {
        if (event) event.stopPropagation();
        this.replyingTo = msg;
        this.cdr.markForCheck();
        setTimeout(() => {
            this.msgInputRef?.nativeElement?.focus();
        }, 50);
    }

    cancelReply() {
        this.replyingTo = null;
        this.cdr.markForCheck();
    }

    getReplySnippet(replyTo?: any): string {
        if (!replyTo) return '';
        if (replyTo.text && replyTo.text.trim()) return replyTo.text;
        if (replyTo.type === 'image') return '📷 [Hình ảnh]';
        if (replyTo.type === 'gif') return '🎬 [GIF]';
        if (replyTo.type === 'video') return '🎥 [Video]';
        if (replyTo.type === 'audio') return '🎵 [Âm thanh]';
        if (replyTo.type === 'file') return '📁 [Tập tin]';
        return 'Tin nhắn đính kèm';
    }

    scrollToMessage(messageId: string) {
        if (!messageId) return;
        const element = document.getElementById(`msg-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-emerald-500/20', 'transition', 'duration-500');
            setTimeout(() => {
                element.classList.remove('bg-emerald-500/20');
            }, 1500);
        }
    }

    // --- XÓA TIN NHẮN ---
    isMyMessage(msg: ChatMessage): boolean {
        if (!msg) return false;
        const currentUserId = this.authStore.user()?.id;
        const currentUsername = this.authStore.user()?.username;

        if (currentUserId && msg.senderId === currentUserId) return true;
        if (msg.senderId === 'user') return true;
        if (currentUsername && (msg.senderId === currentUsername || msg.senderName === currentUsername)) return true;

        return false;
    }

    onDeleteMessage(messageId: string | number | undefined, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        if (!messageId) return;

        const strId = String(messageId);
        if (this.serverService.activeServerId()) {
            this.serverService.deleteMessage(strId);
        } else {
            this.friendService.deleteMessage(strId);
        }
    }

    ngOnInit() {
        // Đọc params từ URL (/chat/:id hoặc /channels/:serverId/:channelId)
        this.route.paramMap.subscribe(params => {
            const serverId = params.get('serverId');
            const channelId = params.get('channelId');
            const friendId = params.get('id');

            // Reset typing state on channel/chat change
            this.typingUsersMap.forEach(v => clearTimeout(v.timer));
            this.typingUsersMap.clear();
            this.typingUsers = [];
            this.replyingTo = null;
            this.activeReactionMsgId = null;

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
            this.pendingAttachments = [];
            this.showMediaPicker = false;
            this.cdr.markForCheck();
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

    // Message send queue to preserve strict chronological ordering
    private sendQueue: Promise<any> = Promise.resolve();

    // --- GỬI TIN NHẮN CHUNG ---

    onSendMessage() {
        const text = this.messageText.trim();
        const hasAttachments = this.pendingAttachments.length > 0;

        if (!text && !hasAttachments) return;

        const user = this.authStore.user();
        const senderName = user?.displayName || user?.username || 'Bạn';
        const senderId = user?.id || 'user';

        // Clear typing indicator
        if (this.isCurrentlyTyping) {
            this.isCurrentlyTyping = false;
            this.broadcastTyping(false, senderId, senderName);
        }
        if (this.myTypingTimeout) clearTimeout(this.myTypingTimeout);

        const currentReply = this.replyingTo ? {
            id: this.replyingTo.id,
            senderName: this.replyingTo.senderName || 'Người dùng',
            text: this.getReplySnippet(this.replyingTo),
            type: this.replyingTo.type || 'text',
            mediaUrl: this.replyingTo.mediaUrl || null
        } : null;

        this.replyingTo = null;

        if (hasAttachments) {
            const attachmentsToUpload = [...this.pendingAttachments];
            this.pendingAttachments = [];
            this.messageText = '';
            this.showMediaPicker = false;
            this.isUploading = true;
            this.cdr.markForCheck();

            this.sendQueue = this.sendQueue
                .then(() => this.uploadAndSend(text, senderName, senderId, attachmentsToUpload, currentReply))
                .finally(() => {
                    this.isUploading = false;
                    this.cdr.markForCheck();
                });
        } else {
            const msgText = text;
            this.messageText = '';
            this.showMediaPicker = false;
            this.cdr.markForCheck();

            this.sendQueue = this.sendQueue.then(() => {
                this.sendTextMessage(msgText, senderName, senderId, currentReply);
            });
        }
    }

    private sendTextMessage(text: string, senderName: string, senderId: string, replyTo?: any) {
        const opts = { type: 'text' as const, replyTo };
        if (this.serverService.activeServerId()) {
            this.serverService.sendMessage(text, senderName, senderId, opts);
        } else {
            this.friendService.sendMessage(text, senderName, senderId, opts);
        }
    }

    private async uploadAndSend(text: string, senderName: string, senderId: string, attachmentsToUpload: PendingAttachment[], replyTo?: any) {
        const backendBase = this.apiConfig?.baseUrl || getDynamicBaseUrl();

        try {
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
                        if (!res.ok) throw new Error(`Upload server error: ${res.status}`);
                        const data = await res.json() as { url: string; name: string; size: number; mimeType: string };
                        const finalUrl = data.url.startsWith('http') ? data.url : `${backendBase}${data.url}`;
                        return {
                            url: finalUrl,
                            name: data.name || p.name,
                            size: data.size || p.size,
                            type: p.type
                        };
                    } catch (uploadErr) {
                        console.warn('Upload lên backend thất bại, chuyển đổi sang Base64 để gửi đám mây:', uploadErr);
                        // Fallback: convert to base64 Data URL so other users can see the image
                        const base64Url = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string || p.previewUrl);
                            reader.onerror = () => resolve(p.previewUrl);
                            reader.readAsDataURL(p.file);
                        });
                        return {
                            url: base64Url,
                            name: p.name,
                            size: p.size,
                            type: p.type
                        };
                    }
                })
            );

            const primaryType = uploadedAttachments[0]?.type || 'file';
            const opts = { type: primaryType as any, attachments: uploadedAttachments, replyTo };

            if (this.serverService.activeServerId()) {
                this.serverService.sendMessage(text, senderName, senderId, opts);
            } else {
                this.friendService.sendMessage(text, senderName, senderId, opts);
            }
        } catch (err) {
            console.error('Lỗi khi gửi tệp:', err);
        }
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
        const senderName = user?.displayName || user?.username || 'Bạn';
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

            // Create a local object URL for preview
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
        const att = this.pendingAttachments[index];
        if (att?.previewUrl && att.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(att.previewUrl);
        }
        this.pendingAttachments = this.pendingAttachments.filter((_, i) => i !== index);
        this.cdr.markForCheck();
    }

    clearAllAttachments() {
        for (const att of this.pendingAttachments) {
            if (att?.previewUrl && att.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(att.previewUrl);
            }
        }
        this.pendingAttachments = [];
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

    getGifTitle(msg: ChatMessage): string {
        if (!msg) return 'GIF';
        const meta = msg.metadata as Record<string, any> | undefined;
        if (meta && typeof meta === 'object' && meta['title']) {
            return String(meta['title']);
        }
        return msg.text || 'GIF';
    }

    getFileExt(name?: string): string {
        if (!name) return '';
        const parts = name.split('.');
        if (parts.length <= 1) return '';
        return parts[parts.length - 1].toUpperCase();
    }

    getFileCategory(name?: string, type?: string): string {
        if (type === 'image') return 'image';
        if (type === 'video') return 'video';
        if (type === 'audio') return 'audio';
        const ext = (this.getFileExt(name) || '').toLowerCase();
        if (['pdf'].includes(ext)) return 'pdf';
        if (['doc', 'docx', 'txt', 'rtf', 'odt', 'pages'].includes(ext)) return 'doc';
        if (['xls', 'xlsx', 'csv', 'tsv', 'numbers'].includes(ext)) return 'sheet';
        if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) return 'archive';
        if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs', 'sql', 'sh', 'yaml', 'yml', 'xml'].includes(ext)) return 'code';
        if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) return 'audio';
        if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) return 'video';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
        return 'file';
    }

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
            const name = this.authStore.user()?.displayName || this.authStore.user()?.username || 'B';
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
        const target = event.target as HTMLElement;
        // Close media picker if clicked outside
        if (!target.closest('.media-picker-panel') && !target.closest('.media-trigger-btn')) {
            if (this.showMediaPicker) {
                this.showMediaPicker = false;
                this.cdr.markForCheck();
            }
        }
        // Close reaction picker if clicked outside
        if (!target.closest('.reaction-picker-panel') && !target.closest('.reaction-trigger-btn')) {
            if (this.activeReactionMsgId) {
                this.activeReactionMsgId = null;
                this.cdr.markForCheck();
            }
        }
    }
}