import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServerService } from '../../../core/services/server';

@Component({
    selector: 'app-voice-control',
    standalone: true,
    imports: [CommonModule],
    template: `
    @if (serverService.activeVoiceChannel(); as voice) {
      <div class="bg-[#111214] border-t border-[#1e1f24] p-3 flex flex-col gap-2 shrink-0">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Đã kết nối Voice</span>
          </div>
          <button (click)="serverService.leaveVoiceChannel()" 
                  class="text-zinc-400 hover:text-red-400 transition cursor-pointer" title="Ngắt kết nối">
            ✕
          </button>
        </div>

        <div class="text-xs font-bold text-white truncate">
          {{ voice.channelName }}
        </div>

        <div class="flex items-center justify-around bg-[#1e1f24] rounded-lg p-1.5">
          <button (click)="serverService.toggleMute()" 
                  [class.text-red-400]="serverService.isMuted()"
                  class="p-1 hover:bg-[#2b2d31] rounded transition text-zinc-300 cursor-pointer">
            {{ serverService.isMuted() ? '🔇' : '🎙️' }}
          </button>
          <button (click)="serverService.toggleDeafen()" 
                  [class.text-red-400]="serverService.isDeafened()"
                  class="p-1 hover:bg-[#2b2d31] rounded transition text-zinc-300 cursor-pointer">
            {{ serverService.isDeafened() ? '🎧' : '🔊' }}
          </button>
        </div>
      </div>
    }
  `
})
export class VoiceControlComponent { // <-- Đã đổi tên ở đây
    public serverService = inject(ServerService);
}