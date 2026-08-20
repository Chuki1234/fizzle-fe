import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // 👈 1. Thêm dòng này

@Component({
  selector: 'app-root', // hoặc fz-root tùy dự án
  standalone: true,
  imports: [RouterOutlet], // 👈 2. Thêm RouterOutlet vào đây
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App { }