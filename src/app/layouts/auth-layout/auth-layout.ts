import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

/**
 * Shell for the signed-out surfaces: the atmospheric Snyk.io obsidian violet hero backdrop with
 * the Fizzle mark, developer security showcase panel, and an interactive theme switcher.
 */
@Component({
  selector: 'fz-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, NgOptimizedImage],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout implements OnInit {
  protected readonly currentTheme = signal<'light' | 'dark'>('dark');

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('fz-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    this.currentTheme.set(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }

  protected toggleTheme(): void {
    const nextTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.currentTheme.set(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('fz-theme', nextTheme);
  }
}

