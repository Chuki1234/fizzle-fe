import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Friend, ChatMessage } from '../models/friend.model';
import { API_CONFIG } from '../http/api.config';
import { SocketService } from './socket';
import { SupabaseRealtimeService } from './supabase-realtime.service';
import { AuthStore } from '../auth/auth.store';
import { NotificationService } from './notification.service';
import { cleanStatusString } from './profile';

@Injectable({
    providedIn: 'root'
})
export class FriendService implements OnDestroy {
    private http = inject(HttpClient);
    private apiConfig = inject(API_CONFIG);
    private socketService = inject(SocketService);
    private supabaseRealtime = inject(SupabaseRealtimeService);
    private authStore = inject(AuthStore);
    private notificationService = inject(NotificationService);

    // 1. Danh sách bạn bè gốc
    friends = signal<Friend[]>([]);

    // 2. Tab đang chọn
    activeTab = signal<'online' | 'all' | 'pending' | 'add'>('online');

    // 3. Trạng thái Chat Active
    activeChatId = signal<string>('');

    // 4. Danh sách ID trong cột DM bên trái
    directMessageIds = signal<string[]>([]);

    // 5. Kho lưu trữ tin nhắn riêng cho từng ID
    private messagesByFriend = signal<Record<string, ChatMessage[]>>({});


