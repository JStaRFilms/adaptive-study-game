import { useEffect, useState, type FormEvent } from 'react';
import App from '../App';
import { authClient } from '../services/authClient';
import { activateAccount } from '../utils/activeAccount';
import LoginExample from './LoginExample';
import './AuthGate.css';

type AuthMethods = { password: boolean; google: boolean };

function sessionUserId(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('user' in value)) return null;
  const user = value.user;
  return typeof user === 'object' && user !== null && 'id' in user && typeof user.id === 'string' ? user.id : null;
}

function isAuthMethods(value: unknown): value is AuthMethods {
  return typeof value === 'object' && value !== null && 'password' in value && typeof value.password === 'boolean' &&
    'google' in value && typeof value.google === 'boolean';
}

export default function AuthGate() {
  const { data, isPending, error } = authClient.useSession();
  const [methods, setMethods] = useState<AuthMethods | null>(null);
  const [methodsError, setMethodsError] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const userId = sessionUserId(data);
  const [readyUserId, setReadyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    try {
      activateAccount(userId);
      setReadyUserId(userId);
    } catch {
      window.location.reload();
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth-options', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Authentication options are unavailable.');
      const options: unknown = await response.json();
      if (!isAuthMethods(options)) throw new Error('Invalid authentication options.');
      setMethods(options);
    }).catch(() => {
      if (!controller.signal.aborted) setMethodsError(true);
    });
    return () => controller.abort();
  }, []);

  if (isPending) return <main role="status" className="login-status">Checking your session…</main>;
  if (error) return <main role="alert" className="login-status">
    Authentication is unavailable. Reload to try again.
  </main>;

  if (!userId) {
    const handleEmail = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitting(true);
      setSignInError(null);
      try {
        const result = registering
          ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
          : await authClient.signIn.email({ email: email.trim(), password });
        if (result.error) setSignInError('Could not sign in. Check your details and try again.');
        else window.location.reload();
      } catch {
        setSignInError('Could not sign in. Try again later.');
      } finally {
        setSubmitting(false);
      }
    };

    return <div className="login-page">
      <header className="login-header">
        <div className="login-brand">
          <img src="/brand/logo-mark.png" alt="" width="296" height="224" />
          <span>JStar Study</span>
        </div>
        <p>A place to study, not just store notes.</p>
      </header>
      <main className="login-content">
        <section className="login-intro" aria-labelledby="login-heading">
          <p className="login-eyebrow">STUDY WITH PURPOSE</p>
          <h1 id="login-heading"><span>Make what you</span><span>read <em>stick.</em></span></h1>
          <p className="login-support"><span>Turn your notes into questions.</span>{' '}<span>Practice what matters.</span></p>
        </section>
        <section className="login-signin" aria-labelledby="login-welcome">
          <div className="login-signin-brand">
            <img src="/brand/logo-mark.png" alt="" width="296" height="224" />
            <span>JStar Study</span>
          </div>
          <h2 id="login-welcome">Welcome to JStar Study</h2>
          <p className="login-subtitle">Your next study session starts here.</p>
          {!methods && !methodsError && <p role="status" className="login-message">Loading sign-in options…</p>}
          {methods?.password && <form onSubmit={handleEmail} className="login-email-form">
            {registering && <label className="block text-sm">Name
              <input required maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="login-input" />
            </label>}
            <label className="block text-sm">Email
              <input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="login-input" />
            </label>
            <label className="block text-sm">Password
              <input required type="password" minLength={8} maxLength={128} autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} className="login-input" />
            </label>
            <button disabled={submitting} className="login-email-submit">{registering ? 'Create test account' : 'Sign in'}</button>
            <button type="button" className="w-full text-sm underline" onClick={() => { setRegistering(!registering); setSignInError(null); }}>
              {registering ? 'I already have an account' : 'Create a test account'}
            </button>
            <p className="login-message">Development only. Email verification and password recovery are not available yet.</p>
          </form>}
          {methods?.google && <button disabled={submitting} className="login-google" onClick={async () => {
            setSignInError(null);
            try {
              const result = await authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin });
              if (result.error) setSignInError('Google sign-in is unavailable. Please try again later.');
            } catch {
              setSignInError('Google sign-in is unavailable. Please try again later.');
            }
          }}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="login-google-mark">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.61 4.61 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.39 13.91a6 6 0 0 1 0-3.82V7.5H3.04a10 10 0 0 0 0 9l3.35-2.59Z" />
              <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.5l3.35 2.59C7.18 7.72 9.39 5.96 12 5.96Z" />
            </svg>
            Continue with Google
          </button>}
          {methods?.google && <p className="login-helper">Use your Google account to sign in or get started.</p>}
          {methodsError && <p role="alert" className="login-message login-error">Sign-in options are unavailable. Reload to try again.</p>}
          {methods && !methods.password && !methods.google && <p role="alert" className="login-message login-error">Sign-in is not configured on this deployment.</p>}
          {signInError && <p role="alert" className="login-message login-error">{signInError}</p>}
        </section>
        <LoginExample />
        <p className="login-practice">
          <svg aria-hidden="true" viewBox="0 0 24 32" fill="currentColor"><path d="M14 0 2 18h9l-1 14 12-20h-9Z" /></svg>
          A little practice goes a long way.
        </p>
      </main>
      <footer className="login-footer"><span>JStar Study</span><span>Learn a little. Remember more.</span></footer>
    </div>;
  }

  if (readyUserId !== userId) return <main role="status" className="min-h-screen grid place-items-center bg-background-dark text-white">
    {readyUserId ? 'Switching accounts…' : 'Opening your study data…'}
  </main>;

  return <>
    <button className="fixed bottom-3 right-3 z-40 rounded bg-black/75 px-3 py-2 text-xs text-white shadow" onClick={async () => {
      await authClient.signOut({});
      window.location.reload();
    }}>Sign out</button>
    <App />
  </>;
}
