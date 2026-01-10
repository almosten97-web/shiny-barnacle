
import React, { useState, useMemo } from 'react';
import { Shift, Employee, UserRole } from '../types';
import { X, Calendar, Clock, MapPin, Shield, User, Trash2, AlertTriangle } from 'lucide-react';
import { format, parse, isAfter, isEqual } from 'date-fns';
import { isOverlapping } from '../utils/helpers';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  employees: Employee[];
  weekDates: Date[];
  onSave: (shift: any) => void;
  onDelete?: (id: string) => void;
  allShifts?: Shift[]; // Pass existing shifts to check for overlaps
}

const ShiftModal: React.FC<ShiftModalProps> = ({ 
  isOpen, 
  onClose, 
  shift, 
  employees, 
  weekDates, 
  onSave, 
  onDelete,
  allShifts = [] 
}) => {
  const [formData, setFormData] = useState({
    date: shift?.date || format(weekDates[0], 'yyyy-MM-dd'),
    startTime: shift?.startTime || '09:00',
    endTime: shift?.endTime || '17:00',
    location: shift?.location || 'Main Street',
    requiredRole: shift?.requiredRole || 'caregiver',
    assignedEmployeeId: shift?.assignedEmployeeId || '',
    status: shift?.status || 'scheduled'
  });

  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    const start = parse(formData.startTime, 'HH:mm', new Date());
    const end = parse(formData.endTime, 'HH:mm', new Date());

    // 1. End must be after start
    if (!isAfter(end, start) && !isEqual(start, end)) {
        // Handle overnight wrap-around check if we wanted to support it, 
        // but for standard shifts we'll enforce chronological order.
    }

    if (formData.startTime === formData.endTime) {
        return "Shift cannot have zero duration.";
    }

    // 2. Check for overlaps if assigned
    if (formData.assignedEmployeeId) {
        const overlaps = allShifts.filter(s => 
            s.id !== shift?.id && 
            s.assignedEmployeeId === formData.assignedEmployeeId && 
            s.date === formData.date &&
            isOverlapping(formData.startTime, formData.endTime, s.startTime, s.endTime)
        );
        if (overlaps.length > 0) {
            return "This employee already has an overlapping shift on this day.";
        }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
        setError(validationError);
        return;
    }

    onSave({
      ...shift,
      ...formData,
      assignedEmployeeId: formData.assignedEmployeeId || null,
      status: formData.assignedEmployeeId ? 'scheduled' : 'open'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-900 px-6 py-6 text-white flex justify-between items-center">
            <div>
                <h3 className="text-xl font-bold">{shift ? 'Edit Shift' : 'Create New Shift'}</h3>
                <p className="text-indigo-300 text-xs">Configure shift details and assignments</p>
            </div>
            <button 
              onClick={onClose} 
              aria-label="Close Modal"
              className="p-3 hover:bg-white/10 rounded-full transition active:scale-90"
            >
                <X className="w-6 h-6" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 items-center animate-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Date Selection */}
            <div className="relative">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                <select 
                    value={formData.date}
                    onChange={(e) => { setFormData({...formData, date: e.target.value}); setError(null); }}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition appearance-none font-medium h-12"
                >
                    {weekDates.map(d => (
                        <option key={format(d, 'yyyy-MM-dd')} value={format(d, 'yyyy-MM-dd')}>
                            {format(d, 'EEEE, MMM d')}
                        </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Start</label>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                    <input 
                        type="time" 
                        value={formData.startTime}
                        onChange={(e) => { setFormData({...formData, startTime: e.target.value}); setError(null); }}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium h-12"
                    />
                </div>
              </div>
              <div className="relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">End</label>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                    <input 
                        type="time" 
                        value={formData.endTime}
                        onChange={(e) => { setFormData({...formData, endTime: e.target.value}); setError(null); }}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium h-12"
                    />
                </div>
              </div>
            </div>

            {/* Location & Role */}
            <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Location</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                    <select 
                        value={formData.location}
                        onChange={(e) => { setFormData({...formData, location: e.target.value}); setError(null); }}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition appearance-none font-medium h-12"
                    >
                        <option value="Main Street">Main Street</option>
                        <option value="West End">West End</option>
                        <option value="North Branch">North Branch</option>
                    </select>
                </div>
                </div>
                <div className="relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Role</label>
                <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                    <select 
                        value={formData.requiredRole}
                        onChange={(e) => { setFormData({...formData, requiredRole: e.target.value as UserRole}); setError(null); }}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition appearance-none font-medium h-12"
                    >
                        <option value="manager">Manager</option>
                        <option value="caregiver">Caregiver</option>
                    </select>
                </div>
                </div>
            </div>

            {/* Assignment */}
            <div className="relative">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Assign Employee</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                <select 
                    value={formData.assignedEmployeeId}
                    onChange={(e) => { setFormData({...formData, assignedEmployeeId: e.target.value}); setError(null); }}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition appearance-none font-medium h-12"
                >
                    <option value="">Leave as Open Shift</option>
                    {employees.filter(e => e.status === 'active').map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            {shift && onDelete && (
                <button 
                    type="button"
                    onClick={() => onDelete(shift.id)}
                    aria-label="Delete this shift"
                    className="p-3.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition active:scale-95"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            )}
            <button 
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition active:scale-[0.98] shadow-lg shadow-indigo-100"
            >
                {shift ? 'Update Shift' : 'Create Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal;
