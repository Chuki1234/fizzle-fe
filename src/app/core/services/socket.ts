import { Injectable, NgZone, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private ngZone = inject(NgZone);
  private socket!: Socket;
  private userId: string = '';

  // Callback registry: handlers can be registered by services
  private onChannelMessage?: (channelId: string, message: any) => void;
  private onDirectMessage?: (senderId: string, targetId: string, message: any) => void;
  private onFriendRequestReceived?: (data: any) => void;
  private onFriendAccepted?: (data: any) => void;
  private onServerInviteReceived?: (data: any) => void;
  private onServerUpdated?: (data: any) => void;
  private onUserStatusUpdated?: (data: any) => void;

  connect(userId: string) {
    if (this.socket?.connected && this.userId === userId) return;

    this.userId = userId;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io('http://localhost:3000', {
      query: { userId },
      auth: { userId },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        console.log('[Socket] Connected with ID:', this.socket.id, 'userId:', userId);
        this.socket.emit('authenticate', { userId });
      });
    });

    this.socket.on('disconnect', () => {
      this.ngZone.run(() => {
        console.log('[Socket] Disconnected');
      });
    });

    this.socket.on('connect_error', (err) => {
      this.ngZone.run(() => {
        console.warn('[Socket] Connection error:', err.message);
      });
    });

    this.listenEvents();
  }

  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
  }

  private listenEvents() {
    // ---- CHANNEL MESSAGES ----
    this.socket.on('channel_message', (data: any) => {
      this.ngZone.run(() => {
        if (data?.channelId && data?.message) {
          this.onChannelMessage?.(data.channelId, data.message);
        }
      });
    });

    // ---- DIRECT & CHANNEL MESSAGES VIA RECEIVE_MESSAGE ----
    this.socket.on('receive_message', (data: any) => {
      this.ngZone.run(() => {
        if (!data) return;

        // 1. Channel message
        if (data.channelId && data.message) {
          this.onChannelMessage?.(data.channelId, data.message);
          return;
        }

        // 2. Direct message
        const senderId = data.senderId;
        const targetId = data.targetId || data.recipientId;
        if (senderId && targetId && data.message) {
          this.onDirectMessage?.(senderId, targetId, data.message);
          return;
        }
      });
    });

    this.socket.on('direct_message', (data: any) => {
      this.ngZone.run(() => {
        if (data?.senderId && data?.recipientId && data?.message) {
          this.onDirectMessage?.(data.senderId, data.recipientId, data.message);
        }
      });
    });

    this.socket.on('dm_update', (data: any) => {
      this.ngZone.run(() => {
        if (data?.senderId && data?.recipientId && data?.message) {
          this.onDirectMessage?.(data.senderId, data.recipientId, data.message);
        }
      });
    });

    // ---- FRIEND EVENTS ----
    this.socket.on('friend_request_received', (data: any) => {
      this.ngZone.run(() => {
        this.onFriendRequestReceived?.(data);
      });
    });

    this.socket.on('friend_request_event', (data: any) => {
      this.ngZone.run(() => {
        if (data?.targetUserId === this.userId) {
          this.onFriendRequestReceived?.(data?.requestData);
        }
      });
    });

    this.socket.on('friend_request_accepted', (data: any) => {
      this.ngZone.run(() => {
        this.onFriendAccepted?.(data);
      });
    });

    this.socket.on('friend_accepted_event', (data: any) => {
      this.ngZone.run(() => {
        if (data?.userAId === this.userId || data?.userBId === this.userId) {
          this.onFriendAccepted?.(data?.data);
        }
      });
    });

    // ---- SERVER EVENTS ----
    this.socket.on('server_invite_received', (data: any) => {
      this.ngZone.run(() => {
        this.onServerInviteReceived?.(data);
      });
    });

    this.socket.on('server_updated', (data: any) => {
      this.ngZone.run(() => {
        this.onServerUpdated?.(data);
      });
    });

    this.socket.on('server_invite_event', (data: any) => {
      this.ngZone.run(() => {
        if (data?.targetUserId === this.userId) {
          this.onServerInviteReceived?.(data?.serverData);
        }
      });
    });

    // User status/profile/avatar update
    this.socket.on('user_status_updated', (data: any) => {
      this.onUserStatusUpdated?.(data);
    });
  }

  // --- Registration Methods ---

  registerChannelMessageHandler(handler: (channelId: string, message: any) => void) {
    this.onChannelMessage = handler;
  }

  registerDirectMessageHandler(handler: (senderId: string, targetId: string, message: any) => void) {
    this.onDirectMessage = handler;
  }

  registerFriendRequestHandler(handler: (data: any) => void) {
    this.onFriendRequestReceived = handler;
  }

  registerFriendAcceptedHandler(handler: (data: any) => void) {
    this.onFriendAccepted = handler;
  }

  registerServerInviteHandler(handler: (data: any) => void) {
    this.onServerInviteReceived = handler;
  }

  registerServerUpdatedHandler(handler: (data: any) => void) {
    this.onServerUpdated = handler;
  }

  registerUserStatusUpdatedHandler(handler: (data: any) => void) {
    this.onUserStatusUpdated = handler;
  }

  // --- Emit Methods ---

  joinRoom(roomId: string) {
    this.socket?.emit('join_room', { roomId });
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leave_room', { roomId });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}