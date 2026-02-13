import React, { useState } from 'react';
import { supabase } from '../supabase';
import { formatLocalDateTimeWithZone } from '../lib/datetime';
import { mapDataError } from '../lib/error-mapping';
import { invalidateCachedQuery, useCachedQuery } from '../lib/query-cache';

interface PendingClaimRow {
  id: string;
  shift_id: string;
  user_id: string;
  status: string;
  request_type?: string | null;
  created_at: string;
  shifts?: {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
  } | {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
  }[] | null;
  profiles?: {
    id: string;
    full_name: string | null;
    role: string | null;
  } | null;
}

const claimsQueryKey = ['pending-coverage-claims'] as const;

const PendingClaimsPanel: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [approvingClaimId, setApprovingClaimId] = useState<string | null>(null);

  const {
    data: claims = [],
    isLoading,
    refetch,
    error: queryError,
  } = useCachedQuery<PendingClaimRow[]>({
    queryKey: claimsQueryKey,
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error: requestError } = await supabase
        .from('shift_requests')
        .select(`
          id,
          shift_id,
          user_id,
          status,
          request_type,
          created_at,
          shifts:shift_id (id, start_time, end_time, status),
          profiles:profiles!shift_requests_user_id_fkey (id, full_name, role)
        `)
        .eq('request_type', 'coverage')
        .eq('status', 'claimed')
        .order('created_at', { ascending: true });

      if (requestError) throw new Error(requestError.message);
      return (data || []) as PendingClaimRow[];
    },
  });

  const resolveShift = (claim: PendingClaimRow) => {
    if (!claim.shifts) return null;
    return Array.isArray(claim.shifts) ? claim.shifts[0] || null : claim.shifts;
  };

  const approveClaim = async (claimId: string) => {
    setError(null);
    setApprovingClaimId(claimId);

    const { error: updateError } = await supabase
      .from('shift_requests')
      .update({ status: 'approved' })
      .eq('id', claimId)
      .eq('status', 'claimed');

    if (updateError) {
      setError(mapDataError(updateError.message));
      setApprovingClaimId(null);
      return;
    }

    invalidateCachedQuery(claimsQueryKey);
    await refetch();
    setApprovingClaimId(null);
  };

  const combinedError = error || queryError;

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="border-b border-emerald-50 p-6">
        <h2 className="font-bold text-emerald-900">Pending Claims</h2>
        <p className="mt-1 text-sm text-emerald-700">Coverage claims waiting for manager approval.</p>
      </div>

      {combinedError && (
        <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert" aria-live="polite">
          {combinedError}
        </div>
      )}

      <div className="overflow-x-auto p-6 pt-4">
        <table className="w-full text-left">
          <thead className="bg-emerald-50/50 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            <tr>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Requester Role</th>
              <th className="px-4 py-3">Shift Window</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-emerald-500">
                  Loading claims...
                </td>
              </tr>
            ) : claims.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-emerald-500">
                  No claimed coverage requests pending approval.
                </td>
              </tr>
            ) : (
              claims.map((claim) => {
                const shift = resolveShift(claim);
                const requesterName = claim.profiles?.full_name?.trim() || 'Caregiver';
                const requesterRole = (claim.profiles?.role || 'employee').toLowerCase();
                return (
                  <tr key={claim.id} className="transition-colors hover:bg-emerald-50/30">
                    <td className="px-4 py-4 font-semibold text-emerald-900">{requesterName}</td>
                    <td className="px-4 py-4 text-sm capitalize text-emerald-700">{requesterRole}</td>
                    <td className="px-4 py-4 text-sm text-emerald-700">
                      {shift
                        ? `${formatLocalDateTimeWithZone(shift.start_time)} - ${formatLocalDateTimeWithZone(shift.end_time)}`
                        : 'Unavailable'}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => {
                          void approveClaim(claim.id);
                        }}
                        disabled={approvingClaimId === claim.id}
                        className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {approvingClaimId === claim.id ? 'Approving...' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingClaimsPanel;
