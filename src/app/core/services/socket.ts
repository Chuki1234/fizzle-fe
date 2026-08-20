import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { ChatStore } from '../../features/chat/stores/chat.stores'; // 🛠️ Đã sửa thành chat.stores

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private chatStore = inject(ChatStore);

  connect(token: string) {
    this.socket = io('http://localhost:3000', {
      auth: { token }
    });

    this.listenEvents();
  }

  private listenEvents() {
    // 🛠️ Ép kiểu (any) cho data để hết lỗi 'Object is of type unknown'
    this.socket.on('receive_message', (data: any) => {
      if (data?.roomId && data?.message) {
        this.chatStore.addMessage(data.roomId, data.message);
      }
    });

    this.socket.on('message_deleted', (data: any) => {
      // Logic xóa nếu cần sau này
    });
  }

  sendMessage(roomId: string, content: string, attachments: any[] = []) {
    this.socket?.emit('send_message', { roomId, content, attachments });
  }

  joinRoom(roomId: string) {
    this.socket?.emit('join_room', { roomId });
  }
}