import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Thẻ hồ sơ người dùng ở đáy thanh bên: avatar, tên, trạng thái + nút bánh răng
 * mở trang Cài đặt. Tách riêng để dùng lại ở hai vị trí — trong sidebar (hẹp)
 * và làm thanh đáy trải ngang cả cột server (trên trang dashboard).
 */
@Component({
  selector: 'app-user-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './user-panel.html',
  styleUrl: './user-panel.css',
})
export class UserPanel {}
