import { Injectable } from '@angular/core';

/** Claves de sesión que este servicio gestiona en localStorage/sessionStorage. */
const SESSION_KEYS = ['access_token', 'refresh_token'];

/**
 * Único punto que toca localStorage/sessionStorage para la sesión (access_token,
 * refresh_token). El almacenamiento activo se deriva de dónde vive hoy el refresh_token
 * en vez de un flag en memoria, porque Angular recrea este servicio en cada F5.
 */
@Injectable({
  providedIn: 'root'
})
export class SessionStorageService {

  private activeStorage(): Storage {
    return sessionStorage.getItem('refresh_token') !== null ? sessionStorage : localStorage;
  }

  private otherStorage(storage: Storage): Storage {
    return storage === localStorage ? sessionStorage : localStorage;
  }

  /** Solo en el login: limpia ambos almacenamientos y guarda la sesión en uno solo. */
  startSession(remember: boolean, tokens: { access: string; refresh: string }): void {
    this.clear();
    const target = remember ? localStorage : sessionStorage;
    target.setItem('access_token', tokens.access);
    target.setItem('refresh_token', tokens.refresh);
  }

  /** Escribe en el almacenamiento activo y borra la clave del otro. Lo usa el refresh. */
  set(key: string, value: string): void {
    const target = this.activeStorage();
    target.setItem(key, value);
    this.otherStorage(target).removeItem(key);
  }

  get(key: string): string | null {
    const target = this.activeStorage();
    return target.getItem(key) ?? this.otherStorage(target).getItem(key);
  }

  clear(): void {
    for (const key of SESSION_KEYS) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  }
}
