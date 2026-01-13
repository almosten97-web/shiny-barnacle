import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, User, sendSignInLinkToEmail } from 'firebase/auth';
import { app } from '../firebase';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onError: (message: string | null) => void; // Can accept null to clear the message
  message: string | null; // The message to display
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onError, message }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailForLink, setEmailForLink] = useState('');
  const auth = getAuth(app);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onError(null); // Clear previous messages
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess(userCredential.user);
    } catch (error: any) {
      onError(error.message); // Display error message on the page
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
    onError(null); // Clear previous messages
    
    const actionCodeSettings = {
      // It's crucial that this URL is in the authorized domains list in your Firebase console.
      url: window.location.origin, // Redirect back to the main page after sign-in.
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, emailForLink, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', emailForLink);
      onError('A sign-in link has been sent to your email. Please check your inbox.');
    } catch (error: any) {
      console.error("Error sending email link: ", error);
      onError(`Failed to send link: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
        <h3 className="text-2xl font-bold text-center">Login to your account</h3>
        
        {/* Display Message Area from props */}
        {message && (
          <p className={`mt-4 text-center p-2 rounded-md ${message.includes('Failed') || message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </p>
        )}

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