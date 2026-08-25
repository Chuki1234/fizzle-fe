import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'fz-theme';
const DEFAULT_THEME: Theme = 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  /** Reactive signal — the current applied theme */
  readonly current = signal<Theme>(DEFAULT_THEME);

  constructor() {
    this._applyStoredTheme();
  }

  toggle(): void {
    const next: Theme = this.current() === 'dark' ? 'light' : 'dark';
    this._apply(next);
  }

  private _applyStoredTheme(): void {
    const stored = this.doc.defaultView?.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme = stored === 'light' ? 'light' : DEFAULT_THEME;
    this._apply(initial);
  }

  private _apply(theme: Theme): void {
    this.doc.documentElement.setAttribute('data-theme', theme);
    this.doc.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
    this.current.set(theme);
  }
}
