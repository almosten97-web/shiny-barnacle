
import React, { useState } from 'react';
import { getAuth, sendSignInLinkToEmail } from 'firebase/auth';
import { app } from '../firebase';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onError: (message: string) => void;
  message: string | null;
}

const Login: React.FC<LoginProps> = ({ onError, message }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const auth = getAuth(app);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onError(''); // Clear previous errors

    const actionCodeSettings = {
      url: window.location.href, // URL to redirect back to
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setEmailSent(true);
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      onError(`Failed to send sign-in link: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-extrabold text-center text-gray-900">
          FlexShift Login
        </h2>
        {emailSent ? (
          <div className="text-center">
            <p className="text-lg font-medium text-green-600">
              Sign-in link sent!
            </p>
            <p className="mt-2 text-gray-600">
              Please check your email at <strong>{email}</strong> to complete your login. You can close this tab.
            </p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleLogin}>
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md group hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
              >
                {loading ? 'Sending...' : 'Send Sign-In Link'}
              </button>
            </div>
          </form>
        )}
        {message && (
          <p className="text-sm text-center text-red-600">{message}</p>
        )}
         <div className="text-center text-sm text-gray-500">
            <p>
                This application is for demonstration purposes only.
            </p>
         </div>
      </div>
    </div>
  );
};

export default Login;
