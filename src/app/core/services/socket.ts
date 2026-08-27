import { Injectable, NgZone, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { getDynamicBaseUrl } from '../http/api.config';

export interface VoiceParticipantInfo {
  socketId: string;
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private ngZone = inject(NgZone);
  private socket!: Socket;
  private userId: string = '';

  // Multi-handler callback registries
  private channelMessageHandlers: Array<(channelId: string, message: any) => void> = [];
  private directMessageHandlers: Array<(senderId: string, targetId: string, message: any) => void> = [];
  private channelTypingHandlers: Array<(data: { channelId: string; userId: string; displayName: string; isTyping: boolean }) => void> = [];
  private dmTypingHandlers: Array<(data: { recipientId: string; userId: string; displayName: string; isTyping: boolean }) => void> = [];
  private channelMessageDeletedHandlers: Array<(data: { channelId: string; messageId: string }) => void> = [];
  private directMessageDeletedHandlers: Array<(data: { friendId: string; senderId?: string; recipientId?: string; messageId: string }) => void> = [];
  private channelReactionHandlers: Array<(data: { channelId: string; messageId: string; reactions: Record<string, string[]> }) => void> = [];
  private directReactionHandlers: Array<(data: { senderId?: string; recipientId?: string; messageId: string; reactions: Record<string, string[]> }) => void> = [];
  private friendRequestHandlers: Array<(data: any) => void> = [];
  private friendAcceptedHandlers: Array<(data: any) => void> = [];
  private serverInviteHandlers: Array<(data: any) => void> = [];
  private serverUpdatedHandlers: Array<(data: any) => void> = [];
  private userStatusUpdatedHandlers: Array<(data: any) => void> = [];

  // WebRTC Voice Handlers
  private voiceRoomUsersHandlers: Array<(data: { channelId: string; users: VoiceParticipantInfo[] }) => void> = [];
  private voiceUserJoinedHandlers: Array<(data: { channelId: string; user: VoiceParticipantInfo }) => void> = [];
  private voiceUserLeftHandlers: Array<(data: { channelId: string; socketId: string; userId: string }) => void> = [];
  private voiceSignalHandlers: Array<(data: { senderSocketId: string; senderUserId: string; signal: any; type: 'offer' | 'answer' | 'ice-candidate' }) => void> = [];
  private voiceUserStateHandlers: Array<(data: { channelId: string; socketId: string; userId: string; isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }) => void> = [];
  private voiceChannelsStateHandlers: Array<(states: Record<string, VoiceParticipantInfo[]>) => void> = [];

  connect(userId: string) {
    if (this.socket?.connected && this.userId === userId) return;

    this.userId = userId;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    const socketUrl = getDynamicBaseUrl();
    console.log('[Socket] Connecting to socket at:', socketUrl, 'for userId:', userId);

    this.socket = io(socketUrl, {
      query: { userId },
      auth: { userId },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        console.log('[Socket] Connected with ID:', this.socket.id, 'userId:', userId);
        this.socket.emit('authenticate', { userId });
        this.socket.emit('request_voice_states');
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
          this.channelMessageHandlers.forEach((h) => h(data.channelId, data.message));
        }
      });
    });

    // ---- DIRECT & CHANNEL MESSAGES VIA RECEIVE_MESSAGE ----
    this.socket.on('receive_message', (data: any) => {
      this.ngZone.run(() => {
        if (!data) return;

        // 1. Channel message
        if (data.channelId && data.message) {
          this.channelMessageHandlers.forEach((h) => h(data.channelId, data.message));
          return;
        }

        // 2. Direct message
        const senderId = data.senderId;
        const targetId = data.targetId || data.recipientId;
        if (senderId && targetId && data.message) {
          this.directMessageHandlers.forEach((h) => h(senderId, targetId, data.message));
          return;
        }
      });
    });

    this.socket.on('direct_message', (data: any) => {
      this.ngZone.run(() => {
        if (data?.senderId && data?.recipientId && data?.message) {
          this.directMessageHandlers.forEach((h) => h(data.senderId, data.recipientId, data.message));
        }
      });
    });

    // ---- TYPING INDICATOR EVENTS ----
    this.socket.on('channel_typing', (data: any) => {
      this.ngZone.run(() => {
        if (data?.channelId && data?.userId) {
          this.channelTypingHandlers.forEach((h) => h(data));
        }
      });
    });

    this.socket.on('dm_typing', (data: any) => {
      this.ngZone.run(() => {
        if (data?.userId) {
          this.dmTypingHandlers.forEach((h) => h(data));
        }
      });
    });

    // ---- MESSAGE DELETED EVENTS ----
    this.socket.on('channel_message_deleted', (data: any) => {
      this.ngZone.run(() => {
        if (data?.channelId && data?.messageId) {
          this.channelMessageDeletedHandlers.forEach((h) => h(data));
        }
      });
    });

    this.socket.on('direct_message_deleted', (data: any) => {
      this.ngZone.run(() => {
        if (data?.messageId) {
          this.directMessageDeletedHandlers.forEach((h) => h(data));
        }
      });
    });

    // ---- MESSAGE REACTION EVENTS ----
    this.socket.on('channel_message_reaction', (data: any) => {
      this.ngZone.run(() => {
        if (data?.channelId && data?.messageId && data?.reactions) {
          this.channelReactionHandlers.forEach((h) => h(data));
        }
      });
    });

    this.socket.on('direct_message_reaction', (data: any) => {
      this.ngZone.run(() => {
        if (data?.messageId && data?.reactions) {
          this.directReactionHandlers.forEach((h) => h(data));
        }
      });
    });

    // ---- FRIEND EVENTS ----
    this.socket.on('friend_request_received', (data: any) => {
      this.ngZone.run(() => {
        this.friendRequestHandlers.forEach((h) => h(data));
      });
    });

    this.socket.on('friend_request_event', (data: any) => {
      this.ngZone.run(() => {
        if (data?.targetUserId === this.userId) {
          this.friendRequestHandlers.forEach((h) => h(data?.requestData));
        }
      });
    });

    this.socket.on('friend_request_accepted', (data: any) => {
      this.ngZone.run(() => {
        this.friendAcceptedHandlers.forEach((h) => h(data));
      });
    });

    this.socket.on('friend_accepted_event', (data: any) => {
      this.ngZone.run(() => {
        if (data?.userAId === this.userId || data?.userBId === this.userId) {
          this.friendAcceptedHandlers.forEach((h) => h(data?.data));
        }
      });
    });

    // ---- SERVER EVENTS ----
    this.socket.on('server_invite_received', (data: any) => {
      this.ngZone.run(() => {
        this.serverInviteHandlers.forEach((h) => h(data));
      });
    });

    this.socket.on('server_updated', (data: any) => {
      this.ngZone.run(() => {
        this.serverUpdatedHandlers.forEach((h) => h(data));
      });
    });

    this.socket.on('server_invite_event', (data: any) => {
      this.ngZone.run(() => {
        if (data?.targetUserId === this.userId) {
          this.serverInviteHandlers.forEach((h) => h(data?.serverData));
        }
      });
    });

    // User status/profile/avatar update
    this.socket.on('user_status_updated', (data: any) => {
      this.ngZone.run(() => {
        this.userStatusUpdatedHandlers.forEach((h) => h(data));
      });
    });

    // ==========================================
    // ---- WEBRTC VOICE EVENTS ----
    // ==========================================
    this.socket.on('voice_room_users', (data: any) => {
      this.ngZone.run(() => {
        this.voiceRoomUsersHandlers.forEach((h) => h(data));
      });
    });

    this.socket.on('voice_user_joined', (data: any) => {
      this.ngZone.run(() => {
        this.voiceUserJoinedHandlers.forEach((h) => h(data));
      });
    });

    this.socket.on('voice_user_left', (data: any) => {
      this.ngZone.run(() => {
        this.voiceUserLeftHandlers.forEach((h) => h(data));
      });
    });

    this.socket.on('voice_signal', (data: any) => {
      this.ngZone.run(() => {
        this.voiceSignalHandlers.forEach((h) => h(data));
      });
    });

    this.socket.on('voice_user_state_updated', (data: any) => {
      this.ngZone.run(() => {
        this.voiceUserStateHandlers.forEach((h) => h(data));
      });
    });

    this.socket.on('voice_channels_state_update', (data: any) => {
      this.ngZone.run(() => {
        if (data) {
          this.voiceChannelsStateHandlers.forEach((h) => h(data));
        }
      });
    });
  }

  // --- Registration Methods ---

  registerChannelMessageHandler(handler: (channelId: string, message: any) => void) {
    if (!this.channelMessageHandlers.includes(handler)) {
      this.channelMessageHandlers.push(handler);
    }
  }

  registerDirectMessageHandler(handler: (senderId: string, targetId: string, message: any) => void) {
    if (!this.directMessageHandlers.includes(handler)) {
      this.directMessageHandlers.push(handler);
    }
  }

  registerChannelTypingHandler(handler: (data: { channelId: string; userId: string; displayName: string; isTyping: boolean }) => void) {
    if (!this.channelTypingHandlers.includes(handler)) {
      this.channelTypingHandlers.push(handler);
    }
  }

  registerDmTypingHandler(handler: (data: { recipientId: string; userId: string; displayName: string; isTyping: boolean }) => void) {
    if (!this.dmTypingHandlers.includes(handler)) {
      this.dmTypingHandlers.push(handler);
    }
  }

  registerChannelMessageDeletedHandler(handler: (data: { channelId: string; messageId: string }) => void) {
    if (!this.channelMessageDeletedHandlers.includes(handler)) {
      this.channelMessageDeletedHandlers.push(handler);
    }
  }

  registerDirectMessageDeletedHandler(handler: (data: { friendId: string; senderId?: string; recipientId?: string; messageId: string }) => void) {
    if (!this.directMessageDeletedHandlers.includes(handler)) {
      this.directMessageDeletedHandlers.push(handler);
    }
  }

  registerChannelReactionHandler(handler: (data: { channelId: string; messageId: string; reactions: Record<string, string[]> }) => void) {
    if (!this.channelReactionHandlers.includes(handler)) {
      this.channelReactionHandlers.push(handler);
    }
  }

  registerDirectReactionHandler(handler: (data: { senderId?: string; recipientId?: string; messageId: string; reactions: Record<string, string[]> }) => void) {
    if (!this.directReactionHandlers.includes(handler)) {
      this.directReactionHandlers.push(handler);
    }
  }

  registerFriendRequestHandler(handler: (data: any) => void) {
    if (!this.friendRequestHandlers.includes(handler)) {
      this.friendRequestHandlers.push(handler);
    }
  }

  registerFriendAcceptedHandler(handler: (data: any) => void) {
    if (!this.friendAcceptedHandlers.includes(handler)) {
      this.friendAcceptedHandlers.push(handler);
    }
  }

  registerServerInviteHandler(handler: (data: any) => void) {
    if (!this.serverInviteHandlers.includes(handler)) {
      this.serverInviteHandlers.push(handler);
    }
  }

  registerServerUpdatedHandler(handler: (data: any) => void) {
    if (!this.serverUpdatedHandlers.includes(handler)) {
      this.serverUpdatedHandlers.push(handler);
    }
  }

  registerUserStatusUpdatedHandler(handler: (data: any) => void) {
    if (!this.userStatusUpdatedHandlers.includes(handler)) {
      this.userStatusUpdatedHandlers.push(handler);
    }
  }

  // Voice Handlers Registration
  registerVoiceRoomUsersHandler(handler: (data: { channelId: string; users: VoiceParticipantInfo[] }) => void) {
    if (!this.voiceRoomUsersHandlers.includes(handler)) {
      this.voiceRoomUsersHandlers.push(handler);
    }
  }

  registerVoiceUserJoinedHandler(handler: (data: { channelId: string; user: VoiceParticipantInfo }) => void) {
    if (!this.voiceUserJoinedHandlers.includes(handler)) {
      this.voiceUserJoinedHandlers.push(handler);
    }
  }

  registerVoiceUserLeftHandler(handler: (data: { channelId: string; socketId: string; userId: string }) => void) {
    if (!this.voiceUserLeftHandlers.includes(handler)) {
      this.voiceUserLeftHandlers.push(handler);
    }
  }

  registerVoiceSignalHandler(handler: (data: { senderSocketId: string; senderUserId: string; signal: any; type: 'offer' | 'answer' | 'ice-candidate' }) => void) {
    if (!this.voiceSignalHandlers.includes(handler)) {
      this.voiceSignalHandlers.push(handler);
    }
  }

  registerVoiceUserStateUpdatedHandler(handler: (data: { channelId: string; socketId: string; userId: string; isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }) => void) {
    if (!this.voiceUserStateHandlers.includes(handler)) {
      this.voiceUserStateHandlers.push(handler);
    }
  }

  registerVoiceChannelsStateUpdatedHandler(handler: (states: Record<string, VoiceParticipantInfo[]>) => void) {
    if (!this.voiceChannelsStateHandlers.includes(handler)) {
      this.voiceChannelsStateHandlers.push(handler);
    }
  }

  // --- Emit Methods ---

  sendChannelTyping(channelId: string, userId: string, displayName: string, isTyping: boolean) {
    this.socket?.emit('channel_typing', { channelId, userId, displayName, isTyping });
  }

  sendDmTyping(recipientId: string, userId: string, displayName: string, isTyping: boolean) {
    this.socket?.emit('dm_typing', { recipientId, userId, displayName, isTyping });
  }

  joinRoom(roomId: string) {
    this.socket?.emit('join_room', { roomId });
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leave_room', { roomId });
  }

  // Voice Emit Methods
  joinVoice(payload: { channelId: string; userId: string; username?: string; displayName?: string; avatarUrl?: string | null }) {
    this.socket?.emit('voice_join', payload);
  }

  leaveVoice() {
    this.socket?.emit('voice_leave');
  }

  sendVoiceSignal(payload: { targetSocketId: string; signal: any; type: 'offer' | 'answer' | 'ice-candidate' }) {
    this.socket?.emit('voice_signal', payload);
  }

  sendVoiceState(payload: { isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }) {
    this.socket?.emit('voice_state', payload);
  }

  requestVoiceStates() {
    this.socket?.emit('request_voice_states');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}