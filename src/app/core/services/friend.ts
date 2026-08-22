import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Friend, ChatMessage } from '../models/friend.model';
import { API_CONFIG } from '../http/api.config';
import { SocketService } from './socket';
import { AuthStore } from '../auth/auth.store';
import { cleanStatusString } from './profile';

@Injectable({
    providedIn: 'root'
})
export class FriendService implements OnDestroy {
    private http = inject(HttpClient);
    private apiConfig = inject(API_CONFIG);
    private socketService = inject(SocketService);
    private authStore = inject(AuthStore);

    // 1. Danh sách bạn bè gốc
    friends = signal<Friend[]>([
        {
            id: 'kevin',
            username: 'kevin_se',
            displayName: 'Kevin',
            avatarUrl: null,
            presence: 'online',
            statusText: 'Đang chơi League of Legends 🎮',
            relationshipStatus: 'friend'
        },
        {
            id: 'hoang',
            username: 'nam_dev',
            displayName: 'Hoàng Nam',
            avatarUrl: null,
            presence: 'dnd',
            statusText: 'Đang làm Đồ Án Cuối Kỳ Java 💻',
            relationshipStatus: 'friend'
        },
        {
            id: 'minh',
            username: 'tri_mcfc',
            displayName: 'Minh Trí',
            avatarUrl: null,
            presence: 'online',
            statusText: 'Đang xem Highlights Manchester City ⚽',
            relationshipStatus: 'friend'
        },
        {
            id: 'bao',
            username: 'bao_game',
            displayName: 'Gia Bảo',
            avatarUrl: null,
            presence: 'idle',
            statusText: 'Chờ xíu đi pha cà phê ☕',
            relationshipStatus: 'friend'
        },
        {
            id: 'anh',
            username: 'anh_tuan',
            displayName: 'Tuấn Anh',
            avatarUrl: null,
            presence: 'offline',
            statusText: 'Ngoại tuyến',
            relationshipStatus: 'friend'
        },
        {
            id: 'khang',
            username: 'khang_hsu',
            displayName: 'Quốc Khang',
            avatarUrl: null,
            presence: 'online',
            statusText: 'Muốn kết bạn với bạn',
            relationshipStatus: 'pending'
        }
    ]);

    // 2. Tab đang chọn
    activeTab = signal<'online' | 'all' | 'pending' | 'add'>('online');

    // 3. Trạng thái Chat Active
    activeChatId = signal<string>('kevin');

    // 4. Danh sách ID trong cột DM bên trái
    directMessageIds = signal<string[]>(['kevin']);

    // 5. Kho lưu trữ tin nhắn riêng cho từng ID
    private messagesByFriend = signal<Record<string, ChatMessage[]>>({
        kevin: [
            {
                id: '1',
                senderId: 'kevin',
                senderName: 'Kevin',
                text: 'Chiều nay ghé Highlands học tiếp không Phúc?',
                timestamp: '10:45 AM'
            }
        ],
        bao: [
            {
                id: '1',
                senderId: 'bao',
                senderName: 'Gia Bảo',
                text: 'Chiều nay ghé Highlands học tiếp không Phúc?',
                timestamp: '10:45 AM'
            }
        ]
    });

