import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { ModalService } from '../../core/services/modal';
import { ServerService } from '../../core/services/server';
import { Server } from '../../core/models/server.model';

/**
 * Panel home (cột nội dung chính) khi chưa mở hội thoại nào.
 *
 * Vai trò giống khung phải của một app nhắn tin: chào người dùng trở lại và mở
 * lối nhanh nhất để bắt đầu — nhắn tin, tạo máy chủ, thêm bạn, vào máy chủ.
 * Danh sách hội thoại/DM và rail server đã do main-layout đảm nhận, nên panel
 * này cố ý giữ tối giản.
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
  private readonly modal = inject(ModalService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly displayName = this.authStore.displayName;

  /** Máy chủ đầu tiên của người dùng (nếu có) — dùng cho lối tắt "Vào máy chủ". */
  protected readonly firstServer = computed<Server | null>(
    () => this.server.servers()[0] ?? null,
  );

  protected createServer(): void {
    this.modal.open('CREATE_SERVER');
  }

  /** Mở máy chủ đầu tiên nếu có; nếu chưa có máy chủ nào thì mời tạo mới. */
  protected enterFirstServer(): void {
    const server = this.firstServer();
    if (!server) {
      this.createServer();
      return;
    }
    this.server.selectServer(server.id);
    const firstChannel = server.channels[0];
    if (firstChannel) {
      void this.router.navigate(['/channels', server.id, firstChannel.id]);
    }
  }
}
