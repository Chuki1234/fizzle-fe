import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api-error.model';

/**
 * Điểm trở về sau khi đăng nhập GitHub/Google.
 *
 * Supabase redirect về đây kèm token ở FRAGMENT (#access_token=…&refresh_token=…)
 * theo implicit flow. Ta bóc refresh_token, gửi lên NestJS để đổi thành phiên
 * Fizzle (tạo profile nếu lần đầu + phát refresh-cookie), rồi vào /friends.
 */
@Component({
  selector: 'app-oauth-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './oauth-callback.html',
  styleUrl: './oauth-callback.css',
})
export class OauthCallback implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const params = new URLSearchParams(
      window.location.hash.replace(/^#/, ''),
    );

    // Xoá fragment khỏi URL ngay để token không nằm lại trong lịch sử trình duyệt.
    history.replaceState(null, '', window.location.pathname);

    // Provider trả lỗi (người dùng từ chối, sai cấu hình…)
    const providerError = params.get('error_description') || params.get('error');
    if (providerError) {
      this.error.set(this.friendly(providerError));
      return;
    }

    const refreshToken = params.get('refresh_token');
    if (!refreshToken) {
      this.error.set('Không nhận được thông tin đăng nhập từ nhà cung cấp.');
      return;
    }

    this.auth.adoptOAuth(refreshToken).subscribe({
      next: () => void this.router.navigateByUrl('/friends'),
      error: (err: ApiError) =>
        this.error.set(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.'),
    });
  }

  private friendly(raw: string): string {
    if (/access_denied|denied|cancel/i.test(raw)) {
      return 'Bạn đã huỷ đăng nhập. Vui lòng thử lại nếu muốn tiếp tục.';
    }
    return 'Đăng nhập mạng xã hội thất bại. Vui lòng thử lại.';
  }
}
