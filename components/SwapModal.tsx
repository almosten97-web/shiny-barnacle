
import React, { useState } from 'react';
import { Shift, Employee } from '../types';
import { X, ArrowRightLeft, Calendar, User, Clock, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceShift: Shift;
  shifts: Shift[];
  employees: Employee[];
  currentUser: Employee;
  onPropose: (requestingShiftId: string, targetShiftId: string, targetEmployeeId: string) => void;
}

const SwapModal: React.FC<SwapModalProps> = ({ 
  isOpen, 
  onClose, 
  sourceShift, 
  shifts, 
  employees, 
  currentUser, 
  onPropose 
}) => {
  const [selectedTargetShiftId, setSelectedTargetShiftId] = useState<string>('');

  if (!isOpen) return null;

  // Potential shifts to swap with:
  // 1. Must be assigned to someone else
  // 2. Ideally should match roles or locations (optional check)
  // 3. Must not be the source shift itself
  const eligibleShifts = shifts.filter(s => 
    s.id !== sourceShift.id && 
    s.assignedEmployeeId !== null && 
    s.assignedEmployeeId !== currentUser.id &&
    s.requiredRole === sourceShift.requiredRole // Basic matching
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetShift = eligibleShifts.find(s => s.id === selectedTargetShiftId);
    if (targetShift && targetShift.assignedEmployeeId) {
      onPropose(sourceShift.id, targetShift.id, targetShift.assignedEmployeeId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-900 px-6 py-6 text-white flex justify-between items-center">
            <div>
                <h3 className="text-xl font-bold">Propose Shift Swap</h3>
                <p className="text-indigo-300 text-xs">Select a colleague's shift to swap with</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-6">
          <div className="bg-indigo-50 p-4 rounded-2xl mb-6 border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Your Shift</p>
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-indigo-900">{format(parseISO(sourceShift.date), 'EEEE, MMM d')}</h4>
                    <p className="text-sm text-indigo-700">{sourceShift.startTime} - {sourceShift.endTime} • {sourceShift.location}</p>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                    <Calendar className="w-5 h-5" />
                </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Choose a shift to swap with</label>
              {eligibleShifts.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm italic">
                  No compatible shifts found to swap with.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-auto pr-2 custom-scrollbar">
                  {eligibleShifts.map(s => {
                    const emp = employees.find(e => e.id === s.assignedEmployeeId);
                    const isSelected = selectedTargetShiftId === s.id;
                    return (
                      <div 
                        key={s.id}
                        onClick={() => setSelectedTargetShiftId(s.id)}
                        className={`
                          cursor-pointer p-4 rounded-xl border-2 transition
                          ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-600">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-900">{emp?.name}</p>
                                <p className="text-[10px] text-gray-500">{format(parseISO(s.date), 'MMM d')} • {s.startTime}-{s.endTime}</p>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100">
                <button 
                  type="submit"
                  disabled={!selectedTargetShiftId}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                  Propose Swap
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SwapModal;
