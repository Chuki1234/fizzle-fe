import { Injectable, NgZone, inject, signal } from '@angular/core';
import { SocketService, VoiceParticipantInfo } from './socket';
import { AuthStore } from '../auth/auth.store';

export interface VoiceParticipant extends VoiceParticipantInfo {
  audioElement?: HTMLAudioElement;
  stream?: MediaStream;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
  private socketService = inject(SocketService);
  private authStore = inject(AuthStore);
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
  readonly micLevel = signal<number>(0); // 0 to 100 for live VU Meter

  // Participants in CURRENT active voice room
  readonly participants = signal<VoiceParticipant[]>([]);

  // Real-time map of ALL voice channels across servers: channelId -> VoiceParticipant[]
  readonly voiceChannelsUsers = signal<Record<string, VoiceParticipant[]>>({});

  // WebRTC & Audio Context
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>(); // socketId -> RTCPeerConnection
  private iceCandidateQueues = new Map<string, RTCIceCandidateInit[]>(); // socketId -> queue
  private audioElements = new Map<string, HTMLAudioElement>(); // socketId -> HTMLAudioElement
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioIntervalId: any = null;

  constructor() {
    this.registerSocketEvents();
  }

  getSelfParticipant(): VoiceParticipant {
    const currentUser = this.authStore.user();
    const userId = currentUser?.id || 'user';
    const displayName = currentUser?.displayName || currentUser?.username || 'Người dùng';
    const avatarUrl = currentUser?.avatarUrl || null;
    return {
      socketId: this.socketService.getSocketId() || 'self',
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

  private registerSocketEvents() {
    // 1. Nhận danh sách người dùng đã có trong phòng voice khi mới join
    this.socketService.registerVoiceRoomUsersHandler((data) => {
      this.ngZone.run(async () => {
        if (data.channelId !== this.currentChannelId()) return;

        const self = this.getSelfParticipant();
        const otherUsers = (data.users || []).filter(
          (u) => u.userId !== self.userId && u.socketId !== this.socketService.getSocketId()
        );

        // Luôn giữ selfParticipant và gộp thêm các remote peers khác
        this.participants.set([self, ...otherUsers.map((u) => ({ ...u }))]);

        // Người mới vào tạo WebRTC Offer tới từng người đang có mặt
        for (const user of otherUsers) {
          if (user.socketId) {
            await this.createOfferToPeer(user.socketId);
          }
        }
      });
    });

    // 2. Người dùng mới tham gia phòng
    this.socketService.registerVoiceUserJoinedHandler((data) => {
      this.ngZone.run(() => {
        if (data.channelId !== this.currentChannelId()) return;

        const currentUserId = this.authStore.user()?.id;
        if (data.user.userId === currentUserId || data.user.socketId === this.socketService.getSocketId()) {
          return;
        }

        this.participants.update((list) => {
          if (list.some((p) => p.socketId === data.user.socketId || p.userId === data.user.userId)) return list;
          return [...list, { ...data.user }];
        });

        this.playAudioCue('join');
      });
    });

    // 3. Người dùng rời phòng
    this.socketService.registerVoiceUserLeftHandler((data) => {
      this.ngZone.run(() => {
        if (data.channelId !== this.currentChannelId()) return;

        this.closePeer(data.socketId);
        this.participants.update((list) => list.filter((p) => p.socketId !== data.socketId && p.userId !== data.userId));
        this.playAudioCue('leave');
      });
    });

    // 4. Nhận WebRTC Signal (offer / answer / ice-candidate)
    this.socketService.registerVoiceSignalHandler(async (data) => {
      this.ngZone.run(async () => {
        const { senderSocketId, signal, type } = data;

        if (type === 'offer') {
          await this.handleOfferFromPeer(senderSocketId, signal);
        } else if (type === 'answer') {
          await this.handleAnswerFromPeer(senderSocketId, signal);
        } else if (type === 'ice-candidate') {
          await this.handleIceCandidateFromPeer(senderSocketId, signal);
        }
      });
    });

    // 5. Cập nhật trạng thái người dùng (mute / deafen / speaking)
    this.socketService.registerVoiceUserStateUpdatedHandler((data) => {
      this.ngZone.run(() => {
        if (data.channelId === this.currentChannelId()) {
          this.participants.update((list) =>
            list.map((p) => {
              if (p.socketId === data.socketId || p.userId === data.userId) {
                return {
                  ...p,
                  isMuted: data.isMuted !== undefined ? data.isMuted : p.isMuted,
                  isDeafened: data.isDeafened !== undefined ? data.isDeafened : p.isDeafened,
                  isSpeaking: data.isSpeaking !== undefined ? data.isSpeaking : p.isSpeaking,
                };
              }
              return p;
            }),
          );
        }
      });
    });

    // 6. Cập nhật trạng thái TẤT CẢ các voice channels theo thời gian thực (cho danh sách kênh bên trái)
    this.socketService.registerVoiceChannelsStateUpdatedHandler((states) => {
      this.ngZone.run(() => {
        this.voiceChannelsUsers.set(states || {});
      });
    });
  }

  // ==========================================
  // --- JOIN / LEAVE VOICE ---
  // ==========================================

  async joinChannel(serverId: string, channelId: string, channelName: string) {
    if (this.currentChannelId() === channelId && this.isConnected()) return;

    // Nếu đang ở kênh khác, rời kênh đó trước
    if (this.isConnected() || this.currentChannelId()) {
      this.leaveChannel();
    }

    this.isConnecting.set(true);
    this.currentServerId.set(serverId);
    this.currentChannelId.set(channelId);
    this.currentChannelName.set(channelName);

    try {
      // 1. Xin quyền và lấy Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.localStream = stream;
      this.setupVoiceActivityDetection(stream);

      const currentUser = this.authStore.user();
      const userId = currentUser?.id || 'user-' + Date.now();
      const displayName = currentUser?.displayName || currentUser?.username || 'Người dùng';
      const avatarUrl = currentUser?.avatarUrl || null;

      // 2. Emit voice_join qua Socket
      this.socketService.joinVoice({
        channelId,
        userId,
        username: currentUser?.username,
        displayName,
        avatarUrl,
      });

      // 3. Thêm bản thân vào danh sách participants
      const selfParticipant: VoiceParticipant = {
        socketId: this.socketService.getSocketId() || 'self',
        userId,
        username: currentUser?.username,
        displayName,
        avatarUrl,
        isMuted: this.isMuted(),
        isDeafened: this.isDeafened(),
        isSpeaking: false,
      };

      this.participants.set([selfParticipant]);
      this.isConnected.set(true);
      this.isConnecting.set(false);
      this.playAudioCue('connected');
    } catch (err) {
      console.warn('[VoiceService] Could not access microphone, entering listen-only mode:', err);
      // Fallback: Kết nối chế độ chỉ nghe
      const currentUser = this.authStore.user();
      const userId = currentUser?.id || 'user-' + Date.now();
      const displayName = currentUser?.displayName || currentUser?.username || 'Người dùng';

      this.socketService.joinVoice({
        channelId,
        userId,
        username: currentUser?.username,
        displayName,
        avatarUrl: currentUser?.avatarUrl || null,
      });

      this.isConnected.set(true);
      this.isConnecting.set(false);
      this.isMuted.set(true);
      this.playAudioCue('connected');
    }
  }

  leaveChannel() {
    if (!this.currentChannelId()) return;

    this.socketService.leaveVoice();

    // Dừng toàn bộ Audio Tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Đóng toàn bộ PeerConnections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.iceCandidateQueues.clear();

    // Hủy các Audio elements khỏi DOM
    this.audioElements.forEach((audio) => {
      try {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
      } catch {}
    });
    this.audioElements.clear();

    // Dừng Voice Activity Detection
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
    this.participants.set([]);
  }

  // ==========================================
  // --- MUTE & DEAFEN ---
  // ==========================================

  toggleMute(): boolean {
    const nextState = !this.isMuted();
    this.isMuted.set(nextState);

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !nextState;
      });
    }

