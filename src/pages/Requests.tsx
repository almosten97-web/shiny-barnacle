import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface ShiftRequestRow {
  id: string;
  shift_id: string | null;
  user_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string | null;
  shifts?: { start_time: string; end_time: string } | null;
  profiles?: { full_name: string | null; email: string } | null;
}

interface VisitRequestRow {
  id: string;
  visit_id: string | null;
  caregiver_id: string | null;
  status: string | null;
  created_at: string | null;
  visits?: { start_time: string; end_time: string } | null;
  profiles?: { full_name: string | null; email: string } | null;
}

const Requests: React.FC = () => {
  const [shiftRequests, setShiftRequests] = useState<ShiftRequestRow[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [shiftResponse, visitResponse] = await Promise.all([
        supabase
          .from('shift_requests')
          .select('id, shift_id, user_id, status, created_at, shifts(start_time, end_time), profiles(full_name, email)')
          .order('created_at', { ascending: false }),
        supabase
          .from('visit_requests')
          .select('id, visit_id, caregiver_id, status, created_at, visits(start_time, end_time), profiles(full_name, email)')
          .order('created_at', { ascending: false })
      ]);

      if (shiftResponse.error) throw shiftResponse.error;
      if (visitResponse.error) throw visitResponse.error;

      setShiftRequests(shiftResponse.data ?? []);
      setVisitRequests(visitResponse.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleShiftDecision = async (id: string, status: 'approved' | 'rejected') => {
    const { error: updateError } = await supabase.from('shift_requests').update({ status }).eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadRequests();
  };

  const handleVisitDecision = async (id: string, status: 'approved' | 'rejected') => {
    const { error: updateError } = await supabase.from('visit_requests').update({ status }).eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadRequests();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Requests</h2>
        <p className="text-sm text-slate-500">Approve shift and visit requests.</p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Shift requests</h3>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading shift requests...</p>
          ) : (
            <div className="mt-4 space-y-4">
              {shiftRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {request.profiles?.full_name || request.profiles?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {request.shifts
                      ? `${new Date(request.shifts.start_time).toLocaleString()} - ${new Date(request.shifts.end_time).toLocaleString()}`
                      : 'Shift details unavailable'}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleShiftDecision(request.id, 'approved')}
                      className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiftDecision(request.id, 'rejected')}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                    >
                      Reject
                    </button>
                    <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
              {shiftRequests.length === 0 && <p className="text-sm text-slate-500">No shift requests.</p>}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Visit requests</h3>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading visit requests...</p>
          ) : (
            <div className="mt-4 space-y-4">
              {visitRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {request.profiles?.full_name || request.profiles?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {request.visits
                      ? `${new Date(request.visits.start_time).toLocaleString()} - ${new Date(request.visits.end_time).toLocaleString()}`
                      : 'Visit details unavailable'}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleVisitDecision(request.id, 'approved')}
                      className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVisitDecision(request.id, 'rejected')}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                    >
                      Reject
                    </button>
                    <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
              {visitRequests.length === 0 && <p className="text-sm text-slate-500">No visit requests.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Requests;
