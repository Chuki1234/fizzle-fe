import { Injectable, signal, computed } from '@angular/core';
import { Friend, ChatMessage } from '../models/friend.model';

@Injectable({
    providedIn: 'root'
})
export class FriendService {
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

    // 2. Tab đang chọn ở màn Friend: 'online' | 'all' | 'pending'
    activeTab = signal<'online' | 'all' | 'pending'>('online');

    // 3. Quản lý trạng thái Chat Active (ID của bạn bè đang nhắn tin)
    activeChatId = signal<string>('kevin');

    // 4. Danh sách ID những người xuất hiện ở cột "TIN NHẮN TRỰC TIẾP" bên trái (Mặc định có kevin)
    directMessageIds = signal<string[]>(['kevin']);

    // 5. Kho lưu trữ tin nhắn riêng cho từng ID bạn bè { [friendId]: ChatMessage[] }
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

    // --- COMPUTED PROPERTIES ---

    // Lọc danh sách bạn bè theo Tab
    filteredFriends = computed(() => {
        const list = this.friends();
        const tab = this.activeTab();

        if (tab === 'online') {
            return list.filter(f => f.relationshipStatus === 'friend' && f.presence !== 'offline');
        }
        if (tab === 'pending') {
            return list.filter(f => f.relationshipStatus === 'pending');
        }
        return list.filter(f => f.relationshipStatus === 'friend');
    });

    // Số lượng đếm cho Badge thông báo
    pendingCount = computed(() => this.friends().filter(f => f.relationshipStatus === 'pending').length);
    onlineCount = computed(() => this.friends().filter(f => f.relationshipStatus === 'friend' && f.presence !== 'offline').length);

    // Thông tin bạn bè hiện tại đang chat
    activeFriend = computed(() => {
        const id = this.activeChatId();
        return this.friends().find(f => f.id === id) || this.friends()[0];
    });

    // Danh sách object bạn bè hiển thị ở cột Direct Messages bên trái
    directMessages = computed(() => {
        const ids = this.directMessageIds();
        return this.friends().filter(f => ids.includes(f.id));
    });

    // Lấy ra đúng danh sách tin nhắn của người đang active chat
    messages = computed(() => {
        const activeId = this.activeChatId();
        return this.messagesByFriend()[activeId] || [];
    });

    // --- ACTIONS / METHODS ---

    // Đổi người dùng đang chat & Tự động thêm vào danh sách DM
    setActiveChat(id: string) {
        this.activeChatId.set(id);

        // Nếu người này chưa có trong danh sách DM bên trái thì tự động thêm vào
        if (!this.directMessageIds().includes(id)) {
            this.directMessageIds.update(ids => [...ids, id]);
        }
    }

    // Gửi tin nhắn đến người đang Active Chat
    sendMessage(text: string) {
        if (!text.trim()) return;

        const currentChatId = this.activeChatId();
        const currentFriend = this.activeFriend();

        // 1. Tạo tin nhắn từ Thiện Phúc
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            senderId: 'user',
            senderName: 'Thiện Phúc',
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // 2. Thêm vào kho tin nhắn của người dùng hiện tại
        this.messagesByFriend.update(store => {
            const currentList = store[currentChatId] || [];
            return {
                ...store,
                [currentChatId]: [...currentList, userMsg]
            };
        });

        // 3. Tự động phản hồi (Auto Reply) từ đúng bạn bè đó sau 1.5s
        setTimeout(() => {
            const replies = [
                "Oke Phúc ơi, chút nữa tớ qua!",
                "Chuẩn bài luôn, đang tính nhắn Phúc nè! 🎮",
                "Đang dở tay debug bài Java xíu, 10p nữa tớ rep nha!",
                "Duyệt nha! Ghé chỗ cũ làm ly cà phê luôn."
            ];
            const randomReply = replies[Math.floor(Math.random() * replies.length)];

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                senderId: currentFriend.id,
                senderName: currentFriend.displayName,
                text: randomReply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            this.messagesByFriend.update(store => {
                const currentList = store[currentChatId] || [];
                return {
                    ...store,
                    [currentChatId]: [...currentList, botMsg]
                };
            });
        }, 1500);
    }

    // Chấp nhận / Từ chối kết bạn
    acceptFriend(id: string) {
        this.friends.update(list =>
            list.map(f => f.id === id ? { ...f, relationshipStatus: 'friend' } : f)
        );
    }

    rejectFriend(id: string) {
        this.friends.update(list => list.filter(f => f.id !== id));
    }
}