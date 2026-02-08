import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../supabase';

type ShiftDetailsRow = {
  id: string;
  notes: string | null;
  start_time: string;
  end_time: string;
  status: string;
  assigned_to: string | null;
};

const ShiftDetails: React.FC = () => {
  const { shiftId } = useParams<{ shiftId: string }>();
  const [shift, setShift] = useState<ShiftDetailsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadShift = async () => {
      if (!shiftId) {
        setError('Missing shift id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('shifts')
          .select('id, notes, start_time, end_time, status, assigned_to')
          .eq('id', shiftId)
          .single();

        if (!active) return;

        if (fetchError) {
          setError(fetchError.message);
          setShift(null);
        } else {
          setShift(data ?? null);
        }
      } catch (err) {
        if (!active) return;
        setError('Failed to load shift details.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadShift();

    return () => {
      active = false;
    };
  }, [shiftId]);

  return (
    <div className="space-y-4">
      <Link to="/schedule" className="inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700">
        &lt;- Back to Schedule
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Shift Details</h1>

      {loading && <p className="mt-4 text-sm text-slate-500">Loading shift details...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && shift && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Shift</h2>
          {shift.notes && <p className="mt-2 text-sm text-slate-600">{shift.notes}</p>}
          <div className="mt-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-700">Start:</span>{' '}
              {new Date(shift.start_time).toLocaleString()}
            </p>
            <p>
              <span className="font-medium text-slate-700">End:</span>{' '}
              {new Date(shift.end_time).toLocaleString()}
            </p>
            <p>
              <span className="font-medium text-slate-700">Status:</span> {shift.status}
            </p>
            <p>
              <span className="font-medium text-slate-700">Assigned To:</span>{' '}
              {shift.assigned_to ?? 'Unassigned'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftDetails;
