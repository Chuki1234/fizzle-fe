import { signal, computed, Injectable } from '@angular/core';
import { Message, Room } from '../../../shared/models/chat.models';

@Injectable({
    providedIn: 'root'
})
export class ChatStore {
    readonly activeRoomId = signal<string | null>('general');
    readonly rooms = signal<Room[]>([]);
    readonly messagesByRoom = signal<Record<string, Message[]>>({});

    readonly currentMessages = computed(() => {
        const roomId = this.activeRoomId();
        return roomId ? this.messagesByRoom()[roomId] || [] : [];
    });

    setActiveRoom(roomId: string) {
        this.activeRoomId.set(roomId);
    }

    addMessage(roomId: string, message: Message) {
        this.messagesByRoom.update((prev) => ({
            ...prev,
            [roomId]: [...(prev[roomId] || []), message]
        }));
    }

    deleteMessage(roomId: string, messageId: string) {
        this.messagesByRoom.update((prev) => ({
            ...prev,
            [roomId]: (prev[roomId] || []).filter((m) => m.id !== messageId)
        }));
    }
}