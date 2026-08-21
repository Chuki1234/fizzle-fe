import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/**
 * Shell cho các trang chưa đăng nhập: backdrop + logo Fizzle + panel giới thiệu.
 * Fizzle chỉ có MỘT theme tối — không còn nút chuyển sáng/tối (data-theme="dark"
 * đặt cố định ở index.html).
 */
@Component({
  selector: 'fz-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, NgOptimizedImage],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {}
