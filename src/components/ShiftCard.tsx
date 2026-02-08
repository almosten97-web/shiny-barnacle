import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

type ShiftCardProps = {
  shiftId: string;
  notes?: string | null;
  start_time: string;
  end_time: string;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
};

const ShiftCard: React.FC<ShiftCardProps> = ({ shiftId, notes, start_time, end_time, status }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({ claim: false, swap: false, details: false });
  const [localStatus, setLocalStatus] = useState(status);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleClaim = async () => {
    setActionError(null);
    setLoading((prev) => ({ ...prev, claim: true }));
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('User must be logged in to claim a shift.');

      const { error: claimError } = await supabase
        .from('shifts')
        .update({ status: 'assigned', assigned_to: userData.user.id, assigned_user_id: userData.user.id })
        .eq('id', shiftId);

      if (claimError) throw claimError;
      setLocalStatus('assigned');
    } catch (error) {
      console.error(error);
      setActionError('Unable to claim this shift. Please try again.');
    } finally {
      setLoading((prev) => ({ ...prev, claim: false }));
    }
  };

  const handleSwap = async () => {
    setActionError(null);
    setLoading((prev) => ({ ...prev, swap: true }));
    try {
      console.log(`Requesting swap for ${shiftId}`);
    } finally {
      setLoading((prev) => ({ ...prev, swap: false }));
    }
  };

  const handleDetails = async () => {
    setActionError(null);
    setLoading((prev) => ({ ...prev, details: true }));
    try {
      navigate(`/shifts/${shiftId}`);
    } finally {
      setLoading((prev) => ({ ...prev, details: false }));
    }
  };

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-slate-900">Shift</h3>
        {notes && <p className="text-sm text-slate-600">{notes}</p>}
        <p className="text-sm text-slate-600">
          {new Date(start_time).toLocaleString()} - {new Date(end_time).toLocaleString()}
        </p>
        <p className="text-xs text-slate-400">Status: {localStatus}</p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={handleClaim}
          disabled={loading.claim || localStatus !== 'open'}
          className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
        >
          {loading.claim ? 'Claiming...' : 'Claim'}
        </button>

        <button
          type="button"
          onClick={handleSwap}
          disabled={loading.swap}
          className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading.swap ? 'Requesting...' : 'Request Swap'}
        </button>

        <button
          type="button"
          onClick={handleDetails}
          disabled={loading.details}
          className="inline-flex w-full items-center justify-center px-2 py-2 text-sm font-medium text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading.details ? 'Loading...' : 'Details'}
        </button>
      </div>
      {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
    </div>
  );
};

export default ShiftCard;
