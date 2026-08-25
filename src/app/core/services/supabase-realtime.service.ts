import { Injectable, NgZone, inject } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://doolifuykhesjcwltwll.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvb2xpZnV5a2hlc2pjd2x0d2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjE3NDUsImV4cCI6MjEwMDM5Nzc0NX0.LmG3IkCVRJInbtPSWCmKLq61A965FlyH7TwGS_XIjMA';

@Injectable({
  providedIn: 'root',
})
export class SupabaseRealtimeService {
  private ngZone = inject(NgZone);
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private currentUserId: string = '';

  // Multi-handler callback arrays
  private directMessageHandlers: Array<(senderId: string, recipientId: string, message: any) => void> = [];
  private channelMessageHandlers: Array<(channelId: string, message: any) => void> = [];
  private friendshipChangeHandlers: Array<(payload: any) => void> = [];
  private serverChangeHandlers: Array<(payload: any) => void> = [];
  private profileChangeHandlers: Array<(payload: any) => void> = [];

  init(userId: string) {
    if (!userId) return;
    if (this.supabase && this.currentUserId === userId && this.channel) return;

    this.currentUserId = userId;

    if (!this.supabase) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }

    console.log('[SupabaseRealtime] Initializing Cloud Realtime for user:', userId);

    this.channel = this.supabase
      .channel('fizzle-global-realtime', {
        config: {
          broadcast: { self: false },
        },
      })
      // 1. Direct Messages via Postgres Changes
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          this.ngZone.run(() => {
            const row = payload.new as any;
            if (!row) return;
            if (row.sender_id === this.currentUserId || row.recipient_id === this.currentUserId) {
              const msg = {
                id: row.id,
                senderId: row.sender_id,
                senderName: row.sender_name || 'Người dùng',
                text: row.text,
                timestamp: new Date(row.created_at || Date.now()).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              };
              this.directMessageHandlers.forEach(h => h(row.sender_id, row.recipient_id, msg));
            }
          });
        },
      )
      // 2. Direct Messages via Direct Supabase Broadcast (Cross-machine / Cross-network instant sync)
      .on(
        'broadcast',
        { event: 'dm_message' },
        (payload: any) => {
          this.ngZone.run(() => {
            const data = payload && payload['payload'] ? payload['payload'] : payload;
            if (!data) return;
            if (data.senderId === this.currentUserId || data.recipientId === this.currentUserId) {
              this.directMessageHandlers.forEach(h => h(data.senderId, data.recipientId, data.message));
            }
          });
        },
      )
      // 3. Channel Messages via Postgres Changes
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_messages' },
        (payload) => {
          this.ngZone.run(() => {
            const row = (payload as any)['new'] || payload.new;
            if (!row) return;
            const msg = {
              id: row.id,
              channelId: row.channel_id,
              senderId: row.sender_id,
              senderName: row.sender_name || 'Người dùng',
              text: row.text,
              timestamp: new Date(row.created_at || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
            this.channelMessageHandlers.forEach(h => h(row.channel_id, msg));
          });
        },
      )
      // 4. Channel Messages via Direct Supabase Broadcast
      .on(
        'broadcast',
        { event: 'channel_message' },
        (payload: any) => {
          this.ngZone.run(() => {
            const data = payload && payload['payload'] ? payload['payload'] : payload;
            if (!data?.channelId || !data?.message) return;
            this.channelMessageHandlers.forEach(h => h(data.channelId, data.message));
          });
        },
      )
      // 5. Cloud Voice Signaling via Supabase Broadcast (100% Cross-machine / Cross-network voice sync)
      .on(
        'broadcast',
        { event: 'voice_room_event' },
        (payload: any) => {
          this.ngZone.run(() => {
            const data = payload && payload['payload'] ? payload['payload'] : payload;
            if (!data) return;
            this.voiceRoomEventHandlers.forEach(h => h(data));
          });
        },
      )
      // 6. Friendships
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        (payload) => {
          this.ngZone.run(() => {
            const row = (payload.new || payload.old) as any;
            if (!row) return;
            if (row.user_a_id === this.currentUserId || row.user_b_id === this.currentUserId) {
              this.friendshipChangeHandlers.forEach(h => h(payload));
            }
          });
        },
      )
      // 7. Servers & Channels
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'servers' },
        (payload) => {
          this.ngZone.run(() => {
            this.serverChangeHandlers.forEach(h => h(payload));
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        (payload) => {
          this.ngZone.run(() => {
            this.serverChangeHandlers.forEach(h => h(payload));
          });
        },
      )
      // 8. Profiles (Avatar, Status, Presence)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          this.ngZone.run(() => {
            this.profileChangeHandlers.forEach(h => h(payload.new));
          });
        },
      )
      .subscribe((status) => {
        console.log('[SupabaseRealtime] Subscription status:', status);
      });
  }

  // Multi-handler callback arrays
  private voiceRoomEventHandlers: Array<(data: any) => void> = [];

  // --- Broadcast Send Helpers ---
  broadcastDirectMessage(senderId: string, recipientId: string, message: any) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'dm_message',
      payload: { senderId, recipientId, message },
    });
  }

  broadcastChannelMessage(channelId: string, message: any) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'channel_message',
      payload: { channelId, message },
    });
  }

  broadcastVoiceEvent(data: any) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'voice_room_event',
      payload: data,
    });
  }

  registerVoiceRoomEventHandler(handler: (data: any) => void) {
    if (!this.voiceRoomEventHandlers.includes(handler)) {
      this.voiceRoomEventHandlers.push(handler);
    }
  }

  registerDirectMessageHandler(handler: (senderId: string, recipientId: string, message: any) => void) {
    if (!this.directMessageHandlers.includes(handler)) {
      this.directMessageHandlers.push(handler);
    }
  }

  registerChannelMessageHandler(handler: (channelId: string, message: any) => void) {
    if (!this.channelMessageHandlers.includes(handler)) {
      this.channelMessageHandlers.push(handler);
    }
  }

  registerFriendshipChangeHandler(handler: (payload: any) => void) {
    if (!this.friendshipChangeHandlers.includes(handler)) {
      this.friendshipChangeHandlers.push(handler);
    }
  }

  registerServerChangeHandler(handler: (payload: any) => void) {
    if (!this.serverChangeHandlers.includes(handler)) {
      this.serverChangeHandlers.push(handler);
    }
  }

  registerProfileChangeHandler(handler: (profile: any) => void) {
    if (!this.profileChangeHandlers.includes(handler)) {
      this.profileChangeHandlers.push(handler);
    }
  }

  disconnect() {
    if (this.supabase && this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

