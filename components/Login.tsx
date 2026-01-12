import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, User, sendSignInLinkToEmail } from 'firebase/auth';
import { app } from '../firebase'; // Assuming your firebase.ts exports 'app'

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onError: (errorMessage: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailForLink, setEmailForLink] = useState(''); // State for email link sign-in
  const auth = getAuth(app);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess(userCredential.user);
    } catch (error: any) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLinkSignIn = async () => {
    if (!emailForLink) {
      onError('Please enter an email address for the sign-in link.');
      return;
    }
    setLoading(true);
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
      iOS: {
        bundleId: 'com.example.ios', // Dummy value
      },
      android: {
        packageName: 'com.example.android', // Dummy value
        installApp: true,
        minimumVersion: '12',
      },
      dynamicLinkDomain: 'example.page.link', // You might need to configure this in Firebase Console
    };

    try {
      await sendSignInLinkToEmail(auth, emailForLink, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', emailForLink);
      onError('A sign-in link has been sent to your email. Please check your inbox.');
    } catch (error: any) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
        <h3 className="text-2xl font-bold text-center">Login to your account</h3>
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <div>
              <label className="block" htmlFor="email">Email</label>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block" htmlFor="password">Password</label>
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-baseline justify-between">
              <button
                type="submit"
                className="px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 border-t pt-4">
          <h4 className="text-xl font-bold text-center mb-4">Or sign in with email link</h4>
          <div>
            <label className="block" htmlFor="emailLink">Email</label>
            <input
              type="email"
              placeholder="Email for sign-in link"
              className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              id="emailLink"
              value={emailForLink}
              onChange={(e) => setEmailForLink(e.target.value)}
              required
            />
          </div>
          <div className="flex items-baseline justify-between mt-4">
            <button
              onClick={handleEmailLinkSignIn}
              className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-900"
              disabled={loading}
            >
              {loading ? 'Sending link...' : 'Send Sign-in Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;