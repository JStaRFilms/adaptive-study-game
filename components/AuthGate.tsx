import { useEffect, useState, type FormEvent } from 'react';
import App from '../App';
import { authClient } from '../services/authClient';
import { activateAccount } from '../utils/activeAccount';

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

  if (isPending) return <main className="min-h-screen grid place-items-center">Checking your session…</main>;
  if (error) return <main role="alert" className="min-h-screen grid place-items-center bg-background-dark p-6 text-white">
    Authentication is unavailable. Reload to try again.
  </main>;

  const userId = sessionUserId(data);
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

    return <main className="min-h-screen flex items-center justify-center bg-background-dark p-6 text-white">
      <div className="w-full max-w-sm space-y-5 text-center">
        <h1 className="text-2xl font-semibold">Adaptive Study Game</h1>
        <p className="text-text-secondary">Sign in to keep your study data separate on this device.</p>
        {!methods && !methodsError && <p role="status" className="text-sm text-text-secondary">Loading sign-in options…</p>}
        {methods?.password && <form onSubmit={handleEmail} className="space-y-3 text-left">
          {registering && <label className="block text-sm">Name
            <input required maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded bg-surface-dark p-2 text-white" />
          </label>}
          <label className="block text-sm">Email
            <input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded bg-surface-dark p-2 text-white" />
          </label>
          <label className="block text-sm">Password
            <input required type="password" minLength={8} maxLength={128} autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded bg-surface-dark p-2 text-white" />
          </label>
          <button disabled={submitting} className="w-full rounded-lg bg-brand-primary px-5 py-3 font-semibold hover:bg-brand-secondary disabled:opacity-50">{registering ? 'Create test account' : 'Sign in'}</button>
          <button type="button" className="w-full text-sm underline" onClick={() => { setRegistering(!registering); setSignInError(null); }}>
            {registering ? 'I already have an account' : 'Create a test account'}
          </button>
          <p className="text-xs text-text-secondary">Development only. Email verification and password recovery are not available yet.</p>
        </form>}
        {methods?.google && <button disabled={submitting} className="rounded-lg bg-brand-primary px-5 py-3 font-semibold hover:bg-brand-secondary disabled:opacity-50" onClick={async () => {
          setSignInError(null);
          try {
            const result = await authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin });
            if (result.error) setSignInError('Google sign-in is unavailable. Please try again later.');
          } catch {
            setSignInError('Google sign-in is unavailable. Please try again later.');
          }
        }}>Continue with Google</button>}
        {methodsError && <p role="alert" className="text-sm text-red-300">Sign-in options are unavailable. Reload to try again.</p>}
        {methods && !methods.password && !methods.google && <p role="alert" className="text-sm text-red-300">Sign-in is not configured on this deployment.</p>}
        {signInError && <p role="alert" className="text-sm text-red-300">{signInError}</p>}
        <p className="text-xs text-text-secondary">Your study data stays in this browser. Clearing browser data deletes it.</p>
      </div>
    </main>;
  }

  try {
    activateAccount(userId);
  } catch {
    window.location.reload();
    return null;
  }

  return <>
    <button className="fixed bottom-3 right-3 z-40 rounded bg-black/75 px-3 py-2 text-xs text-white shadow" onClick={async () => {
      await authClient.signOut({});
      window.location.reload();
    }}>Sign out</button>
    <App />
  </>;
}
