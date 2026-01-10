
import React from 'react';
import { Employee, UserRole } from '../types';
// Added Users to the lucide-react import
import { Mail, Phone, Briefcase, MapPin, Edit3, Shield, User, Users } from 'lucide-react';

interface EmployeeManagerProps {
  employees: Employee[];
  userMode: 'manager' | 'employee';
  onEditEmployee: (emp: Employee) => void;
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ employees, userMode, onEditEmployee }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.filter(e => e.status === 'active').map(emp => (
          <div key={emp.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className={`h-2 ${emp.role === 'manager' ? 'bg-indigo-600' : 'bg-emerald-500'}`} />
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-700 border border-indigo-100">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg leading-tight">{emp.name}</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 inline-block ${emp.role === 'manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {emp.role}
                    </span>
                  </div>
                </div>
                {userMode === 'manager' && (
                  <button 
                    onClick={() => onEditEmployee(emp)}
                    className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <div className="p-1.5 bg-gray-50 rounded-lg"><MapPin className="w-4 h-4 text-gray-400" /></div>
                  <span className="truncate">{emp.locations.join(', ') || 'Global'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <div className="p-1.5 bg-gray-50 rounded-lg"><Briefcase className="w-4 h-4 text-gray-400" /></div>
                  <span>Max {emp.maxHoursPerWeek}h / week</span>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Availability Preferences</p>
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-sm text-gray-700 italic leading-relaxed">"{emp.preferredHours || 'No specific preferences listed.'}"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {employees.filter(e => e.status === 'active').length === 0 && (
          <div className="col-span-full py-20 text-center bg-white border border-dashed border-gray-200 rounded-3xl">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No active team members found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeManager;
