import { Injectable } from '@angular/core';

const STORAGE_KEY = 'ELEXIFY-THEME';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // index.html applies the .dark class synchronously before Angular loads
  // (avoids a flash of the wrong theme) — read that state rather than
  // recomputing it here.
  private darkMode = document.documentElement.classList.contains('dark');

  isDark(): boolean {
    return this.darkMode;
  }

  toggle(): void {
    this.darkMode = !this.darkMode;
    document.documentElement.classList.toggle('dark', this.darkMode);
    localStorage.setItem(STORAGE_KEY, this.darkMode ? 'dark' : 'light');
  }
}
