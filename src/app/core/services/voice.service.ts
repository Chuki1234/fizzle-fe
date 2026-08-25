import { Injectable, NgZone, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  Track,
  RemoteTrackPublication,
  RemoteTrack,
} from 'livekit-client';
import { getDynamicBaseUrl } from '../http/api.config';
import { AuthStore } from '../auth/auth.store';
import { SocketService, VoiceParticipantInfo } from './socket';

export interface VoiceParticipant extends VoiceParticipantInfo {
  audioElement?: HTMLAudioElement;
  stream?: MediaStream;
}

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private socketService = inject(SocketService);
  private ngZone = inject(NgZone);

  // --- SIGNALS ---
  readonly currentChannelId = signal<string | null>(null);
  readonly currentServerId = signal<string | null>(null);
  readonly currentChannelName = signal<string>('');
  readonly isConnected = signal<boolean>(false);
  readonly isConnecting = signal<boolean>(false);
  readonly isMuted = signal<boolean>(false);
  readonly isDeafened = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);
  readonly micLevel = signal<number>(0); // 0 - 100 VU Meter

  // Participants in CURRENT active voice room
  readonly participants = signal<VoiceParticipant[]>([]);

  // Real-time map of ALL voice channels across servers: channelId -> VoiceParticipant[]
  readonly voiceChannelsUsers = signal<Record<string, VoiceParticipant[]>>({});

  // LiveKit Room instance
  private room: Room | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioIntervalId: any = null;

  constructor() {
    this.socketService.registerVoiceChannelsStateUpdatedHandler((states) => {
      this.ngZone.run(() => {
        this.voiceChannelsUsers.set(states || {});
      });
    });
  }

  getSelfParticipant(): VoiceParticipant {
    const currentUser = this.authStore.user();
    const userId = currentUser?.id || 'user';
    const displayName = currentUser?.displayName || currentUser?.username || 'Người dùng';
    const avatarUrl = currentUser?.avatarUrl || null;
    return {
      socketId: this.socketService.getSocketId() || userId,
      userId,
      username: currentUser?.username,
      displayName,
      avatarUrl,
      isMuted: this.isMuted(),
      isDeafened: this.isDeafened(),
      isSpeaking: this.isSpeaking(),
    };
  }

  getUsersInChannel(channelId: string): VoiceParticipant[] {
    const curId = this.currentChannelId();
    if (curId === channelId && this.participants().length > 0) {
      return this.participants();
    }
    const map = this.voiceChannelsUsers();
    return map[channelId] || [];
  }

  // ==========================================
  // --- JOIN / LEAVE VOICE ROOM VIA LIVEKIT ---
  // ==========================================

  async joinChannel(serverId: string, channelId: string, channelName: string) {
    if (this.currentChannelId() === channelId && this.isConnected()) return;

    if (this.isConnected() || this.currentChannelId()) {
      this.leaveChannel();
    }

    this.isConnecting.set(true);
    this.currentServerId.set(serverId);
    this.currentChannelId.set(channelId);
    this.currentChannelName.set(channelName);

    try {
      const currentUser = this.authStore.user();
      const userId = currentUser?.id || 'user-' + Date.now();
      const displayName = currentUser?.displayName || currentUser?.username || 'Người dùng';

      // 1. Lấy LiveKit JWT Token từ backend
      const baseUrl = getDynamicBaseUrl();
      const tokenRes = await this.http
        .post<{ token: string; livekitUrl: string; roomName: string }>(
          `${baseUrl}/livekit/token`,
          {
            channelId,
            userId,
            displayName,
          }
        )
        .toPromise();

      if (!tokenRes?.token || !tokenRes?.livekitUrl) {
        throw new Error('Không nhận được LiveKit token từ máy chủ');
      }

      // 2. Khởi tạo LiveKit Room với adaptive stream và auto-subscribe
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.setupRoomEventListeners(this.room, channelId);

      // 3. Kết nối vào LiveKit Cloud Room
      await this.room.connect(tokenRes.livekitUrl, tokenRes.token);
      console.log('[LiveKit] Connected to room:', tokenRes.roomName);

      // 4. Bật microphone
      await this.room.localParticipant.setMicrophoneEnabled(!this.isMuted());

      // 5. Cập nhật danh sách thành viên ban đầu
      this.updateParticipantsList();

      // 6. Setup VU Meter cho micro cục bộ
      this.setupLocalAudioMeter();

      // 7. Đồng bộ với Socket.IO để hiển thị trên sidebar toàn hệ thống
      const selfParticipant = this.getSelfParticipant();
      this.socketService.joinVoice({
        channelId,
        userId: selfParticipant.userId,
        username: selfParticipant.username,
        displayName: selfParticipant.displayName,
        avatarUrl: selfParticipant.avatarUrl,
      });

      this.isConnected.set(true);
      this.isConnecting.set(false);
      this.playAudioCue('connected');
    } catch (err) {
      console.error('[LiveKit] Error joining voice room:', err);
      this.isConnecting.set(false);
      this.isConnected.set(false);
      this.leaveChannel();
    }
  }

  leaveChannel() {
    const chId = this.currentChannelId();
    if (!chId && !this.room) return;

    this.socketService.leaveVoice();

    // Ngắt kết nối LiveKit room
    if (this.room) {
      void this.room.disconnect();
      this.room = null;
    }

    // Dừng Voice Activity / VU Meter
    if (this.audioIntervalId) {
      clearInterval(this.audioIntervalId);
      this.audioIntervalId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        void this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.playAudioCue('disconnect');

    this.currentChannelId.set(null);
    this.currentServerId.set(null);
    this.currentChannelName.set('');
    this.isConnected.set(false);
    this.isConnecting.set(false);
    this.isSpeaking.set(false);
    this.micLevel.set(0);
    this.participants.set([]);
  }

  // ==========================================
  // --- LIVEKIT EVENT LISTENERS ---
  // ==========================================

  private setupRoomEventListeners(room: Room, channelId: string) {
    // 1. Khi có người mới tham gia phòng
    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      this.ngZone.run(() => {
        console.log('[LiveKit] Participant joined:', participant.identity, participant.name);
        this.updateParticipantsList();
        this.playAudioCue('join');
      });
    });

    // 2. Khi có người rời phòng
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.ngZone.run(() => {
        console.log('[LiveKit] Participant left:', participant.identity);
        this.updateParticipantsList();
        this.playAudioCue('leave');
      });
    });

    // 3. Khi nhận track âm thanh từ người khác -> LiveKit tự động attach phát loa
    room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          console.log('[LiveKit] Subscribed to remote audio track from:', participant.identity);
          const el = track.attach();
          el.id = `livekit-audio-${participant.identity}`;
          document.body.appendChild(el);
          if (this.isDeafened()) {
            el.muted = true;
          }
        }
      }
    );

    // 4. Khi track bị unsubscribed -> detach
    room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach().forEach((el) => el.remove());
        }
      }
    );

    // 5. Khi có người nói chuyện (LiveKit SFU ActiveSpeakers)
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      this.ngZone.run(() => {
        const speakingIds = new Set(speakers.map((s) => s.identity));

        // Kiểm tra xem bản thân có đang nói không
        const selfId = this.authStore.user()?.id;
        const isSelfSpeaking = selfId ? speakingIds.has(selfId) : false;
        this.isSpeaking.set(isSelfSpeaking);

        // Cập nhật speaking state cho tất cả participants
        this.participants.update((list) =>
          list.map((p) => ({
            ...p,
            isSpeaking: speakingIds.has(p.userId),
          }))
        );

        // Phát state lên Socket.IO
        this.socketService.sendVoiceState({
          isSpeaking: isSelfSpeaking,
          isMuted: this.isMuted(),
          isDeafened: this.isDeafened(),
        });
      });
    });

    // 6. Khi remote participant mute/unmute mic
    room.on(RoomEvent.TrackMuted, () => {
      this.ngZone.run(() => this.updateParticipantsList());
    });
    room.on(RoomEvent.TrackUnmuted, () => {
      this.ngZone.run(() => this.updateParticipantsList());
    });

    // 7. Khi bị ngắt kết nối
    room.on(RoomEvent.Disconnected, () => {
      this.ngZone.run(() => {
        console.log('[LiveKit] Disconnected from room');
        this.leaveChannel();
      });
    });
  }

  private updateParticipantsList() {
    if (!this.room) return;

    const self = this.getSelfParticipant();
    const remoteList: VoiceParticipant[] = [];

    this.room.remoteParticipants.forEach((p) => {
      remoteList.push({
        socketId: p.sid,
        userId: p.identity,
        displayName: p.name || p.identity,
        username: p.name || p.identity,
        isMuted: !p.isMicrophoneEnabled,
        isDeafened: false,
        isSpeaking: p.isSpeaking,
      });
    });

    this.participants.set([self, ...remoteList]);

    // Cập nhật vào global map cho sidebar
    const curChannelId = this.currentChannelId();
    if (curChannelId) {
      this.voiceChannelsUsers.update((map) => ({
        ...map,
        [curChannelId]: [self, ...remoteList],
      }));
    }
  }

  // ==========================================
  // --- MUTE & DEAFEN ---
  // ==========================================

  async toggleMute(): Promise<boolean> {
    const nextState = !this.isMuted();
    this.isMuted.set(nextState);

    if (this.room?.localParticipant) {
      await this.room.localParticipant.setMicrophoneEnabled(!nextState);
    }

    this.socketService.sendVoiceState({
      isMuted: nextState,
      isDeafened: this.isDeafened(),
    });

    this.updateParticipantsList();
    return nextState;
  }

  toggleDeafen(): boolean {
    const nextState = !this.isDeafened();
    this.isDeafened.set(nextState);

    // Mute toàn bộ audio elements của LiveKit
    document.querySelectorAll<HTMLAudioElement>('[id^="livekit-audio-"]').forEach((el) => {
      el.muted = nextState;
    });

    if (nextState && !this.isMuted()) {
      void this.toggleMute();
    }

    this.socketService.sendVoiceState({
      isMuted: this.isMuted(),
      isDeafened: nextState,
    });

    this.updateParticipantsList();
    return nextState;
  }

  // ==========================================
  // --- LOCAL VU METER ---
  // ==========================================

  private setupLocalAudioMeter() {
    try {
      const track = this.room?.localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
      if (!track?.mediaStreamTrack) return;

      const mediaStream = new MediaStream([track.mediaStreamTrack]);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.4;
      source.connect(this.analyserNode);

      const bufferLength = this.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.audioIntervalId = setInterval(() => {
        if (!this.analyserNode || this.isMuted()) {
          this.ngZone.run(() => this.micLevel.set(0));
          return;
        }

        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / bufferLength;
        const level = Math.min(100, Math.round((averageVolume / 45) * 100));

        this.ngZone.run(() => {
          this.micLevel.set(level);
        });
      }, 50);
    } catch (e) {
      console.warn('[LiveKit] VU meter setup error:', e);
    }
  }

  private playAudioCue(type: 'join' | 'leave' | 'connected' | 'disconnect') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'connected' || type === 'join') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {}
  }
}
