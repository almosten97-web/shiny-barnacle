
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
  WifiOff,
  Database,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  ShieldCheck,
  RefreshCcw
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
  FirestoreError
} from "firebase/firestore";
import { db } from './firebase';

import { 
  Employee, 
  Shift, 
  TimeOffRequest, 
  ShiftSwapRequest, 
  OpenShiftClaim 
} from './types';
import { MOCK_EMPLOYEES, MOCK_SHIFTS, MOCK_TIME_OFF } from './mockData';
import { getWeekDates } from './utils/helpers';

// Components
import ScheduleView from './components/ScheduleView';
import EmployeeManager from './components/EmployeeManager';
import RequestQueue from './components/RequestQueue';
import ReportGenerator from './components/ReportGenerator';
import ShiftModal from './components/ShiftModal';
import SwapModal from './components/SwapModal';
import EmployeeModal from './components/EmployeeModal';

export default function App() {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [openClaims, setOpenClaims] = useState<OpenShiftClaim[]>([]);
  
  // Persistence & Error State
  const [loading, setLoading] = useState(true);
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'error' | 'local'>('connected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // UI State
  const [currentTab, setCurrentTab] = useState<'schedule' | 'employees' | 'requests' | 'reports'>('schedule');
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [swapSourceShift, setSwapSourceShift] = useState<Shift | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const isManager = currentUser?.role === 'manager';

  // Fallback to Local Storage / Mock Data
  const initializeLocalData = useCallback(() => {
    setFirebaseStatus('local');
    setEmployees([]);
    setShifts([]);
    setTimeOffRequests([]);
    setLoading(false);
  }, []);

  // Firestore Listeners with Error Handling
  useEffect(() => {
    const handleError = (error: FirestoreError) => {
      console.error("Firestore Error:", error.code, error.message);
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        setErrorMessage(error.message);
        initializeLocalData();
      }
    };

    const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee));
      setEmployees(data);
      if (!currentUser && data.length > 0) {
        setCurrentUser(data[0]);
      }
      setLoading(false);
    }, handleError);

    const unsubShifts = onSnapshot(collection(db, "shifts"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Shift));
      setShifts(data);
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
      unsubTimeOff();
      unsubSwaps();
      unsubClaims();
    };
  }, [firebaseStatus, initializeLocalData]);

  // Employee Actions
  const handleAddEmployee = async (newEmp: Omit<Employee, 'id'>) => {
    if (firebaseStatus === 'local') {
      const id = `e${Date.now()}`;
      const createdEmp = { ...newEmp, id } as Employee;
      setEmployees(prev => [...prev, createdEmp]);
      if (employees.length === 0) setCurrentUser(createdEmp);
      setIsEmployeeModalOpen(false);
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "employees"), newEmp);
      if (employees.length === 0) {
        setCurrentUser({ ...newEmp, id: docRef.id } as Employee);
      }
      setIsEmployeeModalOpen(false);
    } catch (e) {
      alert("Error adding employee");
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    if (firebaseStatus === 'local') {
      setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
      if (currentUser?.id === updatedEmp.id) setCurrentUser(updatedEmp);
      setIsEmployeeModalOpen(false);
      return;
    }
    try {
      const { id, ...data } = updatedEmp;
      await updateDoc(doc(db, "employees", id), data);
      if (currentUser?.id === id) setCurrentUser(updatedEmp);
      setIsEmployeeModalOpen(false);
    } catch (e) {
      alert("Error updating employee");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this employee? This will leave their shifts unassigned.")) {
      if (firebaseStatus === 'local') {
        setEmployees(prev => prev.filter(e => e.id !== id));
        setShifts(prev => prev.map(s => s.assignedEmployeeId === id ? { ...s, assignedEmployeeId: null, status: 'open' } : s));
        if (currentUser?.id === id) setCurrentUser(null);
        setIsEmployeeModalOpen(false);
        return;
      }
      try {
        await deleteDoc(doc(db, "employees", id));
        if (currentUser?.id === id) setCurrentUser(null);
        setIsEmployeeModalOpen(false);
      } catch (e) {}
    }
  };

  // Shift Actions
  const handleAddShift = async (newShift: Omit<Shift, 'id'>) => {
    if (firebaseStatus === 'local') {
      setShifts(prev => [...prev, { ...newShift, id: `s${Date.now()}` } as Shift]);
      setIsShiftModalOpen(false);
      return;
    }
    try {
      await addDoc(collection(db, "shifts"), newShift);
      setIsShiftModalOpen(false);
    } catch (e) {
      alert("Error adding shift");
    }
  };

  const handleUpdateShift = async (updatedShift: Shift) => {
    if (firebaseStatus === 'local') {
      setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
      setIsShiftModalOpen(false);
      return;
    }
    try {
      const { id, ...data } = updatedShift;
      await updateDoc(doc(db, "shifts", id), data);
      setSelectedShift(null);
      setIsShiftModalOpen(false);
    } catch (e) {
      alert("Error updating shift");
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (firebaseStatus === 'local') {
      setShifts(prev => prev.filter(s => s.id !== id));
      setIsShiftModalOpen(false);
      return;
    }
    try {
      await deleteDoc(doc(db, "shifts", id));
      setSelectedShift(null);
      setIsShiftModalOpen(false);
    } catch (e) {}
  };

  const handleProposeSwap = async (requestingShiftId: string, targetShiftId: string, targetEmployeeId: string) => {
    if (!currentUser) return;
    const payload = {
      requestingEmployeeId: currentUser.id,
      targetEmployeeId,
      requestingShiftId,
      targetShiftId,
      status: 'pending' as const
    };

    if (firebaseStatus === 'local') {
      setSwapRequests(prev => [...prev, { ...payload, id: `swap-${Date.now()}` }]);
      setIsSwapModalOpen(false);
      return;
    }

    try {
      await addDoc(collection(db, "swapRequests"), payload);
      setIsSwapModalOpen(false);
      setSwapSourceShift(null);
    } catch (e) {}
  };

  const handleRequestAction = async (type: 'timeoff' | 'swap' | 'claim', id: string, status: 'approved' | 'denied') => {
    if (firebaseStatus === 'local') {
        if (type === 'timeoff') setTimeOffRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        if (type === 'swap') {
            setSwapRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
            if (status === 'approved') {
                const swap = swapRequests.find(s => s.id === id);
                if (swap) setShifts(prev => prev.map(s => s.id === swap.requestingShiftId ? { ...s, assignedEmployeeId: swap.targetEmployeeId } : s.id === swap.targetShiftId ? { ...s, assignedEmployeeId: swap.requestingEmployeeId } : s));
            }
        }
        if (type === 'claim') {
            setOpenClaims(prev => prev.map(r => r.id === id ? { ...r, status } : r));
            if (status === 'approved') {
                const claim = openClaims.find(c => c.id === id);
                if (claim) setShifts(prev => prev.map(s => s.id === claim.shiftId ? { ...s, assignedEmployeeId: claim.employeeId, status: 'scheduled' } : s));
            }
        }
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
    } catch (e) {}
  };

  const weekTitle = useMemo(() => `${format(weekDates[0], 'MMM d')} - ${format(weekDates[6], 'MMM d, yyyy')}`, [weekDates]);
  
  const pendingCount = useMemo(() => 
    timeOffRequests.filter(r => r.status === 'pending').length + 
    swapRequests.filter(r => r.status === 'pending').length + 
    openClaims.filter(r => r.status === 'pending').length,
    [timeOffRequests, swapRequests, openClaims]
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-indigo-900 text-white p-8 text-center">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-indigo-200 font-medium animate-pulse mb-2">Connecting to FlexShift Backend...</p>
        <button 
          onClick={initializeLocalData} 
          className="mt-8 px-6 py-2 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 text-xs rounded-full border border-indigo-700 transition"
        >
          Use Local Persistence instead
        </button>
      </div>
    );
  }

  // Initial Setup Screen if no employees exist
  if (employees.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden">
          <div className="bg-indigo-900 p-12 text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="bg-white/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-2">Welcome to FlexShift</h1>
              <p className="text-indigo-200 text-sm">Let's create the first manager account to get started.</p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          </div>
          
          <div className="p-12">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddEmployee({
                name: formData.get('name') as string,
                role: 'manager',
                locations: ['Main Street'],
                maxHoursPerWeek: 40,
                preferredHours: 'Standard weekdays',
                status: 'active'
              });
            }} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Manager Name</label>
                <input 
                  name="name"
                  required
                  placeholder="e.g. Alice Henderson"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black tracking-widest uppercase text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
              >
                <ShieldCheck className="w-5 h-5" />
                Initialize System
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <UserCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Access Restricted</h2>
        <p className="text-gray-500 mb-6">Your account was not found or has been removed.</p>
        <button 
          onClick={() => setCurrentUser(employees[0])} 
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold"
        >
          Select Available User
        </button>
      </div>
    );
  }

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
            {firebaseStatus === 'local' ? (
                <div className="flex items-center gap-2 text-amber-400 text-[10px] font-bold uppercase tracking-wider bg-amber-400/10 p-2 rounded-lg border border-amber-400/20">
                    <WifiOff className="w-3 h-3" />
                    Local Mode
                </div>
            ) : (
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-emerald-400/10 p-2 rounded-lg border border-emerald-400/20">
                    <Database className="w-3 h-3" />
                    Live Cloud
                </div>
            )}
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
            onClick={() => {
              const currentIndex = employees.findIndex(e => e.id === currentUser.id);
              const nextIndex = (currentIndex + 1) % employees.length;
              const nextUser = employees[nextIndex];
              if (nextUser) {
                setCurrentUser(nextUser);
                if (nextUser.role === 'caregiver' && currentTab === 'reports') {
                  setCurrentTab('schedule');
                }
              }
            }}
            className="w-full text-[10px] font-bold py-2.5 px-3 bg-indigo-800/50 hover:bg-indigo-800 text-indigo-200 rounded-xl transition border border-indigo-700 uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"
          >
            <RefreshCcw className="w-3 h-3" />
            Switch Account
          </button>
          
          <button className="flex items-center gap-3 text-indigo-400 hover:text-white transition px-2 py-1">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {errorMessage && firebaseStatus === 'local' && (
          <div className="bg-amber-50 border-b border-amber-200 p-3">
             <div className="flex gap-3 items-center max-w-4xl mx-auto">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-700 flex-1">
                    Database not configured. Using local persistence. Fix in Firebase Console.
                </p>
                <button onClick={() => setErrorMessage(null)} aria-label="Dismiss warning"><X className="w-4 h-4 text-amber-500" /></button>
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
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          {currentTab === 'schedule' && (
            <ScheduleView 
              shifts={shifts} employees={employees} weekDates={weekDates} userMode={isManager ? 'manager' : 'employee'} currentUser={currentUser}
              onShiftClick={(shift) => isManager && (setSelectedShift(shift), setIsShiftModalOpen(true))}
              onClaimShift={async (shift) => {
                 const claim = { employeeId: currentUser.id, shiftId: shift.id, status: 'pending' as const };
                 if (firebaseStatus === 'local') setOpenClaims(prev => [...prev, { ...claim, id: `c${Date.now()}` }]);
                 else await addDoc(collection(db, "openClaims"), claim);
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
