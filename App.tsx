import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  Calendar,
  Clock,
  BarChart3,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
  Loader2,
  Database,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  ShieldCheck,
  RefreshCcw,
  Briefcase
} from 'lucide-react';
import { format, addWeeks, subWeeks } from 'date-fns';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  FirestoreError,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut, User, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth"; // Import User type
import { db, app } from './firebase'; // Ensure 'app' is also exported from firebase.ts

import {
  Employee,
  Shift,
  TimeOffRequest,
  ShiftSwapRequest,
  OpenShiftClaim,
  Client
} from './types';
import { getWeekDates } from './utils/helpers';

// Components
import ScheduleView from './components/ScheduleView';
import EmployeeManager from './components/EmployeeManager';
import RequestQueue from './components/RequestQueue';
import ReportGenerator from './components/ReportGenerator';
import ShiftModal from './components/ShiftModal';
import SwapModal from './components/SwapModal';
import EmployeeModal from './components/EmployeeModal';
import ClientManager from './components/ClientManager';
import Login from './components/Login'; // Import the Login component

export default function App() {
  const auth = getAuth(app); // Get auth instance

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [openClaims, setOpenClaims] = useState<OpenShiftClaim[]>([]);

  // Persistence & Error State
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auth State
  const [authUser, setAuthUser] = useState<User | null>(null); // Firebase User object
  const [currentUser, setCurrentUser] = useState<Employee | null | undefined>(undefined); // Employee data from Firestore
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // UI State
  const [currentTab, setCurrentTab] = useState<'schedule' | 'employees' | 'requests' | 'reports' | 'clients'>('schedule');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [swapSourceShift, setSwapSourceShift] = useState<Shift | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const isManager = currentUser?.role === 'manager';

  // Handle Email Link Sign In
  useEffect(() => {
    const completeSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
        if (email) {
          try {
            const result = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            onLoginSuccess(result.user);
          } catch (error: any) {
            setErrorMessage(`Error signing in with email link: ${error.message}`);
          }
        }
      }
    };
    completeSignIn();
  }, [auth]);


  // Firebase Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const employeeSnap = await getDocs(query(collection(db, "employees"), where("authUid", "==", user.uid)));

          if (!employeeSnap.empty) {
            const employeeData = employeeSnap.docs[0].data() as Employee;
            setCurrentUser({ ...employeeData, id: employeeSnap.docs[0].id });
          } else {
            // User is authenticated but no employee profile exists in Firestore for this UID
            console.warn("Authenticated user has no employee profile in Firestore.");
            setCurrentUser(null); // Explicitly set to null if no matching employee
            setErrorMessage("Your account is authenticated, but no employee profile was found. Please contact support.");
          }
        } catch (error: any) {
          console.error("Error fetching employee profile:", error);
          setErrorMessage(`Error fetching employee profile: ${error.message}`);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null); // No user logged in
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // Firestore Listeners with Error Handling
  // Only run if a manager is logged in
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'manager') {
      // Clear data if not a manager or not authenticated
      setEmployees([]);
      setShifts([]);
      setClients([]);
      setTimeOffRequests([]);
      setSwapRequests([]);
      setOpenClaims([]);
      setLoading(false);
      return;
    }

    const handleError = (error: FirestoreError) => {
      console.error("Firestore Error:", error.code, error.message);
      setErrorMessage(error.message);
      setLoading(false); // Stop loading regardless
    };

    const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee));
      setEmployees(data);
      setLoading(false);
    }, handleError);

    const unsubShifts = onSnapshot(collection(db, "shifts"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Shift));
      setShifts(data);
    }, handleError);

    const unsubClients = onSnapshot(collection(db, "clients"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client));
      setClients(data);
    }, handleError);

    const unsubTimeOff = onSnapshot(collection(db, "timeOffRequests"), (snapshot) => {
      setTimeOffRequests(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TimeOffRequest)));
    }, handleError);

    const unsubSwaps = onSnapshot(collection(db, "swapRequests"), (snapshot) => {
      setSwapRequests(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ShiftSwapRequest)));
    }, handleError);

    const unsubClaims = onSnapshot(collection(db, "openClaims"), (snapshot) => {
      setOpenClaims(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as OpenShiftClaim)));
    }, handleError);

    return () => {
      unsubEmployees();
      unsubShifts();
      unsubClients();
      unsubTimeOff();
      unsubSwaps();
      unsubClaims();
    };
  }, [currentUser]); // Re-run effect when currentUser changes

  const onLoginSuccess = async (user: User) => {
    // This is called when Login component successfully authenticates a user
    setAuthUser(user);
    try {
      const employeeSnap = await getDocs(query(collection(db, "employees"), where("authUid", "==", user.uid)));
      if (!employeeSnap.empty) {
        const employeeData = employeeSnap.docs[0].data() as Employee;
        setCurrentUser({ ...employeeData, id: employeeSnap.docs[0].id });
        setLoading(false);
      } else {
        // If an authenticated user doesn't have an employee record, handle it.
        // For internal use, manager should create employee records for valid users.
        console.warn("User logged in but no employee record found for UID:", user.uid);
        setCurrentUser(null);
        setErrorMessage("Your account is authenticated, but no employee profile was found. Please contact support to set up your profile.");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error fetching employee data after login:", error);
      setErrorMessage(`Error fetching employee data: ${error.message}`);
      setCurrentUser(null);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setAuthUser(null);
      setErrorMessage(null);
      setLoading(true); // Reset loading state for next login attempt
      setIsLoadingAuth(true); // Reset auth loading
      // Clear all state data
      setEmployees([]);
      setShifts([]);
      setClients([]);
setTimeOffRequests([]);
      setSwapRequests([]);
      setOpenClaims([]);
    } catch (error: any) {
      console.error("Error signing out:", error);
      setErrorMessage(`Error signing out: ${error.message}`);
    }
  };

  // Employee Actions
  const handleAddEmployee = async (newEmp: Omit<Employee, 'id'>, uid?: string) => {
    if (!isManager) {
      alert("Only managers can add employees.");
      return;
    }
    try {
      const employeeData = uid ? { ...newEmp, authUid: uid } : newEmp; // Link to auth UID if provided
      await addDoc(collection(db, "employees"), employeeData);
      setIsEmployeeModalOpen(false);
    } catch (e: any) {
      alert(`Error adding employee: ${e.message}`);
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    if (!isManager && currentUser?.id !== updatedEmp.id) { // Allow employees to update their own profile
      alert("You do not have permission to update this employee.");
      return;
    }
    try {
      const { id, ...data } = updatedEmp;
      await updateDoc(doc(db, "employees", id), data);
      if (currentUser?.id === id) setCurrentUser(updatedEmp); // Update currentUser if it's the one being edited
      setIsEmployeeModalOpen(false);
    } catch (e: any) {
      alert(`Error updating employee: ${e.message}`);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!isManager) {
      alert("Only managers can delete employees.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this employee? This will leave their shifts unassigned.")) {
      try {
        await deleteDoc(doc(db, "employees", id));
        if (currentUser?.id === id) setCurrentUser(null); // Clear currentUser if it's the one being deleted
        setIsEmployeeModalOpen(false);
      } catch (e: any) {
        alert(`Error deleting employee: ${e.message}`);
      }
    }
  };

  // Client Actions
  const handleAddClient = async (newClient: Omit<Client, 'id'>) => {
    if (!isManager) {
      alert("Only managers can add clients.");
      return;
    }
    try {
      await addDoc(collection(db, "clients"), newClient);
    } catch (e: any) {
      alert(`Error adding client: ${e.message}`);
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    if (!isManager) {
      alert("Only managers can update clients.");
      return;
    }
    try {
      const { id, ...data } = updatedClient;
      await updateDoc(doc(db, "clients", id), data);
    } catch (e: any) {
      alert(`Error updating client: ${e.message}`);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!isManager) {
      alert("Only managers can delete clients.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "clients", id));
      } catch (e: any) {
        alert(`Error deleting client: ${e.message}`);
      }
    }
  };

  // Shift Actions
  const handleAddShift = async (newShift: Omit<Shift, 'id'>) => {
    if (!isManager) {
      alert("Only managers can add shifts.");
      return;
    }
    try {
      await addDoc(collection(db, "shifts"), newShift);
      setIsShiftModalOpen(false);
    } catch (e: any) {
      alert(`Error adding shift: ${e.message}`);
    }
  };

  const handleUpdateShift = async (updatedShift: Shift) => {
    if (!isManager) {
      alert("Only managers can update shifts.");
      return;
    }
    try {
      const { id, ...data } = updatedShift;
      await updateDoc(doc(db, "shifts", id), data);
      setSelectedShift(null);
      setIsShiftModalOpen(false);
    } catch (e: any) {
      alert(`Error updating shift: ${e.message}`);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!isManager) {
      alert("Only managers can delete shifts.");
      return;
    }
    try {
      await deleteDoc(doc(db, "shifts", id));
      setSelectedShift(null);
      setIsShiftModalOpen(false);
    } catch (e: any) {
      alert(`Error deleting shift: ${e.message}`);
    }
  };

  const handleProposeSwap = async (requestingShiftId: string, targetShiftId: string, targetEmployeeId: string) => {
    if (!currentUser) return; // Should not happen if UI is correctly rendered
    const payload = {
      requestingEmployeeId: currentUser.id,
      targetEmployeeId,
      requestingShiftId,
      targetShiftId,
      status: 'pending' as const
    };

    try {
      await addDoc(collection(db, "swapRequests"), payload);
      setIsSwapModalOpen(false);
      setSwapSourceShift(null);
    } catch (e: any) {
      alert(`Error proposing swap: ${e.message}`);
    }
  };

  const handleRequestAction = async (type: 'timeoff' | 'swap' | 'claim', id: string, status: 'approved' | 'denied') => {
    if (!isManager) {
      alert("Only managers can approve/deny requests.");
      return;
    }

    try {
      const collectionName = type === 'timeoff' ? "timeOffRequests" : type === 'swap' ? "swapRequests" : "openClaims";
      await updateDoc(doc(db, collectionName, id), { status });
      if (status === 'approved') {
        if (type === 'swap') {
          const swap = swapRequests.find(s => s.id === id);
          if (swap) {
            await updateDoc(doc(db, "shifts", swap.requestingShiftId), { assignedEmployeeId: swap.targetEmployeeId });
            await updateDoc(doc(db, "shifts", swap.targetShiftId), { assignedEmployeeId: swap.requestingEmployeeId });
          }
        } else if (type === 'claim') {
          const claim = openClaims.find(c => c.id === id);
          if (claim) await updateDoc(doc(db, "shifts", claim.shiftId), { assignedEmployeeId: claim.employeeId, status: 'scheduled' });
        }
      }
    } catch (e: any) {
      alert(`Error processing request: ${e.message}`);
    }
  };

  const weekTitle = useMemo(() => `${format(weekDates[0], 'MMM d')} - ${format(weekDates[6], 'MMM d, yyyy')}`, [weekDates]);

  const pendingCount = useMemo(() =>
    timeOffRequests.filter(r => r.status === 'pending').length +
    swapRequests.filter(r => r.status === 'pending').length +
    openClaims.filter(r => r.status === 'pending').length,
    [timeOffRequests, swapRequests, openClaims]
  );

  // Loading state for initial app or auth
  if (isLoadingAuth || loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-indigo-900 text-white p-8 text-center">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-indigo-200 font-medium animate-pulse mb-2">
          {isLoadingAuth ? "Authenticating..." : "Connecting to FlexShift Backend..."}
        </p>
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-500/20 text-red-300 border border-red-400 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}
      </div>
    );
  }

  // If not authenticated or current user is not a manager, show login or access denied.
  if (!authUser) {
    return <Login onLoginSuccess={onLoginSuccess} onError={setErrorMessage} />;
  }

  // If authenticated but no employee profile OR not a manager, show access denied
  if (!currentUser || !isManager) { // Added !isManager to this condition
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <UserCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-6">
          {errorMessage || "Your employee profile was not found or you do not have manager privileges to access this application."}
        </p>
        <button
          onClick={handleLogout}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Main App UI (only for authenticated managers)
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Sidebar Nav */}
      <nav className="w-full md:w-64 bg-indigo-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-500 p-2 rounded-xl">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FlexShift</h1>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setCurrentTab('schedule')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${currentTab === 'schedule' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-white/5'}`}
            >
              <Calendar className="w-5 h-5" />
              <span>Schedule</span>
            </button>
            <button
              onClick={() => setCurrentTab('employees')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${currentTab === 'employees' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-white/5'}`}
            >
              <Users className="w-5 h-5" />
              <span>Employees</span>
            </button>
            <button
              onClick={() => setCurrentTab('clients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${currentTab === 'clients' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-white/5'}`}
            >
              <Briefcase className="w-5 h-5" />
              <span>Clients</span>
            </button>
            <button
              onClick={() => setCurrentTab('requests')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${currentTab === 'requests' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-white/5'}`}
            >
              <Clock className="w-5 h-5" />
              <div className="flex justify-between items-center w-full">
                <span>Requests</span>
                {pendingCount > 0 && <span className="bg-rose-500 text-[10px] text-white px-2 py-0.5 rounded-full font-bold">{pendingCount}</span>}
              </div>
            </button>

            {isManager && (
              <button
                onClick={() => setCurrentTab('reports')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${currentTab === 'reports' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-white/5'}`}
              >
                <BarChart3 className="w-5 h-5" />
                <span>Reports</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-indigo-800/50 space-y-4">
          <div className="px-2">
            {/* Removed conditional firebaseStatus display, assuming always connected if app is running */}
            <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-emerald-400/10 p-2 rounded-lg border border-emerald-400/20">
              <Database className="w-3 h-3" />
              Live Cloud
            </div>
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center border-2 border-indigo-500">
              <UserCircle className="w-8 h-8 text-indigo-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{currentUser.name}</p>
              <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest">{currentUser.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-indigo-400 hover:text-white transition px-2 py-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {errorMessage && (
          <div className="bg-red-50 border-b border-red-200 p-3">
            <div className="flex gap-3 items-center max-w-4xl mx-auto">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-xs text-red-700 flex-1">
                {errorMessage}
              </p>
              <button onClick={() => setErrorMessage(null)} aria-label="Dismiss warning"><X className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        )}

        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-gray-800 capitalize tracking-tight">{currentTab}</h2>
            {currentTab === 'schedule' && (
              <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                <button
                  onClick={() => setCurrentDate(prev => subWeeks(prev, 1))}
                  aria-label="Previous Week"
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold text-gray-600 min-w-[180px] text-center">{weekTitle}</span>
                <button
                  onClick={() => setCurrentDate(prev => addWeeks(prev, 1))}
                  aria-label="Next Week"
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentTab === 'schedule' && isManager && (
              <button
                onClick={() => { setSelectedShift(null); setIsShiftModalOpen(true); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold text-sm shadow-indigo-200 shadow-lg active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Shift</span>
              </button>
            )}
            {currentTab === 'employees' && isManager && (
              <button
                onClick={() => { setSelectedEmployee(null); setIsEmployeeModalOpen(true); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold text-sm shadow-indigo-200 shadow-lg active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            )}
            {currentTab === 'clients' && isManager && ( // Add button for clients
              <button
                onClick={() => { setCurrentTab('clients'); /* Optionally open add modal here */ }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold text-sm shadow-indigo-200 shadow-lg active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Client</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          {currentTab === 'schedule' && (
            <ScheduleView
              shifts={shifts} employees={employees} weekDates={weekDates} userMode={isManager ? 'manager' : 'employee'} currentUser={currentUser}
              onShiftClick={(shift) => isManager && (setSelectedShift(shift), setIsShiftModalOpen(true))}
              onClaimShift={async (shift) => {
                if (!currentUser) return;
                const claim = { employeeId: currentUser.id, shiftId: shift.id, status: 'pending' as const };
                try {
                  await addDoc(collection(db, "openClaims"), claim);
                } catch (e: any) {
                  alert(`Error claiming shift: ${e.message}`);
                }
              }}
              onRequestSwap={(shift) => { setSwapSourceShift(shift); setIsSwapModalOpen(true); }}
            />
          )}

          {currentTab === 'employees' && (
            <EmployeeManager
              employees={employees}
              userMode={isManager ? 'manager' : 'employee'}
              onEditEmployee={(emp) => { setSelectedEmployee(emp); setIsEmployeeModalOpen(true); }}
            />
          )}

          {currentTab === 'clients' && (
            <ClientManager
              clients={clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {currentTab === 'requests' && (
            <RequestQueue
              userMode={isManager ? 'manager' : 'employee'} currentUser={currentUser} timeOffRequests={timeOffRequests} swapRequests={swapRequests}
              openClaims={openClaims} employees={employees} shifts={shifts} onAction={handleRequestAction}
            />
          )}

          {currentTab === 'reports' && isManager && (
            <ReportGenerator shifts={shifts} employees={employees} weekDates={weekDates} currentUser={currentUser} />
          )}
        </div>
      </main>

      {/* Modals */}
      {isShiftModalOpen && (
        <ShiftModal
          isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} shift={selectedShift}
          employees={employees} onSave={selectedShift ? handleUpdateShift : handleAddShift}
          onDelete={selectedShift ? handleDeleteShift : undefined} weekDates={weekDates}
          allShifts={shifts}
        />
      )}

      {isSwapModalOpen && swapSourceShift && (
        <SwapModal
          isOpen={isSwapModalOpen} onClose={() => { setIsSwapModalOpen(false); setSwapSourceShift(null); }}
          sourceShift={swapSourceShift} shifts={shifts} employees={employees} currentUser={currentUser} onPropose={handleProposeSwap}
        />
      )}

      {isEmployeeModalOpen && (
        <EmployeeModal
          isOpen={isEmployeeModalOpen}
          onClose={() => setIsEmployeeModalOpen(false)}
          employee={selectedEmployee}
          onSave={selectedEmployee ? handleUpdateEmployee : handleAddEmployee}
          onDelete={selectedEmployee ? handleDeleteEmployee : undefined}
        />
      )}
    </div>
  );
}
