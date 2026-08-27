import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServerService } from '../../core/services/server';
import { ModalService } from '../../core/services/modal';
import { Server, Channel } from '../../core/models/server.model';

import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'fz-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  public serverService = inject(ServerService);
  public modalService = inject(ModalService);
  public languageService = inject(LanguageService);

  public isImageUrl(icon: string | undefined): boolean {
    if (!icon) return false;
    return icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:image/') || icon.startsWith('/') || icon.includes('/');
  }

  // Danh sách các luồng thoại/livestream từ các server thực tế
  public voiceChannels = computed(() => {
    const list: { server: Server; channel: Channel }[] = [];
    for (const server of this.serverService.servers()) {
      for (const channel of server.channels) {
        if (channel.type === 'voice') {
          list.push({ server, channel });
        }
      }
    }
    return list;
  });

  public selectServer(serverId: string) {
    this.serverService.selectServer(serverId);
  }

  public joinVoice(server: Server, channel: Channel) {
    this.serverService.selectServer(server.id);
    this.serverService.selectChannel(channel);
  }

  public getTextChannelCount(server: Server): number {
    return server.channels.filter(c => c.type === 'text').length;
  }

  public getVoiceChannelCount(server: Server): number {
    return server.channels.filter(c => c.type === 'voice').length;
  }

  public isImageIcon(icon?: string): boolean {
    if (!icon) return false;
    const trimmed = icon.trim();
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image') ||
      trimmed.startsWith('/uploads/') ||
      trimmed.startsWith('blob:') ||
      trimmed.endsWith('.png') ||
      trimmed.endsWith('.jpg') ||
      trimmed.endsWith('.jpeg') ||
      trimmed.endsWith('.webp') ||
      trimmed.endsWith('.svg') ||
      trimmed.endsWith('.gif') ||
      trimmed.length > 8
    );
  }

  public getServerDisplayIcon(server: Server): string {
    if (!server) return 'S';
    const icon = server.icon?.trim();
    if (icon && icon.length <= 3) return icon;
    return (server.name || 'S').charAt(0).toUpperCase();
  }
}