import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ShiftCard from './ShiftCard';
import { supabase } from '../supabase';

type ShiftRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: 'open' | 'pending' | 'confirmed';
};

const Schedules: React.FC = () => {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShifts = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('shifts')
      .select('id, title, description, start_time, end_time, status')
      .eq('status', 'open')
      .order('start_time', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setShifts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchShifts();

    const channel = supabase
      .channel('shifts-open')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          fetchShifts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-6">
      <Link to="/" className="mb-4 inline-block text-blue-600 hover:text-blue-700">
        ← Back to Dashboard
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Shift Schedules</h1>
      <p className="mt-2 text-slate-600">View and manage all shift schedules here.</p>
      <div className="mt-6 grid gap-4">
        {loading && <p className="text-sm text-slate-500">Loading shifts...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && shifts.length === 0 && (
          <p className="text-sm text-slate-500">No open shifts available.</p>
        )}
        {shifts.map((shift) => (
          <ShiftCard
            key={shift.id}
            shiftId={shift.id}
            title={shift.title}
            description={shift.description}
            start_time={shift.start_time}
            end_time={shift.end_time}
            status={shift.status}
          />
        ))}
      </div>
    </div>
  );
};

export default Schedules;
