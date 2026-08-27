import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServerService } from '../../../core/services/server';
import { VoiceService, VoiceParticipant } from '../../../core/services/voice.service';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-voice-control',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (voiceService.isConnected() || voiceService.isConnecting()) {
      <div class="voice-panel bg-[#111214] border-t border-[#1f2023] flex flex-col shrink-0 select-none shadow-2xl transition-all duration-200">
        
        <!-- Status Header -->
        <div class="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="relative flex items-center justify-center">
              <span class="w-2.5 h-2.5 rounded-full bg-[#23a55a] animate-pulse"></span>
              <span class="absolute w-4 h-4 rounded-full bg-[#23a55a]/30 animate-ping"></span>
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-[#23a55a] leading-none tracking-wide uppercase">
                  {{ voiceService.isConnecting() ? 'Đang kết nối...' : 'Đã kết nối Voice' }}
                </span>
                <span class="text-[9px] px-1 py-0.2 bg-[#23a55a]/15 text-[#23a55a] rounded font-mono font-bold">RTC</span>
              </div>
              <span class="text-[11px] text-zinc-400 font-medium truncate max-w-[140px] leading-tight">
                {{ voiceService.currentChannelName() || 'Kênh thoại' }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <!-- Expand Voice Stage Button -->
            <button (click)="voiceService.expandVoiceOverlay()"
                    class="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/60 rounded-md transition-all duration-150 cursor-pointer flex items-center justify-center"
                    title="Mở giao diện phòng Voice Stage">
              <span class="text-xs">⛶</span>
            </button>

            <!-- Disconnect Button -->
            <button (click)="voiceService.leaveChannel()" 
                    class="p-1.5 text-zinc-400 hover:text-white hover:bg-[#da373c] rounded-md transition-all duration-150 cursor-pointer flex items-center justify-center group" 
                    title="Ngắt kết nối Voice">
              <svg class="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 🎙️ LIVE MIC LEVEL VU METER (TRỰC QUAN MICRO KHI NÓI) -->
        <div class="px-3 py-1 flex flex-col gap-1 bg-[#16171b]/80 border-y border-[#1e1f24]">
          <div class="flex items-center justify-between text-[10px]">
            <span class="font-semibold text-zinc-400 flex items-center gap-1">
              @if (voiceService.isMuted()) {
                <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span class="text-red-400">Micro: Tắt</span>
              } @else if (voiceService.isSpeaking()) {
                <span class="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-ping"></span>
                <span class="text-[#23a55a] font-bold">Đang nói 🎙️</span>
              } @else {
                <span class="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                <span>Micro: Sẵn sàng</span>
              }
            </span>
            <span class="font-mono text-[9px] text-zinc-500 font-bold">
              {{ voiceService.isMuted() ? 'MUTED' : voiceService.micLevel() + '%' }}
            </span>
          </div>

          <!-- Progress Bar VU Meter -->
          <div class="w-full h-1.5 bg-[#202227] rounded-full overflow-hidden relative">
            <div class="h-full rounded-full transition-all duration-75"
                 [style.width.%]="voiceService.isMuted() ? 0 : voiceService.micLevel()"
                 [class.bg-[#23a55a]]="!voiceService.isMuted() && voiceService.micLevel() < 70"
                 [class.bg-amber-400]="!voiceService.isMuted() && voiceService.micLevel() >= 70 && voiceService.micLevel() < 90"
                 [class.bg-red-400]="!voiceService.isMuted() && voiceService.micLevel() >= 90"
                 [class.shadow-[0_0_8px_#23a55a]]="voiceService.isSpeaking() && !voiceService.isMuted()">
            </div>
          </div>
        </div>

        <!-- Participants In Voice Room -->
        <div class="px-2.5 py-1.5 flex flex-col gap-1 max-h-36 overflow-y-auto custom-scrollbar">
          @for (user of voiceService.participants(); track user.socketId) {
            <div class="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#1e1f22]/60 hover:bg-[#2b2d31]/80 transition group"
                 [class.ring-1]="user.isSpeaking && !user.isMuted"
                 [class.ring-[#23a55a]/60]="user.isSpeaking && !user.isMuted"
                 [class.bg-[#23a55a]/10]="user.isSpeaking && !user.isMuted">
              <div class="flex items-center gap-2 min-w-0">
                <!-- Avatar with Speaking Glow -->
                <div class="relative w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-150"
                     [ngClass]="{
                       'ring-2 ring-[#23a55a] shadow-[0_0_10px_#23a55a]': user.isSpeaking && !user.isMuted,
                       'bg-indigo-600': !user.avatarUrl
                     }">
                  @if (user.avatarUrl) {
                    <img [src]="user.avatarUrl" class="w-full h-full rounded-full object-cover" alt="avatar" />
                  } @else {
                    <span>{{ getUserInitial(user) }}</span>
                  }
                  @if (user.isSpeaking && !user.isMuted) {
                    <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#23a55a] ring-1 ring-[#111214]"></span>
                  }
                </div>

                <!-- Display Name -->
                <span class="text-xs text-zinc-300 font-medium truncate group-hover:text-white"
                      [class.text-white]="user.isSpeaking && !user.isMuted"
                      [class.font-bold]="user.isSpeaking && !user.isMuted">
                  {{ user.displayName || user.username || 'Người dùng' }}
                  @if (isSelf(user)) {
                    <span class="text-[10px] text-zinc-500 font-normal ml-0.5">(Bạn)</span>
                  }
                </span>
              </div>

              <!-- Indicators: Speaking / Muted / Deafened / ScreenSharing -->
              <div class="flex items-center gap-1 shrink-0">
                @if (user.isScreenSharing) {
                  <span class="text-[10px] bg-indigo-500/20 text-indigo-400 px-1 py-0.5 rounded font-bold" title="Đang chia sẻ màn hình">🖥️ Live</span>
                }
                @if (user.isSpeaking && !user.isMuted) {
                  <span class="text-[10px] text-[#23a55a] font-bold animate-pulse">● Đang nói</span>
                }
                @if (user.isMuted) {
                  <span class="text-[11px] text-[#f23f43]" title="Tắt mic">🔇</span>
                }
                @if (user.isDeafened) {
                  <span class="text-[11px] text-[#f23f43]" title="Tắt âm thanh">🎧</span>
                }
              </div>
            </div>
          }
        </div>

        <!-- Control Action Bar (Mute / Deafen / Camera / Screen Share) -->
        <div class="p-2 pt-1 grid grid-cols-4 gap-1">
          <!-- Mute Button -->
          <button (click)="voiceService.toggleMute()" 
                  [class.bg-[#f23f43]/20]="voiceService.isMuted()"
                  [class.text-[#f23f43]]="voiceService.isMuted()"
                  [class.text-zinc-300]="!voiceService.isMuted()"
                  class="flex flex-col items-center justify-center py-1.5 px-1 rounded-md bg-[#1e1f22] hover:bg-[#2b2d31] hover:text-white text-[11px] font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                  [title]="voiceService.isMuted() ? 'Bật Mic' : 'Tắt Mic'">
            <span class="text-xs">{{ voiceService.isMuted() ? '🔇' : '🎙️' }}</span>
            <span>{{ voiceService.isMuted() ? 'Tắt Mic' : 'Mic' }}</span>
          </button>

          <!-- Deafen Button -->
          <button (click)="voiceService.toggleDeafen()" 
                  [class.bg-[#f23f43]/20]="voiceService.isDeafened()"
                  [class.text-[#f23f43]]="voiceService.isDeafened()"
                  [class.text-zinc-300]="!voiceService.isDeafened()"
                  class="flex flex-col items-center justify-center py-1.5 px-1 rounded-md bg-[#1e1f22] hover:bg-[#2b2d31] hover:text-white text-[11px] font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                  [title]="voiceService.isDeafened() ? 'Bật âm thanh' : 'Tắt âm thanh (Deafen)'">
            <span class="text-xs">{{ voiceService.isDeafened() ? '🔕' : '🎧' }}</span>
            <span>{{ voiceService.isDeafened() ? 'Tắt Loa' : 'Loa' }}</span>
          </button>

          <!-- Camera Button -->
          <button (click)="voiceService.toggleCamera()" 
                  [class.bg-emerald-600]="voiceService.isCameraOn()"
                  [class.text-white]="voiceService.isCameraOn()"
                  [class.text-zinc-300]="!voiceService.isCameraOn()"
                  class="flex flex-col items-center justify-center py-1.5 px-1 rounded-md bg-[#1e1f22] hover:bg-[#2b2d31] hover:text-white text-[11px] font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                  [title]="voiceService.isCameraOn() ? 'Tắt Cam' : 'Bật Webcam'">
            <span class="text-xs">📹</span>
            <span>{{ voiceService.isCameraOn() ? 'Cam Bật' : 'Cam' }}</span>
          </button>

          <!-- Screen Share Button -->
          <button (click)="voiceService.toggleScreenShare()" 
                  [class.bg-indigo-600]="voiceService.isScreenSharing()"
                  [class.text-white]="voiceService.isScreenSharing()"
                  [class.text-zinc-300]="!voiceService.isScreenSharing()"
                  class="flex flex-col items-center justify-center py-1.5 px-1 rounded-md bg-[#1e1f22] hover:bg-[#2b2d31] hover:text-white text-[11px] font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                  [title]="voiceService.isScreenSharing() ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình LiveKit'">
            <span class="text-xs">🖥️</span>
            <span>{{ voiceService.isScreenSharing() ? 'Dừng' : 'Màn hình' }}</span>
          </button>
        </div>

      </div>
    }
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #2b2d31;
      border-radius: 4px;
    }
  `]
})
export class VoiceControlComponent {
  public serverService = inject(ServerService);
  public voiceService = inject(VoiceService);
  private authStore = inject(AuthStore);

  isSelf(user: VoiceParticipant): boolean {
    const currentUserId = this.authStore.user()?.id;
    return user.userId === currentUserId || user.socketId === 'self';
  }

  getUserInitial(user: VoiceParticipant): string {
    const name = user.displayName || user.username || 'U';
    return name.charAt(0).toUpperCase();
  }
}