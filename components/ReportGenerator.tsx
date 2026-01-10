
import React, { useMemo } from 'react';
import { Shift, Employee } from '../types';
import { calculateShiftHours } from '../utils/helpers';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Download, FileText, Share2, Users } from 'lucide-react';

interface ReportGeneratorProps {
  shifts: Shift[];
  employees: Employee[];
  weekDates: Date[];
  currentUser: Employee;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16'];

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ shifts, employees, currentUser }) => {
  
  const employeeHours = useMemo(() => {
    return employees.map(emp => {
      const empShifts = shifts.filter(s => s.assignedEmployeeId === emp.id);
      const hours = empShifts.reduce((acc, s) => acc + calculateShiftHours(s.startTime, s.endTime), 0);
      return { name: emp.name, hours };
    }).filter(eh => eh.hours > 0); // Only show active workers
  }, [shifts, employees]);

  const exportCSV = () => {
    const headers = ['Employee', 'Total Hours'];
    const rows = employeeHours.map(eh => [eh.name, eh.hours.toFixed(2)]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "weekly_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isManager = currentUser.role === 'manager';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-2xl font-bold text-gray-800">Weekly Summary</h3>
            <p className="text-sm text-gray-500">Reporting for current visible week</p>
        </div>
        <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
        >
            <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className={`grid grid-cols-1 ${isManager ? 'lg:grid-cols-2' : ''} gap-8`}>
        {/* Hours per Employee (Bar) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Total Hours by Worker
          </h4>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                  {employeeHours.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hour Distribution by Worker (Pie) - Restricted to Managers */}
        {isManager && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
            <h4 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Hour Distribution by Worker
            </h4>
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employeeHours}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="hours"
                  >
                    {employeeHours.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pt-8">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Total Hours</p>
                  <p className="text-2xl font-black text-gray-800">{employeeHours.reduce((a, b) => a + b.hours, 0).toFixed(1)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {employeeHours.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{r.name}</span>
                  </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;
