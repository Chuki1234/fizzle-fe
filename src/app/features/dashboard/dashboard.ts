import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServerService } from '../../core/services/server';
import { ModalService } from '../../core/services/modal';
import { Server, Channel } from '../../core/models/server.model';

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
}