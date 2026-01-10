
import React, { useMemo } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { Shift, Employee, Conflict, UserRole } from '../types';
import { calculateShiftHours, isOverlapping } from '../utils/helpers';
import { AlertCircle, User, MapPin, Clock, Tag, ArrowRightLeft } from 'lucide-react';

interface ScheduleViewProps {
  shifts: Shift[];
  employees: Employee[];
  weekDates: Date[];
  userMode: 'manager' | 'employee';
  currentUser: Employee;
  onShiftClick: (shift: Shift) => void;
  onClaimShift: (shift: Shift) => void;
  onRequestSwap: (shift: Shift) => void;
}

const roleColors: Record<string, string> = {
    manager: 'bg-blue-100 text-blue-700 border-blue-200',
    caregiver: 'bg-teal-100 text-teal-700 border-teal-200'
};

const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  shifts, 
  employees, 
  weekDates, 
  userMode, 
  currentUser,
  onShiftClick,
  onClaimShift,
  onRequestSwap
}) => {

  const getShiftConflicts = (shift: Shift): Conflict[] => {
    const conflicts: Conflict[] = [];
    
    // 1. Check for unassigned
    if (!shift.assignedEmployeeId) {
      conflicts.push({ type: 'unassigned', message: 'Shift is currently unassigned', severity: 'warning' });
      return conflicts;
    }

    const employee = employees.find(e => e.id === shift.assignedEmployeeId);
    if (!employee) return conflicts;

    // 2. Check for role mismatch
    if (employee.role !== shift.requiredRole) {
      conflicts.push({ type: 'role-mismatch', message: `Employee role (${employee.role}) doesn't match shift role (${shift.requiredRole})`, severity: 'error' });
    }

    // 3. Check for overlapping shifts for same employee
    const overlaps = shifts.filter(s => 
      s.id !== shift.id && 
      s.assignedEmployeeId === shift.assignedEmployeeId && 
      s.date === shift.date &&
      isOverlapping(shift.startTime, shift.endTime, s.startTime, s.endTime)
    );
    if (overlaps.length > 0) {
      conflicts.push({ type: 'overlap', message: 'Schedule overlap with another shift', severity: 'error' });
    }

    // 4. Weekly hours check
    const weekShifts = shifts.filter(s => s.assignedEmployeeId === shift.assignedEmployeeId);
    const totalHours = weekShifts.reduce((acc, s) => acc + calculateShiftHours(s.startTime, s.endTime), 0);
    if (totalHours > employee.maxHoursPerWeek) {
      conflicts.push({ type: 'over-hours', message: `Exceeds employee max hours (${employee.maxHoursPerWeek}h)`, severity: 'warning' });
    }

    return conflicts;
  };

  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 min-w-[1200px] md:min-w-0">
        {weekDates.map((date, idx) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayShifts = shifts.filter(s => s.date === dateStr);
          const isToday = isSameDay(date, new Date());

          return (
            <div key={idx} className="flex flex-col gap-3 min-w-[160px]">
              <div 
                className={`text-center p-3 rounded-lg border ${isToday ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 shadow-sm'}`}
                aria-current={isToday ? 'date' : undefined}
              >
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{format(date, 'eee')}</p>
                <p className={`text-xl font-bold ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>{format(date, 'd')}</p>
              </div>

              <div className="flex-1 space-y-3">
                {dayShifts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    No shifts
                  </div>
                ) : (
                  dayShifts.map(shift => {
                    const conflicts = getShiftConflicts(shift);
                    const isError = conflicts.some(c => c.severity === 'error');
                    const isWarning = conflicts.some(c => c.severity === 'warning');
                    const assignedEmp = employees.find(e => e.id === shift.assignedEmployeeId);
                    
                    // Filter for employee view
                    if (userMode === 'employee' && shift.assignedEmployeeId !== currentUser.id && shift.status !== 'open') {
                      return null;
                    }

                    return (
                      <div 
                        key={shift.id}
                        onClick={() => onShiftClick(shift)}
                        role="button"
                        aria-label={`Shift at ${shift.startTime} to ${shift.endTime} at ${shift.location} assigned to ${assignedEmp?.name || 'Open'}`}
                        className={`
                          group relative bg-white rounded-xl border-2 p-3 transition cursor-pointer hover:shadow-md
                          ${isError ? 'border-red-400 shadow-red-50/50' : isWarning ? 'border-amber-400 shadow-amber-50/50' : 'border-transparent shadow-sm'}
                          ${shift.status === 'open' ? 'border-dashed border-indigo-300 bg-indigo-50/30' : ''}
                        `}
                      >
                        {/* Conflict Badge */}
                        {conflicts.length > 0 && userMode === 'manager' && (
                          <div 
                            className={`absolute -top-2 -right-2 p-1.5 rounded-full shadow-lg ${isError ? 'bg-red-500' : 'bg-amber-500'}`}
                            title={conflicts.map(c => c.message).join(', ')}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${roleColors[shift.requiredRole] || 'bg-gray-100 text-gray-600'}`}>
                              {shift.requiredRole}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {shift.startTime} - {shift.endTime}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${shift.assignedEmployeeId ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400 border-dashed border-2 border-gray-300'}`}>
                              {shift.assignedEmployeeId ? <User className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${shift.assignedEmployeeId ? 'text-gray-900' : 'text-indigo-600 italic'}`}>
                                {assignedEmp ? assignedEmp.name : 'Open Shift'}
                              </p>
                              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" />
                                {shift.location}
                              </p>
                            </div>
                          </div>

                          {userMode === 'employee' && shift.status === 'open' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onClaimShift(shift); }}
                              aria-label="Claim this open shift"
                              className="mt-2 w-full py-2.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition active:scale-[0.98]"
                            >
                              Claim Shift
                            </button>
                          )}

                          {userMode === 'employee' && shift.assignedEmployeeId === currentUser.id && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onRequestSwap(shift); }}
                              aria-label="Request to swap this shift"
                              className="mt-2 w-full py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Request Swap
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleView;
