import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FormField,
  form,
  required,
  submit,
} from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../../shared/utils/http-error-message';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  selector: 'jo-login-page',
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss', 
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loginModel = signal({
    username: '',
    password: '',
  });
  protected readonly loginForm = form(this.loginModel, (path) => {
    required(path.username, { message: 'Username is required' });
    required(path.password, { message: 'Password is required' });
  });
  protected readonly loginError = signal('');
  protected readonly loginSubmitting = signal(false);
  protected readonly usernameError = computed(
    () => this.loginForm.username().errors().at(0)?.message ?? '',
  );
  protected readonly passwordError = computed(
    () => this.loginForm.password().errors().at(0)?.message ?? '',
  );

  protected login(event: SubmitEvent): void {
    event.preventDefault();
    this.loginError.set('');

    submit(this.loginForm, async () => {
      this.loginSubmitting.set(true);

      try {
        const credentials = this.loginModel();
        await firstValueFrom(
          this.authService.login(credentials.username.trim(), credentials.password),
        );
        this.loginModel.update((current) => ({ ...current, password: '' }));
        await this.router.navigateByUrl(this.getRedirectUrl(), { replaceUrl: true });
      } catch (error) {
        const message = getHttpErrorMessage(error);
        this.loginError.set(
          message.toLowerCase().includes('unauthorized') ? 'Invalid credentials' : message,
        );
      } finally {
        this.loginSubmitting.set(false);
      }
    });
  }

  private getRedirectUrl(): string {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    return redirect?.startsWith('/') ? redirect : '/notes';
  }
}