    this.socketService.sendVoiceState({
      isMuted: nextState,
      isDeafened: this.isDeafened(),
    });

    this.updateSelfStateInParticipants({ isMuted: nextState });
    return nextState;
  }

  toggleDeafen(): boolean {
    const nextState = !this.isDeafened();
    this.isDeafened.set(nextState);

    // Mute remote audios when deafened
    this.audioElements.forEach((audio) => {
      audio.muted = nextState;
    });

    // Automatically mute microphone if deafened
    if (nextState && !this.isMuted()) {
      this.toggleMute();
    }

    this.socketService.sendVoiceState({
      isMuted: this.isMuted(),
      isDeafened: nextState,
    });

    this.updateSelfStateInParticipants({ isDeafened: nextState });
    return nextState;
  }

  private updateSelfStateInParticipants(patch: Partial<VoiceParticipant>) {
    const selfSocketId = this.socketService.getSocketId();
    const currentUserId = this.authStore.user()?.id;

    this.participants.update((list) =>
      list.map((p) => {
        if (p.socketId === selfSocketId || p.userId === currentUserId) {
          return { ...p, ...patch };
        }
        return p;
      }),
    );
  }

  // ==========================================
  // --- WEBRTC PEER CONNECTION HELPERS ---
  // ==========================================

  private getOrCreatePeerConnection(peerSocketId: string): RTCPeerConnection {
    if (this.peerConnections.has(peerSocketId)) {
      return this.peerConnections.get(peerSocketId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Thêm Local Audio Tracks vào PeerConnection
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketService.sendVoiceSignal({
          targetSocketId: peerSocketId,
          signal: event.candidate,
          type: 'ice-candidate',
        });
      }
    };

    // Remote Track handler (Phát âm thanh của người bên kia)
    pc.ontrack = (event) => {
      this.ngZone.run(() => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;

        let audioElement = this.audioElements.get(peerSocketId);
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.autoplay = true;
          audioElement.controls = false;
          audioElement.style.display = 'none';
          audioElement.id = `remote-audio-${peerSocketId}`;
          document.body.appendChild(audioElement);
          this.audioElements.set(peerSocketId, audioElement);
        }

        audioElement.srcObject = remoteStream;
        audioElement.muted = this.isDeafened();
        void audioElement.play().catch((e) => console.log('[WebRTC] Auto-play status:', e));
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(peerSocketId);
      }
    };

    this.peerConnections.set(peerSocketId, pc);
    return pc;
  }

  private async createOfferToPeer(peerSocketId: string) {
    try {
      const pc = this.getOrCreatePeerConnection(peerSocketId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      this.socketService.sendVoiceSignal({
        targetSocketId: peerSocketId,
        signal: offer,
        type: 'offer',
      });
    } catch (e) {
      console.warn('[WebRTC] Failed to create offer:', e);
    }
  }

  private async handleOfferFromPeer(peerSocketId: string, offer: RTCSessionDescriptionInit) {
    try {
      const pc = this.getOrCreatePeerConnection(peerSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Drain pending ICE candidates
      await this.drainIceCandidateQueue(peerSocketId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socketService.sendVoiceSignal({
        targetSocketId: peerSocketId,
        signal: answer,
        type: 'answer',
      });
    } catch (e) {
      console.warn('[WebRTC] Failed to handle offer:', e);
    }
  }

  private async handleAnswerFromPeer(peerSocketId: string, answer: RTCSessionDescriptionInit) {
    try {
      const pc = this.peerConnections.get(peerSocketId);
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Drain pending ICE candidates
        await this.drainIceCandidateQueue(peerSocketId, pc);
      }
    } catch (e) {
      console.warn('[WebRTC] Failed to handle answer:', e);
    }
  }

  private async handleIceCandidateFromPeer(peerSocketId: string, candidate: RTCIceCandidateInit) {
    try {
      const pc = this.peerConnections.get(peerSocketId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue candidate until remote description is set
        if (!this.iceCandidateQueues.has(peerSocketId)) {
          this.iceCandidateQueues.set(peerSocketId, []);
        }
        this.iceCandidateQueues.get(peerSocketId)!.push(candidate);
      }
    } catch (e) {
      console.warn('[WebRTC] Failed to add ICE candidate:', e);
    }
  }

  private async drainIceCandidateQueue(peerSocketId: string, pc: RTCPeerConnection) {
    const queue = this.iceCandidateQueues.get(peerSocketId);
    if (queue && queue.length > 0) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Failed to drain candidate:', err);
        }
      }
      this.iceCandidateQueues.delete(peerSocketId);
    }
  }

  private closePeer(peerSocketId: string) {
    const pc = this.peerConnections.get(peerSocketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerSocketId);
    }

    this.iceCandidateQueues.delete(peerSocketId);

    const audio = this.audioElements.get(peerSocketId);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
      } catch {}
      this.audioElements.delete(peerSocketId);
    }
  }

  // ==========================================
  // --- VOICE ACTIVITY DETECTION (SPEAKING) ---
  // ==========================================

  private setupVoiceActivityDetection(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.4;
      source.connect(this.analyserNode);

      const bufferLength = this.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let wasSpeaking = false;

      this.audioIntervalId = setInterval(() => {
        if (!this.analyserNode || this.isMuted()) {
          this.ngZone.run(() => {
            this.micLevel.set(0);
            if (wasSpeaking) {
              wasSpeaking = false;
              this.setSpeakingState(false);
            }
          });
          return;
        }

        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / bufferLength;

        // Tính % mức âm lượng (0% -> 100%)
        const level = Math.min(100, Math.round((averageVolume / 45) * 100));

        // Ngưỡng phát hiện tiếng nói
        const isSpeakingNow = level > 12;

        this.ngZone.run(() => {
          this.micLevel.set(level);
          if (isSpeakingNow !== wasSpeaking) {
            wasSpeaking = isSpeakingNow;
            this.setSpeakingState(isSpeakingNow);
          }
        });
      }, 50);
    } catch (e) {
      console.warn('[VoiceService] Could not initialize voice activity detection:', e);
    }
  }

  private setSpeakingState(speaking: boolean) {
    this.ngZone.run(() => {
      this.isSpeaking.set(speaking);
      this.updateSelfStateInParticipants({ isSpeaking: speaking });
      this.socketService.sendVoiceState({
        isSpeaking: speaking,
        isMuted: this.isMuted(),
        isDeafened: this.isDeafened(),
      });
    });
  }

  // ==========================================
  // --- AUDIO SOUND CUES ---
  // ==========================================

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
