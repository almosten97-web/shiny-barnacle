import React, { useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { supabase } from '../supabase';
import { getLocalTimeZone, isSameLocalCalendarDay } from '../lib/datetime';
import { mapDataError } from '../lib/error-mapping';
import { invalidateCachedQuery, setCachedQueryData, useCachedQuery } from '../lib/query-cache';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  status: 'draft' | 'open' | 'assigned' | 'completed' | 'cancelled';
  notes?: string;
}

interface EmployeeDashboardProps {
  employee: Profile;
}

interface EmployeeDashboardData {
  shifts: Shift[];
  requestedShiftIds: string[];
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee }) => {
  const [confirmingShiftId, setConfirmingShiftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const queryKey = ['employee-dashboard', employee.id] as const;

  const {
    data,
    error: queryError,
    isLoading,
  } = useCachedQuery<EmployeeDashboardData>({
    queryKey,
    staleTime: 45_000,
    queryFn: async () => {
      const [shiftResult, requestResult] = await Promise.all([
        supabase.from('shifts').select('id, start_time, end_time, status, notes').neq('status', 'draft').order('start_time', { ascending: true }),
        supabase.from('shift_requests').select('shift_id').eq('user_id', employee.id),
      ]);

      if (shiftResult.error) {
        throw new Error(shiftResult.error.message);
      }

      if (requestResult.error) {
        throw new Error(requestResult.error.message);
      }

      return {
        shifts: (shiftResult.data || []) as Shift[],
        requestedShiftIds: (requestResult.data || []).map((request) => request.shift_id).filter(Boolean),
      };
    },
  });

  const shifts = data?.shifts || [];
  const requestedShiftIds = new Set(data?.requestedShiftIds || []);

  const handleConfirmShift = async (shiftId: string) => {
    setError(null);
    setConfirmingShiftId(shiftId);

    const previous = data;

    setCachedQueryData<EmployeeDashboardData>(queryKey, (current) => {
      if (!current) return current;
      if (current.requestedShiftIds.includes(shiftId)) return current;
      return {
        ...current,
        requestedShiftIds: [...current.requestedShiftIds, shiftId],
      };
    });

    const { error: requestError } = await supabase.from('shift_requests').insert([
      {
        shift_id: shiftId,
        user_id: employee.id,
        status: 'pending',
      },
    ]);

    if (requestError) {
      if (previous) {
        setCachedQueryData(queryKey, previous);
      }
      setError(mapDataError(requestError.message));
    } else {
      invalidateCachedQuery(queryKey);
    }

    setConfirmingShiftId(null);
  };

  const shiftsByDay = useMemo(() => {
    return weekDates.map((date) => ({
      date,
      shifts: shifts.filter((shift) => isSameLocalCalendarDay(shift.start_time, date)),
    }));
  }, [shifts, weekDates]);

  const combinedError = error || queryError;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Charleen's Scheduling App</p>
            <h1 className="text-3xl font-bold text-slate-900">Welcome, {employee.full_name}</h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Times shown in {getLocalTimeZone()}</p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p className="font-bold text-slate-700">{employee.role}</p>
            <p>ID: {employee.id.slice(0, 8)}...</p>
          </div>
        </header>

        {combinedError && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert" aria-live="polite">
            {combinedError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Weekly Schedule</h2>

            {isLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading shifts...</div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {shiftsByDay.map(({ date, shifts: dayShifts }) => (
                  <div key={date.toString()} className="flex min-h-[150px] flex-col rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="border-b border-slate-100 p-2 text-center">
                      <p className="text-[10px] font-bold uppercase text-slate-400">{format(date, 'EEE')}</p>
                      <p className="text-sm font-bold text-slate-800">{format(date, 'd')}</p>
                    </div>

                    <div className="space-y-2 p-2">
                      {dayShifts.map((shift) => {
                        const isRequested = requestedShiftIds.has(shift.id);
                        return (
                          <div key={shift.id} className="rounded-lg border border-slate-200 bg-white p-2 text-[10px] shadow-sm">
                            <p className="font-bold text-slate-900">
                              {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
                            </p>

                            {shift.status === 'open' && !isRequested ? (
                              <button
                                onClick={() => handleConfirmShift(shift.id)}
                                disabled={Boolean(confirmingShiftId)}
                                className="mt-2 w-full rounded bg-slate-900 p-1 font-bold uppercase tracking-tighter text-white disabled:opacity-50"
                              >
                                {confirmingShiftId === shift.id ? '...' : 'Claim'}
                              </button>
                            ) : (
                              <p className="mt-2 font-bold uppercase text-emerald-600">{isRequested ? 'Requested' : shift.status}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Notice</p>
              <p className="text-sm leading-relaxed">
                Publishing your availability helps managers assign you more shifts. Tap any "Claim" button to request an open slot.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