    // Search state
    searchQuery = signal<string>('');
    searchResults = signal<Friend[]>([]);
    isSearching = signal<boolean>(false);
    searchError = signal<string>('');
    friendRequestStatus = signal<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});

    // --- COMPUTED PROPERTIES ---

    filteredFriends = computed(() => {
        const list = this.friends();
        const tab = this.activeTab();

        if (tab === 'online') {
            return list.filter(f => f.relationshipStatus === 'friend' && f.presence !== 'offline');
        }
        if (tab === 'pending') {
            return list.filter(f => f.relationshipStatus === 'pending');
        }
        if (tab === 'add') {
            return [];
        }
        return list.filter(f => f.relationshipStatus === 'friend');
    });

    pendingCount = computed(() => this.friends().filter(f => f.relationshipStatus === 'pending').length);
    onlineCount = computed(() => this.friends().filter(f => f.relationshipStatus === 'friend' && f.presence !== 'offline').length);

    activeFriend = computed(() => {
        const id = this.activeChatId();
        return this.friends().find(f => f.id === id) || this.friends()[0];
    });

    directMessages = computed(() => {
        const ids = this.directMessageIds();
        return this.friends().filter(f => ids.includes(f.id));
    });

    messages = computed(() => {
        const activeId = this.activeChatId();
        return this.messagesByFriend()[activeId] || [];
    });

    constructor() {
        // Load friends from backend
        this.loadFriendsFromBackend();

        if (this.activeChatId()) {
            this.loadDirectMessages(this.activeChatId());
        }

        // Register realtime DM handler
        this.socketService.registerDirectMessageHandler((senderId, targetId, message) => {
            // Determine which friend ID to use as the "conversation partner"
            const currentUserId = this.authStore.user()?.id || 'user';
            const partnerId = senderId === currentUserId ? targetId : senderId;

            // Don't add if it came from current user (already added optimistically)
            if (senderId === currentUserId) return;

            this.messagesByFriend.update(store => {
                const current = store[partnerId] || [];
                // Avoid duplicates
                if (current.some(m => m.id === message.id)) return store;
                return { ...store, [partnerId]: [...current, message] };
            });

            // Auto add to DM sidebar
            if (!this.directMessageIds().includes(partnerId)) {
                this.directMessageIds.update(ids => [...ids, partnerId]);
            }
        });

        // Friend request received via socket
        this.socketService.registerFriendRequestHandler((data) => {
            if (!data) return;
            const fromUserId = data.fromUserId || data.relationship?.userAId;
            if (!fromUserId) return;

            // Check if already in list
            const existing = this.friends().find(f => f.id === fromUserId);
            if (!existing) {
                // Add as pending from backend search or a placeholder
                this.friends.update(list => [
                    ...list,
                    {
                        id: fromUserId,
                        username: fromUserId,
                        displayName: fromUserId,
                        avatarUrl: null,
                        presence: 'online',
                        statusText: 'Muốn kết bạn với bạn',
                        relationshipStatus: 'pending'
                    }
                ]);
            } else if (existing.relationshipStatus !== 'pending') {
                this.friends.update(list =>
                    list.map(f => f.id === fromUserId ? { ...f, relationshipStatus: 'pending' } : f)
                );
            }
        });

        // Friend accepted via socket
        this.socketService.registerFriendAcceptedHandler((data) => {
            if (!data) return;
            const currentUserId = this.authStore.user()?.id || 'user';
            const otherId = data.userAId === currentUserId ? data.userBId : data.userAId;
            if (otherId) {
                this.friends.update(list =>
                    list.map(f => f.id === otherId ? { ...f, relationshipStatus: 'friend' } : f)
                );
            }
        });

        // User profile / status / customStatus / avatar updated via socket
        this.socketService.registerUserStatusUpdatedHandler((data) => {
            if (!data || (!data.userId && !data.id)) return;
            const updatedId = data.userId || data.id;

            // Update reactive friends signal array
            this.friends.update(currentList => {
                const existing = currentList.find(f => f.id === updatedId);
                if (!existing) return currentList;

                return currentList.map(friend => {
                    if (friend.id === updatedId) {
                        // Ưu tiên statusText đã được backend parse sạch
                        const rawText = data.statusText || data.customStatus || '';
                        const cleanText = rawText && !rawText.startsWith('{') ? rawText : cleanStatusString(rawText) || friend.statusText || '';
                        const rawCustom = data.customStatus || '';
                        const cleanCustom = rawCustom && !rawCustom.startsWith('{') ? rawCustom : cleanStatusString(rawCustom) || friend.customStatus || null;
                        return {
                            ...friend,
                            displayName: data.displayName ?? friend.displayName,
                            avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : friend.avatarUrl,
                            presence: data.presence ?? friend.presence,
                            statusText: cleanText,
                            customStatus: cleanCustom,
                            customStatusEmoji: data.customStatusEmoji !== undefined ? data.customStatusEmoji : friend.customStatusEmoji,
                        };
                    }
                    return friend;
                });
            });
        });
    }

    ngOnDestroy() {
        // Cleanup
    }

    // --- Helper parse status an toàn (không fallback về JSON thô) ---
    getDisplayStatus(friend: Friend): string {
        // 1. Ưu tiên customStatus đã được clean từ backend
        const emoji = friend.customStatusEmoji?.trim() || '';
        const custom = friend.customStatus?.trim() || '';
        if (custom && !custom.startsWith('{')) {
            return emoji ? `${emoji} ${custom}` : custom;
        }
        // 2. Thử parse statusText nếu là JSON
        const rawText = friend.statusText || '';
        if (rawText.startsWith('{')) {
            const parsed = cleanStatusString(rawText);
            if (parsed) return parsed;
            // JSON không parse được => dùng presence label
        } else if (rawText && !rawText.startsWith('{')) {
            return rawText;
        }
        // 3. Fallback theo presence
        switch (friend.presence) {
            case 'online': return 'Trực tuyến';
            case 'idle': return 'Chờ';
            case 'dnd': return 'Đừng làm phiền';
            default: return 'Ngoại tuyến';
        }
    }

    // --- Load bạn bè từ backend ---
    loadFriendsFromBackend() {
        const userId = this.authStore.user()?.id;
        const params = userId ? `?userId=${userId}` : '';
        this.http.get<Friend[]>(`${this.apiConfig.baseUrl}/friends${params}`).subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    // Map backend response to Friend model with clean status strings
                    const mapped = data.map(u => {
                        // Parse statusText an toàn: không fallback về JSON raw
                        const cleanText = cleanStatusString(u.statusText);
                        const cleanCustom = cleanStatusString(u.customStatus);
                        return {
                            ...u,
                            // Nếu parse thành công thì dùng, ngược lại để rỗng
                            statusText: cleanText || '',
                            customStatus: cleanCustom || null,
                            relationshipStatus: (u.relationshipStatus as any) || 'friend'
                        };
                    });
                    this.friends.set(mapped);

                    // Auto-add current DM friends to directMessageIds
                    const friendIds = mapped
                        .filter(f => f.relationshipStatus === 'friend')
                        .slice(0, 5)
                        .map(f => f.id);
                    const current = this.directMessageIds();
                    const merged = [...new Set([...current, ...friendIds])];
                    this.directMessageIds.set(merged);
                }
            },
            error: (err) => console.warn('Could not load friends from backend:', err)
        });
    }

    // --- Load tin nhắn từ backend ---
    loadDirectMessages(friendId: string) {
        if (!friendId) return;
        const userId = this.authStore.user()?.id;
        const params = userId ? `?userId=${userId}` : '';
        this.http.get<ChatMessage[]>(`${this.apiConfig.baseUrl}/messages/direct/${friendId}${params}`).subscribe({
            next: (msgs) => {
                this.messagesByFriend.update(store => ({
                    ...store,
                    [friendId]: msgs
                }));
            },
            error: (err) => console.warn(`Could not load direct messages for friend ${friendId}:`, err)
        });
    }

    // --- Đổi người dùng đang chat ---
    setActiveChat(id: string) {
        this.activeChatId.set(id);
        if (!this.directMessageIds().includes(id)) {
            this.directMessageIds.update(ids => [...ids, id]);
        }
        this.loadDirectMessages(id);
    }

    // --- Gửi tin nhắn ---
    sendMessage(text: string, senderName: string = 'Thiện Phúc', senderId: string = 'user') {
        if (!text.trim()) return;

        const currentChatId = this.activeChatId();

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            senderId: senderId,
            senderName: senderName,
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Optimistic update
        this.messagesByFriend.update(store => {
            const currentList = store[currentChatId] || [];
            return { ...store, [currentChatId]: [...currentList, userMsg] };
        });

        // Send to backend (which will broadcast via socket to the recipient)
        this.http.post<ChatMessage>(`${this.apiConfig.baseUrl}/messages/direct/${currentChatId}`, {
            text: text,
            senderId: senderId,
            senderName: senderName
        }).subscribe({
            error: (err) => console.warn('Could not persist direct message to backend:', err)
        });
    }

    // --- Tìm kiếm người dùng ---
    searchUsers(query: string) {
        const trimmed = query.trim();
        this.searchQuery.set(trimmed);

        if (!trimmed) {
            this.searchResults.set([]);
            this.searchError.set('');
            return;
        }

        this.isSearching.set(true);
        this.searchError.set('');

        const userId = this.authStore.user()?.id;
        const params = `?q=${encodeURIComponent(trimmed)}${userId ? `&userId=${userId}` : ''}`;

        this.http.get<Friend[]>(`${this.apiConfig.baseUrl}/friends/search${params}`).subscribe({
            next: (results) => {
                this.searchResults.set(results || []);
                this.isSearching.set(false);
            },
            error: (err) => {
                console.warn('Friend search failed:', err);
                this.searchResults.set([]);
                this.isSearching.set(false);
                this.searchError.set('Không thể tìm kiếm. Thử lại sau.');
            }
        });
    }

    // --- Gửi lời mời kết bạn ---
    sendFriendRequest(targetUserId: string, targetUsername?: string) {
        const currentStatus = this.friendRequestStatus()[targetUserId];
        if (currentStatus === 'sending' || currentStatus === 'sent') return;

        this.friendRequestStatus.update(s => ({ ...s, [targetUserId]: 'sending' }));

        const userId = this.authStore.user()?.id;

        this.http.post<any>(`${this.apiConfig.baseUrl}/friends/request`, {
            targetUserId,
            targetUsername,
            senderId: userId || 'user'
        }).subscribe({
            next: () => {
                this.friendRequestStatus.update(s => ({ ...s, [targetUserId]: 'sent' }));
                // Update friends list to show pending_outgoing
                const existing = this.friends().find(f => f.id === targetUserId);
                if (!existing) {
                    const result = this.searchResults().find(r => r.id === targetUserId);
                    if (result) {
                        this.friends.update(list => [...list, { ...result, relationshipStatus: 'pending' as any }]);
                    }
                }
            },
            error: (err) => {
                console.warn('Failed to send friend request:', err);
                this.friendRequestStatus.update(s => ({ ...s, [targetUserId]: 'error' }));
            }
        });
    }

    // --- Chấp nhận kết bạn ---
    acceptFriend(id: string) {
        const userId = this.authStore.user()?.id;
        const params = userId ? `?userId=${userId}` : '';

        this.http.post<any>(`${this.apiConfig.baseUrl}/friends/${id}/accept${params}`, {}).subscribe({
            next: () => {
                this.friends.update(list =>
                    list.map(f => f.id === id ? { ...f, relationshipStatus: 'friend' } : f)
                );
                // Add to DM sidebar
                if (!this.directMessageIds().includes(id)) {
                    this.directMessageIds.update(ids => [...ids, id]);
                }
            },
            error: (err) => {
                console.warn('Failed to accept friend request:', err);
                // Still update locally
                this.friends.update(list =>
                    list.map(f => f.id === id ? { ...f, relationshipStatus: 'friend' } : f)
                );
            }
        });
    }

    // --- Từ chối kết bạn ---
    rejectFriend(id: string) {
        const userId = this.authStore.user()?.id;
        const params = userId ? `?userId=${userId}` : '';

        this.http.post<any>(`${this.apiConfig.baseUrl}/friends/${id}/reject${params}`, {}).subscribe({
            next: () => {
                this.friends.update(list => list.filter(f => f.id !== id));
            },
            error: (err) => {
                console.warn('Failed to reject friend request:', err);
                this.friends.update(list => list.filter(f => f.id !== id));
            }
        });
    }
}