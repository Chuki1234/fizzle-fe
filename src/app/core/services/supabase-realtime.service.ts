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

  // Callbacks
  private onDirectMessage?: (senderId: string, recipientId: string, message: any) => void;
  private onChannelMessage?: (channelId: string, message: any) => void;
  private onFriendshipChange?: (payload: any) => void;
  private onServerChange?: (payload: any) => void;
  private onProfileChange?: (payload: any) => void;

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
      .channel('fizzle-global-realtime')
      // 1. Direct Messages
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
              this.onDirectMessage?.(row.sender_id, row.recipient_id, msg);
            }
          });
        },
      )
      // 2. Channel Messages
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_messages' },
        (payload) => {
          this.ngZone.run(() => {
            const row = payload.new as any;
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
            this.onChannelMessage?.(row.channel_id, msg);
          });
        },
      )
      // 3. Friendships
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        (payload) => {
          this.ngZone.run(() => {
            const row = (payload.new || payload.old) as any;
            if (!row) return;
            if (row.user_a_id === this.currentUserId || row.user_b_id === this.currentUserId) {
              this.onFriendshipChange?.(payload);
            }
          });
        },
      )
      // 4. Servers & Channels
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'servers' },
        (payload) => {
          this.ngZone.run(() => {
            this.onServerChange?.(payload);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        (payload) => {
          this.ngZone.run(() => {
            this.onServerChange?.(payload);
          });
        },
      )
      // 5. Profiles (Avatar, Status, Presence)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          this.ngZone.run(() => {
            this.onProfileChange?.(payload.new);
          });
        },
      )
      .subscribe((status) => {
        console.log('[SupabaseRealtime] Subscription status:', status);
      });
  }

  registerDirectMessageHandler(handler: (senderId: string, recipientId: string, message: any) => void) {
    this.onDirectMessage = handler;
  }

  registerChannelMessageHandler(handler: (channelId: string, message: any) => void) {
    this.onChannelMessage = handler;
  }

  registerFriendshipChangeHandler(handler: (payload: any) => void) {
    this.onFriendshipChange = handler;
  }

  registerServerChangeHandler(handler: (payload: any) => void) {
    this.onServerChange = handler;
  }

  registerProfileChangeHandler(handler: (profile: any) => void) {
    this.onProfileChange = handler;
  }

  disconnect() {
    if (this.supabase && this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
