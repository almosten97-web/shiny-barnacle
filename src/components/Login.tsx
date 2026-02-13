import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { mapAuthError } from '../lib/error-mapping';
import { FieldErrors, validateLoginForm } from '../lib/validation';

interface LoginProps {
  onLoginSuccess?: (user: any) => void;
  onError?: (message: string) => void;
  message?: string | null;
}

type LoginFields = 'email' | 'password';

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onError, message }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginFields>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitedEmail = params.get('email');
    if (invitedEmail) {
      setEmail(invitedEmail);
      setStatusMessage('Invite detected. Sign up or login with this email.');
    }
  }, []);

  const handleAuth = async (action: 'login' | 'signup') => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setFieldErrors({});
    onError?.('');

    const values = { email, password };
    const validation = validateLoginForm(values);

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setLoading(false);
      return;
    }

    try {
      if (action === 'signup') {
        const { data, error } = await supabase.auth.signUp(values);

        if (error) throw error;
        setStatusMessage('Sign-up successful. Check your email to confirm your account.');
        onLoginSuccess?.(data.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword(values);

        if (error) throw error;
        setStatusMessage('Login successful. Redirecting to your dashboard.');
        onLoginSuccess?.(data.user);
      }
    } catch (error: any) {
      const semanticMessage = mapAuthError(error?.message);
      setErrorMessage(semanticMessage);
      onError?.(semanticMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    onError?.('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      const semanticMessage = mapAuthError(error?.message);
      setErrorMessage(semanticMessage);
      onError?.(semanticMessage);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">Charlene's Scheduling App</h2>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()} noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleAuth('login')}
              disabled={loading || googleLoading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300"
            >
              {loading ? 'Working...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => handleAuth('signup')}
              disabled={loading || googleLoading}
              className="relative flex w-full justify-center rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {loading ? 'Working...' : 'Sign Up'}
            </button>
          </div>
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs font-medium uppercase tracking-wide text-gray-400">or</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading || googleLoading}
            className="relative flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>
        </form>
        {(message || errorMessage) && (
          <p className="text-center text-sm text-red-600" role="alert" aria-live="polite">
            {message || errorMessage}
          </p>
        )}
        {statusMessage && (
          <p className="text-center text-sm text-green-600" role="status" aria-live="polite">
            {statusMessage}
          </p>
        )}
        <div className="text-center text-sm text-gray-500">
          <p>This application is for demonstration purposes only.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