    // Search state
    searchQuery = signal<string>('');
    searchResults = signal<Friend[]>([]);
    isSearching = signal<boolean>(false);
    searchError = signal<string>('');
    friendRequestStatus = signal<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});

    // Unread message count per friend ID (for badge)
    unreadCounts = signal<Record<string, number>>({});

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

    private upsertDM(currentList: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
        if (!incoming || !incoming.text) return currentList;

        // 1. Nếu đã có chính xác ID này trong danh sách -> không thêm mới
        const exactIdIndex = currentList.findIndex(m => m.id === incoming.id);
        if (exactIdIndex !== -1) {
            const updated = [...currentList];
            updated[exactIdIndex] = { ...currentList[exactIdIndex], ...incoming };
            return updated;
        }

        // 2. Tìm tin nhắn tạm cùng senderId và cùng text gửi trong vòng 12 giây gần nhất
        const matchingTempIndex = currentList.findIndex(m => {
            if (m.senderId !== incoming.senderId || m.text.trim() !== incoming.text.trim()) return false;
            // Nếu m.id là timestamp số hoặc gần thời gian này
            const mTime = Number(m.id);
            if (!isNaN(mTime) && Math.abs(Date.now() - mTime) < 12000) return true;
            if (m.timestamp === incoming.timestamp) return true;
            return false;
        });

        if (matchingTempIndex !== -1) {
            const updated = [...currentList];
            updated[matchingTempIndex] = { ...currentList[matchingTempIndex], ...incoming };
            return updated;
        }

        // 3. Nếu chưa có -> thêm vào danh sách
        return [...currentList, incoming];
    }

    constructor() {
        // Load friends from backend
        this.loadFriendsFromBackend();

        const handleIncomingDM = (senderId: string, targetId: string, message: any) => {
            const currentUserId = this.authStore.user()?.id;
            // Identify conversation partner
            let partnerId = '';
            if (currentUserId) {
                partnerId = (senderId === currentUserId) ? targetId : senderId;
            } else {
                partnerId = (senderId === 'user') ? targetId : senderId;
            }

            if (!partnerId) return;

            // Update messages store with deduplication
            this.messagesByFriend.update(store => {
                const current = store[partnerId] || [];
                return { ...store, [partnerId]: this.upsertDM(current, message) };
            });

            // Auto add to DM sidebar
            if (!this.directMessageIds().includes(partnerId)) {
                this.directMessageIds.update(ids => [...ids, partnerId]);

                const alreadyKnown = this.friends().some(f => f.id === partnerId);
                if (!alreadyKnown) {
                    this.friends.update(list => [
                        ...list,
                        {
                            id: partnerId,
                            username: partnerId,
                            displayName: message.senderName || partnerId,
                            avatarUrl: message.senderAvatarUrl || message.avatarUrl || null,
                            presence: 'online' as const,
                            statusText: '',
                            relationshipStatus: 'friend' as const
                        }
                    ]);
                }
            }

            // Track unread if partner is not currently active chat
            if (this.activeChatId() !== partnerId && senderId !== currentUserId) {
                this.unreadCounts.update(counts => ({
                    ...counts,
                    [partnerId]: (counts[partnerId] || 0) + 1
                }));

                this.notificationService.show({
                    type: 'message',
                    title: message.senderName || 'Tin nhắn mới',
                    message: message.text,
                    actionLabel: 'Mở tin nhắn',
                    actionRoute: ['/chat', partnerId]
                });
            }
        };

        // 1. Listen via local Socket
        this.socketService.registerDirectMessageHandler(handleIncomingDM);

        // 2. Listen via Supabase Realtime (Cloud-wide sync for all devices/computers!)
        this.supabaseRealtime.registerDirectMessageHandler(handleIncomingDM);

        // Friend request received via socket
        this.socketService.registerFriendRequestHandler((data) => {
            if (!data) return;
            const fromUserId = data.fromUserId || data.relationship?.userAId;
            if (!fromUserId) return;

            // Trigger backend reload to sync from Supabase
            this.loadFriendsFromBackend();

            // Check if already in list
            const existing = this.friends().find(f => f.id === fromUserId);
            if (!existing) {
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

            const senderName = data.senderDisplayName || data.senderUsername || fromUserId;
            this.notificationService.show({
                type: 'friend_request',
                title: 'Lời mời kết bạn mới 👤',
                message: `Bạn nhận được lời mời kết bạn từ ${senderName}!`,
                actionLabel: 'Xem lời mời',
                actionRoute: ['/friends']
            });
        });

        // Friend request / status changed via Supabase Realtime
        this.supabaseRealtime.registerFriendshipChangeHandler((payload) => {
            const currentUserId = this.authStore.user()?.id;
            if (!currentUserId || !payload) return;

            const row = payload.new;
            this.loadFriendsFromBackend();

            if (row && payload.eventType === 'INSERT' && row.user_b_id === currentUserId && row.status === 'pending') {
                this.notificationService.show({
                    type: 'friend_request',
                    title: 'Lời mời kết bạn mới 👤',
                    message: `Bạn vừa nhận được một lời mời kết bạn mới!`,
                    actionLabel: 'Xem lời mời',
                    actionRoute: ['/friends']
                });
            } else if (row && row.status === 'friend') {
                this.notificationService.show({
                    type: 'friend_request',
                    title: 'Đã trở thành bạn bè 🎉',
                    message: `Lời mời kết bạn đã được chấp nhận!`,
                    actionLabel: 'Xem danh sách bạn bè',
                    actionRoute: ['/friends']
                });
            }
        });

        // Friend accepted via socket
        this.socketService.registerFriendAcceptedHandler((data) => {
            if (!data) return;
            const currentUserId = this.authStore.user()?.id || 'user';
            const otherId = data.userAId === currentUserId ? data.userBId : data.userAId;

            // Reload friends from backend to reflect Supabase state immediately
            this.loadFriendsFromBackend();

            if (otherId) {
                this.friends.update(list =>
                    list.map(f => f.id === otherId ? { ...f, relationshipStatus: 'friend' } : f)
                );
            }
        });

        // User profile / status / customStatus / avatar updated via socket or Supabase
        const handleProfileUpdate = (data: any) => {
            if (!data || (!data.userId && !data.id)) return;
            const updatedId = data.userId || data.id;

            this.friends.update(currentList => {
                const existing = currentList.find(f => f.id === updatedId);
                if (!existing) return currentList;

                return currentList.map(friend => {
                    if (friend.id === updatedId) {
                        const rawText = data.statusText || data.customStatus || data.status_message || '';
                        const cleanText = rawText && !rawText.startsWith('{') ? rawText : cleanStatusString(rawText) || friend.statusText || '';
                        const rawCustom = data.customStatus || data.custom_status || '';
                        const cleanCustom = rawCustom && !rawCustom.startsWith('{') ? rawCustom : cleanStatusString(rawCustom) || friend.customStatus || null;
                        return {
                            ...friend,
                            displayName: data.displayName || data.display_name || friend.displayName,
                            avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : (data.avatar_url !== undefined ? data.avatar_url : friend.avatarUrl),
                            presence: data.presence ?? friend.presence,
                            statusText: cleanText,
                            customStatus: cleanCustom,
                            customStatusEmoji: data.customStatusEmoji !== undefined ? data.customStatusEmoji : friend.customStatusEmoji,
                        };
                    }
                    return friend;
                });
            });
        };

        this.socketService.registerUserStatusUpdatedHandler(handleProfileUpdate);
        this.supabaseRealtime.registerProfileChangeHandler(handleProfileUpdate);
    }

    ngOnDestroy() {
        // Cleanup
    }

    // --- Helper parse status an toàn (không fallback về JSON thô) ---
    getDisplayStatus(friend: Friend): string {
        const usernameTag = `@${friend.username}`;
        const idTag = `@${friend.id}`;
        
        // 1. Ưu tiên customStatus đã được clean từ backend
        const emoji = friend.customStatusEmoji?.trim() || '';
        const custom = friend.customStatus?.trim() || '';
        if (custom && !custom.startsWith('{') && custom !== usernameTag && custom !== friend.username && custom !== idTag && custom !== friend.id) {
            return emoji ? `${emoji} ${custom}` : custom;
        }
        // 2. Thử parse statusText nếu có
        const rawText = friend.statusText?.trim() || '';
        if (rawText.startsWith('{')) {
            const parsed = cleanStatusString(rawText);
            if (parsed && parsed !== usernameTag && parsed !== friend.username && parsed !== idTag && parsed !== friend.id) {
                return parsed;
            }
        } else if (rawText && !rawText.startsWith('{') && rawText !== usernameTag && rawText !== friend.username && rawText !== idTag && rawText !== friend.id) {
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
                if (data) {
                    // Map backend response to Friend model with clean status strings
                    const mapped = data.map(u => {
                        // Parse statusText an toàn: không fallback về JSON raw
                        const cleanText = cleanStatusString(u.statusText);
                        const cleanCustom = cleanStatusString(u.customStatus);
                        return {
                            ...u,
                            statusText: cleanText || '',
                            customStatus: cleanCustom || null,
                            relationshipStatus: (u.relationshipStatus as any) || 'friend'
                        };
                    });
                    this.friends.set(mapped);

                    // Auto-add current DM friends to directMessageIds
                    const friendIds = mapped
                        .filter(f => f.relationshipStatus === 'friend')
                        .slice(0, 10)
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
                this.messagesByFriend.update(store => {
                    const current = store[friendId] || [];
                    if (!msgs || msgs.length === 0) {
                        return store;
                    }
                    const serverMsgIds = new Set(msgs.map(m => m.id));
                    const pendingMsgs = current.filter(m => !serverMsgIds.has(m.id) && (Date.now() - Number(m.id)) < 15000);
                    return {
                        ...store,
                        [friendId]: [...msgs, ...pendingMsgs]
                    };
                });
            },
            error: (err) => console.warn(`Could not load direct messages for friend ${friendId}:`, err)
        });
    }

    // --- Đổi người dùng đang chat ---
    setActiveChat(id: string) {
        this.activeChatId.set(id);
        // Clear unread count when opening chat
        this.unreadCounts.update(counts => ({ ...counts, [id]: 0 }));
        if (!this.directMessageIds().includes(id)) {
            this.directMessageIds.update(ids => [...ids, id]);
        }
        this.loadDirectMessages(id);
    }

    // --- Gửi tin nhắn ---
    sendMessage(text: string, senderName: string = 'Người dùng', senderId: string = 'user') {
        if (!text.trim()) return;

        const currentChatId = this.activeChatId();
        if (!currentChatId) return;

        const currentUser = this.authStore.user();
        const avatarUrl = currentUser?.avatarUrl || null;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            senderId: senderId,
            senderName: senderName,
            senderAvatarUrl: avatarUrl,
            avatarUrl: avatarUrl,
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Optimistic update
        this.messagesByFriend.update(store => {
            const currentList = store[currentChatId] || [];
            return { ...store, [currentChatId]: this.upsertDM(currentList, userMsg) };
        });

        // 1. Fail-safe Supabase Realtime Broadcast (direct cloud WebSocket to other machine)
        this.supabaseRealtime.broadcastDirectMessage(senderId, currentChatId, userMsg);

        // 2. Send to backend (which will persist to DB & broadcast via Socket.IO)
        const params = senderId ? `?userId=${senderId}` : '';
        this.http.post<ChatMessage>(`${this.apiConfig.baseUrl}/messages/direct/${currentChatId}${params}`, {
            text: text,
            senderId: senderId,
            senderName: senderName,
            senderAvatarUrl: avatarUrl
        }).subscribe({
            next: (savedMsg) => {
                if (savedMsg?.id) {
                    this.messagesByFriend.update(store => {
                        const currentList = store[currentChatId] || [];
                        return { ...store, [currentChatId]: this.upsertDM(currentList, { ...userMsg, ...savedMsg }) };
                    });
                }
            },
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

                // Reload friends from backend so Supabase state is reflected immediately
                this.loadFriendsFromBackend();

                // Optimistically update friends list to show pending_outgoing
                const existing = this.friends().find(f => f.id === targetUserId);
                if (!existing) {
                    const result = this.searchResults().find(r => r.id === targetUserId);
                    if (result) {
                        this.friends.update(list => [...list, { ...result, relationshipStatus: 'pending_outgoing' as any }]);
                    }
                } else {
                    this.friends.update(list => list.map(f => f.id === targetUserId ? { ...f, relationshipStatus: 'pending_outgoing' as any } : f));
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
                this.loadFriendsFromBackend();
                // Add to DM sidebar
                if (!this.directMessageIds().includes(id)) {
                    this.directMessageIds.update(ids => [...ids, id]);
                }
            },
            error: (err) => {
                console.warn('Failed to accept friend request:', err);
                this.loadFriendsFromBackend();
            }
        });
    }

    // --- Từ chối kết bạn ---
    rejectFriend(id: string) {
        const userId = this.authStore.user()?.id;
        const params = userId ? `?userId=${userId}` : '';

        this.http.post<any>(`${this.apiConfig.baseUrl}/friends/${id}/reject${params}`, {}).subscribe({
            next: () => {
                this.loadFriendsFromBackend();
            },
            error: (err) => {
                console.warn('Failed to reject friend request:', err);
                this.loadFriendsFromBackend();
            }
        });
    }
}