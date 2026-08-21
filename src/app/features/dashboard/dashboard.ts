import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { FriendService } from '../../core/services/friend';
import { ModalService } from '../../core/services/modal';
import { ServerService } from '../../core/services/server';
import { Server } from '../../core/models/server.model';

/**
 * Trang chủ (home hub) sau khi đăng nhập: chào theo tên, lối tắt tạo/thêm,
 * danh sách máy chủ của bạn và bạn bè đang hoạt động.
 *
 * Dữ liệu lấy từ ServerService/FriendService sẵn có nên khớp với rail server và
 * trang bạn bè — không tạo số liệu ảo. (Bản MVP dùng mock cho tới khi có backend.)
 */
@Component({
  selector: 'fz-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly server = inject(ServerService);
  private readonly friend = inject(FriendService);
  private readonly modal = inject(ModalService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly displayName = this.authStore.displayName;
  protected readonly servers = this.server.servers;

  /** Bạn bè đã kết bạn và đang không offline — phần "sống" nhất của trang. */
  protected readonly onlineFriends = computed(() =>
    this.friend
      .friends()
      .filter((f) => f.relationshipStatus === 'friend' && f.presence !== 'offline'),
  );

  protected createServer(): void {
    this.modal.open('CREATE_SERVER');
  }

  /** Vào một máy chủ: chọn nó trên rail rồi mở kênh đầu tiên. */
  protected openServer(server: Server): void {
    this.server.selectServer(server.id);
    const firstChannel = server.channels[0];
    if (firstChannel) {
      void this.router.navigate(['/channels', server.id, firstChannel.id]);
    }
  }
}
