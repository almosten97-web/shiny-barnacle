
import React from 'react';
import { TimeOffRequest, ShiftSwapRequest, OpenShiftClaim, Employee, Shift } from '../types';
import { CheckCircle2, XCircle, Clock, ArrowRightLeft, UserPlus, UserMinus, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface RequestQueueProps {
  userMode: 'manager' | 'employee';
  currentUser: Employee;
  timeOffRequests: TimeOffRequest[];
  swapRequests: ShiftSwapRequest[];
  openClaims: OpenShiftClaim[];
  employees: Employee[];
  shifts: Shift[];
  onAction: (type: 'timeoff' | 'swap' | 'claim', id: string, status: 'approved' | 'denied') => void;
}

const RequestQueue: React.FC<RequestQueueProps> = ({ 
  userMode, 
  currentUser,
  timeOffRequests, 
  swapRequests, 
  openClaims,
  employees,
  shifts,
  onAction 
}) => {

  const pendingTimeOff = timeOffRequests.filter(r => userMode === 'manager' ? r.status === 'pending' : (r.employeeId === currentUser.id));
  const pendingClaims = openClaims.filter(r => userMode === 'manager' ? r.status === 'pending' : (r.employeeId === currentUser.id));
  const pendingSwaps = swapRequests.filter(r => userMode === 'manager' ? r.status === 'pending' : (r.requestingEmployeeId === currentUser.id || r.targetEmployeeId === currentUser.id));

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Swap Requests Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700"><ArrowRightLeft className="w-5 h-5" /></div>
            <h3 className="text-lg font-bold text-gray-800">Shift Swap Requests</h3>
        </div>

        {pendingSwaps.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 p-8 rounded-2xl text-center text-gray-400">
            No pending swap requests
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSwaps.map(req => {
              const reqEmp = employees.find(e => e.id === req.requestingEmployeeId);
              const tarEmp = employees.find(e => e.id === req.targetEmployeeId);
              const reqShift = shifts.find(s => s.id === req.requestingShiftId);
              const tarShift = shifts.find(s => s.id === req.targetShiftId);

              return (
                <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">{reqEmp?.name}</p>
                        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 min-w-[140px]">
                          <p className="text-[10px] font-bold text-indigo-600">{format(parseISO(reqShift?.date || ''), 'MMM d')}</p>
                          <p className="text-xs text-indigo-900 font-medium">{reqShift?.startTime} - {reqShift?.endTime}</p>
                        </div>
                      </div>
                      
                      <ArrowRightLeft className="w-6 h-6 text-gray-300" />

                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">{tarEmp?.name}</p>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 min-w-[140px]">
                          <p className="text-[10px] font-bold text-emerald-600">{format(parseISO(tarShift?.date || ''), 'MMM d')}</p>
                          <p className="text-xs text-emerald-900 font-medium">{tarShift?.startTime} - {tarShift?.endTime}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {userMode === 'manager' && req.status === 'pending' ? (
                        <>
                          <button 
                              onClick={() => onAction('swap', req.id, 'approved')}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold text-sm"
                          >
                              Approve
                          </button>
                          <button 
                              onClick={() => onAction('swap', req.id, 'denied')}
                              className="px-4 py-2 bg-white text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-bold text-sm"
                          >
                              Deny
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Time Off Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700"><Clock className="w-5 h-5" /></div>
            <h3 className="text-lg font-bold text-gray-800">Time Off Requests</h3>
        </div>
        
        {pendingTimeOff.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 p-8 rounded-2xl text-center text-gray-400">
            No pending time off requests
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTimeOff.map(req => {
              const emp = employees.find(e => e.id === req.employeeId);
              return (
                <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                        {emp?.name.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">{emp?.name}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {req.startDate} to {req.endDate}
                        </p>
                        <p className="text-xs text-gray-400 italic mt-1">{req.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {userMode === 'manager' && req.status === 'pending' ? (
                      <>
                        <button 
                            onClick={() => onAction('timeoff', req.id, 'approved')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium text-sm"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button 
                            onClick={() => onAction('timeoff', req.id, 'denied')}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition font-medium text-sm"
                        >
                            <XCircle className="w-4 h-4" /> Deny
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Open Shift Claims */}
      <section>
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700"><UserPlus className="w-5 h-5" /></div>
            <h3 className="text-lg font-bold text-gray-800">Shift Claims</h3>
        </div>

        {pendingClaims.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 p-8 rounded-2xl text-center text-gray-400">
            No pending shift claims
          </div>
        ) : (
          <div className="space-y-3">
            {pendingClaims.map(claim => {
              const emp = employees.find(e => e.id === claim.employeeId);
              const shift = shifts.find(s => s.id === claim.shiftId);
              if (!shift) return null;

              return (
                <div key={claim.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">{emp?.name} wants to claim:</h4>
                        <p className="text-sm text-gray-500">
                            {format(parseISO(shift.date), 'EEEE, MMM d')} ({shift.startTime} - {shift.endTime})
                        </p>
                        <p className="text-xs text-gray-400">Location: {shift.location} • Role: {shift.requiredRole}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {userMode === 'manager' && claim.status === 'pending' ? (
                      <>
                        <button 
                            onClick={() => onAction('claim', claim.id, 'approved')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium text-sm"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button 
                            onClick={() => onAction('claim', claim.id, 'denied')}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition font-medium text-sm"
                        >
                            <XCircle className="w-4 h-4" /> Deny
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${claim.status === 'pending' ? 'bg-amber-100 text-amber-700' : claim.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {claim.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default RequestQueue;
