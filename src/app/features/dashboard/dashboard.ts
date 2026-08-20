import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'fz-dashboard',
  standalone: true, // <-- 1. Thêm cái này để dùng loadComponent trong app.routes.ts
  imports: [RouterLink], // <-- 2. Import RouterLink để routerLink trong dashboard.html hoạt động
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard { }