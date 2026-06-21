import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CryptoService } from './crypto.service';

interface LoginResponse {
  token: string;
  expiresAt: number;
  username: string;
}

const TOKEN_KEY = 'jokoivi-auth-token';
const USERNAME_KEY = 'jokoivi-auth-username';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly crypto = inject(CryptoService);
  private readonly tokenState = signal<string | null>(this.readStoredToken());

  readonly token = this.tokenState.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenState() !== null);

  constructor() {
    const storedUsername = localStorage.getItem(USERNAME_KEY);
    if (storedUsername) {
      this.crypto.setKey(storedUsername);
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, { username, password })
      .pipe(tap((response) => {
        this.setToken(response.token);
        this.crypto.setKey(response.username);
        localStorage.setItem(USERNAME_KEY, response.username);
      }));
  }

  logout(): void {
    this.tokenState.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    this.crypto.setKey('');
  }

  setToken(token: string): void {
    this.tokenState.set(token);
    localStorage.setItem(TOKEN_KEY, token);
  }

  private readStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
