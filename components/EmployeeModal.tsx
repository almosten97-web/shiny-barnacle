
import React, { useState } from 'react';
import { Employee, UserRole } from '../types';
import { X, User, Shield, MapPin, Clock, Trash2, Briefcase } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSave: (emp: any) => void;
  onDelete?: (id: string) => void;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, employee, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    name: employee?.name || '',
    role: employee?.role || 'caregiver',
    locations: employee?.locations || ['Main Street'],
    maxHoursPerWeek: employee?.maxHoursPerWeek || 40,
    preferredHours: employee?.preferredHours || '',
    status: employee?.status || 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Please enter a name");
    onSave({
      ...employee,
      ...formData
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200 border border-white/20">
        <div className="bg-indigo-900 px-8 py-8 text-white flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="text-2xl font-black tracking-tight">{employee ? 'Edit Employee' : 'Add Team Member'}</h3>
                <p className="text-indigo-300 text-xs font-medium uppercase tracking-widest mt-1">Personnel Management</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all relative z-10">
                <X className="w-6 h-6" />
            </button>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Jane Doe"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold"
                />
              </div>
            </div>

            {/* Role & Max Hours */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Company Role</label>
                <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <select 
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none font-semibold"
                    >
                        <option value="manager">Manager</option>
                        <option value="caregiver">Caregiver</option>
                    </select>
                </div>
                </div>
                <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Max Hours / Wk</label>
                <div className="relative group">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                        type="number"
                        value={formData.maxHoursPerWeek}
                        onChange={(e) => setFormData({...formData, maxHoursPerWeek: Number(e.target.value)})}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold"
                    />
                </div>
                </div>
            </div>

            {/* Location Checkboxes (Simplified as select for now) */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Primary Location</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <select 
                    multiple
                    value={formData.locations}
                    onChange={(e) => {
                        // Fixed: cast option to HTMLOptionElement to access .value property safely in TypeScript
                        const values = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                        setFormData({...formData, locations: values});
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold min-h-[100px]"
                >
                    <option value="Main Street">Main Street</option>
                    <option value="West End">West End</option>
                    <option value="North Branch">North Branch</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>

            {/* Preferred Hours */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Shift Preferences</label>
              <div className="relative group">
                <Clock className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <textarea 
                    value={formData.preferredHours}
                    onChange={(e) => setFormData({...formData, preferredHours: e.target.value})}
                    placeholder="e.g. Prefers morning shifts, unavailable Thursdays..."
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold min-h-[120px] resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-100 mt-8">
            {employee && onDelete && (
                <button 
                    type="button"
                    onClick={() => onDelete(employee.id)}
                    className="p-4 text-rose-600 bg-rose-50 rounded-2xl hover:bg-rose-100 transition-all border border-rose-100"
                >
                    <Trash2 className="w-6 h-6" />
                </button>
            )}
            <button 
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black tracking-widest uppercase text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
                {employee ? 'Save Profile' : 'Add to Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;
