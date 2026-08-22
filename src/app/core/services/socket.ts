import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private userId: string = '';

  // Callback registry: handlers can be registered by services
  private onChannelMessage?: (channelId: string, message: any) => void;
  private onDirectMessage?: (senderId: string, targetId: string, message: any) => void;
  private onFriendRequestReceived?: (data: any) => void;
  private onFriendAccepted?: (data: any) => void;
  private onServerInviteReceived?: (data: any) => void;
  private onServerUpdated?: (data: any) => void;

  connect(userId: string) {
    if (this.socket?.connected && this.userId === userId) return;

    this.userId = userId;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io('http://localhost:3000', {
      query: { userId },
      auth: { userId },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected with ID:', this.socket.id);
      // Authenticate user
      this.socket.emit('authenticate', { userId });
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    this.listenEvents();
  }

  disconnect() {
    this.socket?.disconnect();
  }

  private listenEvents() {
    // Channel messages
    this.socket.on('channel_message', (data: any) => {
      if (data?.channelId && data?.message) {
        this.onChannelMessage?.(data.channelId, data.message);
      }
    });

    // Direct messages from server
    this.socket.on('receive_message', (data: any) => {
      if (!data) return;

      // Channel message has channelId
      if (data.channelId && data.message) {
        this.onChannelMessage?.(data.channelId, data.message);
        return;
      }

      // DM: has senderId and targetId
      if (data.senderId && data.targetId && data.message) {
        this.onDirectMessage?.(data.senderId, data.targetId, data.message);
        return;
      }
    });

    // Generic DM update
    this.socket.on('dm_update', (data: any) => {
      if (data?.senderId && data?.recipientId && data?.message) {
        this.onDirectMessage?.(data.senderId, data.recipientId, data.message);
      }
    });

    // Friend requests
    this.socket.on('friend_request_received', (data: any) => {
      this.onFriendRequestReceived?.(data);
    });

    this.socket.on('friend_request_event', (data: any) => {
      if (data?.targetUserId === this.userId || data?.requestData?.fromUserId === this.userId) {
        this.onFriendRequestReceived?.(data?.requestData);
      }
    });

    this.socket.on('friend_request_accepted', (data: any) => {
      this.onFriendAccepted?.(data);
    });

    this.socket.on('friend_accepted_event', (data: any) => {
      this.onFriendAccepted?.(data?.data);
    });

    // Server events
    this.socket.on('server_invite_received', (data: any) => {
      this.onServerInviteReceived?.(data);
    });

    this.socket.on('server_updated', (data: any) => {
      this.onServerUpdated?.(data);
    });

    this.socket.on('server_invite_event', (data: any) => {
      if (data?.targetUserId === this.userId) {
        this.onServerInviteReceived?.(data?.serverData);
      }
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