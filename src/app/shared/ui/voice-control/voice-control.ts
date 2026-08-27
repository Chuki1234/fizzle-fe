import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServerService } from '../../../core/services/server';
import { VoiceService, VoiceParticipant } from '../../../core/services/voice.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { LanguageService } from '../../../core/services/language.service';

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
                  {{ voiceService.isConnecting() ? languageService.t('voice.connecting') : languageService.t('voice.connected') }}
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
                    [title]="languageService.t('voice.reopen')">
              <span class="text-xs">⛶</span>
            </button>

            <!-- Disconnect Button -->
            <button (click)="voiceService.leaveChannel()" 
                    class="p-1.5 text-zinc-400 hover:text-white hover:bg-[#da373c] rounded-md transition-all duration-150 cursor-pointer flex items-center justify-center group" 
                    [title]="languageService.t('voice.leave')">
              <svg class="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 🎙️ LIVE MIC LEVEL VU METER (TRỰC QUAN MICRO KHI NÓI) -->
        <div class="px-3 py-1 flex items-center gap-2 border-b border-[#1f2023]/60 bg-[#0e0f11]/60">
          <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-[#23a55a]"></span> MIC
          </span>
          <div class="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex items-center p-0.5">
            <div class="h-full bg-gradient-to-r from-[#23a55a] via-emerald-400 to-green-300 rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(35,165,90,0.6)]"
                 [style.width.%]="voiceService.micLevel()"></div>
          </div>
          <span class="text-[9px] font-mono text-zinc-400 font-semibold w-7 text-right">
            {{ voiceService.micLevel() }}%
          </span>
        </div>

        <!-- Participant List Grid (Mini Avatars & Speaking Indicators) -->
        <div class="px-3 py-2 max-h-28 overflow-y-auto custom-scrollbar flex flex-col gap-1">
          @for (user of voiceService.participants(); track user.socketId) {
            <div class="flex items-center justify-between px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors group"
                 [class.bg-zinc-800/30]="user.isSpeaking">
              
              <div class="flex items-center gap-2 min-w-0">
                <!-- Avatar & Speaking Ring -->
                <div class="relative flex items-center justify-center shrink-0">
                  <div class="w-6 h-6 rounded-full bg-zinc-700 text-white text-xs font-bold flex items-center justify-center overflow-hidden border border-zinc-600 shadow-sm"
                       [class.ring-2]="user.isSpeaking && !user.isMuted"
                       [class.ring-[#23a55a]]="user.isSpeaking && !user.isMuted"
                       [class.shadow-[0_0_10px_rgba(35,165,90,0.5)]]="user.isSpeaking && !user.isMuted">
                    @if (user.avatarUrl) {
                      <img [src]="user.avatarUrl" class="w-full h-full object-cover" alt="avatar" />
                    } @else {
                      <span>{{ getUserInitial(user) }}</span>
                    }
                  </div>
                  @if (user.isSpeaking && !user.isMuted) {
                    <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#23a55a] ring-1 ring-[#111214]"></span>
                  }
                </div>

                <!-- Display Name & Username -->
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-xs font-semibold text-zinc-200 truncate leading-tight group-hover:text-white"
                        [class.text-[#23a55a]]="user.isSpeaking && !user.isMuted">
                    {{ user.displayName || user.username }}
                  </span>
                  @if (isSelf(user)) {
                    <span class="text-[9px] px-1 py-0.2 bg-zinc-700/60 text-zinc-300 rounded font-medium">Bạn</span>
                  }
                </div>
              </div>

              <!-- Indicators (Mute/Deafen) -->
              <div class="flex items-center gap-1 shrink-0">
                @if (user.isMuted) {
                  <span class="text-xs text-[#da373c]" title="Đã tắt mic">🔇</span>
                } @else if (user.isSpeaking) {
                  <span class="text-xs text-[#23a55a] animate-pulse" title="Đang phát biểu">🎙️</span>
                }
                @if (user.isDeafened) {
                  <span class="text-xs text-[#da373c]" title="Đã tắt loa">🔕</span>
                }
              </div>
            </div>
          }
        </div>

        <!-- Control Action Bar -->
        <div class="p-2 border-t border-[#1f2023] grid grid-cols-4 gap-1.5 bg-[#0e0f11]">
          <!-- Mute Button -->
          <button (click)="voiceService.toggleMute()" 
                  [class.bg-[#da373c]]="voiceService.isMuted()"
                  [class.text-white]="voiceService.isMuted()"
                  [class.text-zinc-300]="!voiceService.isMuted()"
                  class="flex flex-col items-center justify-center py-1.5 px-1 rounded-md bg-[#1e1f22] hover:bg-[#2b2d31] hover:text-white text-[11px] font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                  [title]="voiceService.isMuted() ? languageService.t('voice.unmute') : languageService.t('voice.mute')">
            <span class="text-xs">{{ voiceService.isMuted() ? '🔇' : '🎙️' }}</span>
            <span>{{ voiceService.isMuted() ? languageService.t('voice.mute') : 'Mic' }}</span>
          </button>

          <!-- Deafen Button -->
          <button (click)="voiceService.toggleDeafen()" 
                  [class.bg-[#da373c]]="voiceService.isDeafened()"
                  [class.text-white]="voiceService.isDeafened()"
                  [class.text-zinc-300]="!voiceService.isDeafened()"
                  class="flex flex-col items-center justify-center py-1.5 px-1 rounded-md bg-[#1e1f22] hover:bg-[#2b2d31] hover:text-white text-[11px] font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                  [title]="voiceService.isDeafened() ? 'Bật Loa' : 'Tắt Loa'">
            <span class="text-xs">{{ voiceService.isDeafened() ? '🔕' : '🎧' }}</span>
            <span>{{ voiceService.isDeafened() ? 'Tắt Loa' : 'Loa' }}</span>
          </button>

          <!-- Camera Button -->
          <button (click)="voiceService.toggleCamera()" 
                  [class.bg-emerald-600]="voiceService.isCameraOn()"
                  [class.text-white]="voiceService.isCameraOn()"
                  [class.text-zinc-300]="!voiceService.isCameraOn()"
                  class="flex flex-col items-center justify-center py-1.5 px-1 rounded-md bg-[#1e1f22] hover:bg-[#2b2d31] hover:text-white text-[11px] font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                  [title]="voiceService.isCameraOn() ? languageService.t('voice.camOff') : languageService.t('voice.camOn')">
            <span class="text-xs">📹</span>
            <span>{{ voiceService.isCameraOn() ? 'Cam Bật' : 'Cam' }}</span>
          </button>

          <!-- Screen Share Button -->
          <button (click)="voiceService.toggleScreenShare()" 
                  [class.bg-indigo-600]="voiceService.isScreenSharing()"
                  [class.text-white]="voiceService.isScreenSharing()"
                  [class.text-zinc-300]="!voiceService.isScreenSharing()"
                  class="flex flex-col items-center justify-center py-1.5 px-1 rounded-md bg-[#1e1f22] hover:bg-[#2b2d31] hover:text-white text-[11px] font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                  [title]="voiceService.isScreenSharing() ? languageService.t('voice.stopScreenShare') : languageService.t('voice.screenShare')">
            <span class="text-xs">🖥️</span>
            <span>{{ voiceService.isScreenSharing() ? 'Đang Phát' : 'Share' }}</span>
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
  public languageService = inject(LanguageService);
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