import { Route, UrlMatcher, UrlSegment } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

const notesPathMatcher: UrlMatcher = (segments: UrlSegment[]) => {
  if (segments[0]?.path !== 'notes') {
    return null;
  }

  return {
    consumed: segments,
  };
};

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'notes',
  },
  {
    path: 'login',
    title: 'Sign in',
    canMatch: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page').then(
        (module) => module.LoginPage,
      ),
  },
  {
    matcher: notesPathMatcher,
    title: 'Knowledge Files',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notes/pages/notes-page/notes-page').then(
        (module) => module.NotesPage,
      ),
  },
  {
    path: '**',
    redirectTo: 'notes',
  },
];
