import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { CURRENT_USER } from '../data/mock-data';

describe('AuthService demo accounts', () => {
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AuthService] });
    auth = TestBed.inject(AuthService);
    const started = Date.now();
    while (!auth.ready() && Date.now() - started < 2000) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });

  it('keeps the signup name after sign-out and sign-in', async () => {
    const created = await auth.signUp({
      email: 'priya.new@example.com',
      password: 'secret1',
      firstName: 'Priya',
      lastName: '',
      phone: '9876543210',
    });

    expect(created.ok).toBe(true);
    expect(auth.user()?.firstName).toBe('Priya');
    expect(auth.user()?.lastName).toBe('');
    expect(auth.user()?.phone).toBe('9876543210');

    await auth.logout();
    expect(auth.user()).toBeNull();

    const signedIn = await auth.signIn('Priya.New@example.com', 'secret1');
    expect(signedIn.ok).toBe(true);
    expect(auth.user()?.firstName).toBe('Priya');
    expect(auth.user()?.lastName).toBe('');
    expect(auth.user()?.lastName).not.toBe(CURRENT_USER.lastName);
    expect(auth.user()?.phone).toBe('9876543210');
    expect(auth.user()?.email).toBe('priya.new@example.com');
  });

  it('does not attach the seeded surname to an unknown email', async () => {
    const signedIn = await auth.signIn('newcomer@example.com', 'secret1');
    expect(signedIn.ok).toBe(true);
    expect(auth.user()?.firstName).toBe('Newcomer');
    expect(auth.user()?.lastName).toBe('');
  });

  it('still signs in the seeded demo user by email', async () => {
    const signedIn = await auth.signIn(CURRENT_USER.email, 'secret1');
    expect(signedIn.ok).toBe(true);
    expect(auth.user()?.firstName).toBe(CURRENT_USER.firstName);
    expect(auth.user()?.lastName).toBe(CURRENT_USER.lastName);
  });

  it('rejects a short demo password', async () => {
    const signedIn = await auth.signIn('priya.new@example.com', 'short');
    expect(signedIn.ok).toBe(false);
    expect(auth.user()).toBeNull();
  });
});
