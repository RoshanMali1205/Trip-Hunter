import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** Wait until AuthService has finished restoring session from storage/Supabase. */
async function whenReady(auth: AuthService): Promise<void> {
  if (auth.ready()) return;
  const started = Date.now();
  while (!auth.ready() && Date.now() - started < 10_000) {
    await new Promise((r) => setTimeout(r, 25));
  }
}

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await whenReady(auth);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await whenReady(auth);
  if (!auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
