
import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { app } from '@/firebase';
import Login from '@/components/Login';
import EmployeeDashboard from '@/components/EmployeeDashboard';
import ManagerDashboard from '@/components/ManagerDashboard';
import '@/index.css';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    // Handle email link sign-in on page load
    const handleEmailLinkSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            // The onAuthStateChanged listener will handle the rest.
          } catch (error: any) {
            setMessage(`Error signing in with email link: ${error.message}`);
          }
        }
      }
    };

    handleEmailLinkSignIn();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          const employeeDocRef = doc(db, 'employees', currentUser.uid);
          const employeeDoc = await getDoc(employeeDocRef);

          if (employeeDoc.exists()) {
            setEmployee({ id: employeeDoc.id, ...employeeDoc.data() });
          } else {
            // Profile doesn't exist, check if this is the first user.
            const employeesCollection = collection(db, 'employees'); // Corrected syntax
            const employeesSnapshot = await getDocs(employeesCollection);

            if (employeesSnapshot.empty) {
              // First user! Create a manager profile.
              const newManagerProfile = {
                email: currentUser.email,
                role: 'manager',
                name: currentUser.displayName || currentUser.email || 'Manager',
              };
              await setDoc(employeeDocRef, newManagerProfile);
              setEmployee({ id: currentUser.uid, ...newManagerProfile });
              setMessage('Welcome! Your manager account has been created.');
            } else {
              // Not the first user, and no profile exists. Deny access.
              setMessage('Access Denied: Your employee profile was not found. Please contact an administrator.');
              await auth.signOut(); // Sign out user without a profile
            }
          }
        } else {
          // No user is signed in
          setUser(null);
          setEmployee(null);
        }
      } catch (error) {
        console.error("Error in auth state change handler:", error);
        setMessage("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setEmployee(null);
      setMessage('You have been logged out.');
    } catch (error: any) {
      setMessage(`Error logging out: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && employee ? (
        <>
          <div className="bg-white shadow-md p-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">FlexShift</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-800"
            >
              Logout
            </button>
          </div>
          {message && <p className="text-center p-4 bg-blue-100 text-blue-800">{message}</p>}
          {employee.role === 'manager' ? (
            <ManagerDashboard manager={employee} />
          ) : (
            <EmployeeDashboard employee={employee} />
          )}
        </>
      ) : (
        <Login
          onLoginSuccess={async (loggedInUser) => {
            setUser(loggedInUser);
          }}
          onError={setMessage}
          message={message}
        />
      )}
    </div>
  );
};

export default App;
