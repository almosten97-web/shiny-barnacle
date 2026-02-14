import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { supabase } from '../supabase';
import { useCachedQuery } from '../lib/query-cache';
import { formatLocalDateTimeWithZone, getLocalTimeZone } from '../lib/datetime';
import { mapDataError } from '../lib/error-mapping';

type SharedType = 'clients' | 'caregivers';

interface SharedRow {
  entity_id: string;
  entity_label: string;
  visit_id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  caregiver_name: string;
}

interface SharedPayload {
  entityId: string;
  entityLabel: string;
  visits: SharedRow[];
}

const SharedCalendarView: React.FC = () => {
  const { type, token } = useParams<{ type: SharedType; token: string }>();
  const validType = type === 'clients' || type === 'caregivers';

  const { data, error, isLoading } = useCachedQuery<SharedPayload | null>({
    queryKey: ['shared-calendar', type || 'unknown', token || 'missing'],
    enabled: Boolean(validType && token),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!validType || !token) {
        throw new Error('Invalid share link.');
      }

      const { data: rows, error: rpcError } = await supabase.rpc('get_shared_calendar', {
        share_type: type,
        share_token: token,
      });

      if (rpcError) {
        throw new Error(mapDataError(rpcError.message));
      }

      const safeRows = (rows || []) as SharedRow[];
      if (safeRows.length === 0) return null;

      return {
        entityId: safeRows[0].entity_id,
        entityLabel: safeRows[0].entity_label,
        visits: safeRows,
      };
    },
  });

  const events = useMemo(() => {
    return (data?.visits || []).map((visit) => ({
      id: visit.visit_id,
      title: `${visit.client_name} - ${visit.caregiver_name}`,
      start: visit.start_time,
      end: visit.end_time,
    }));
  }, [data?.visits]);

  if (!validType) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-rose-700">Invalid shared view type.</p>
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-slate-700 underline">
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Charleen's Scheduling App</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{data?.entityLabel || 'Shared Schedule'}</h1>
          <p className="mt-1 text-sm text-slate-600">Times shown in {getLocalTimeZone()}</p>
        </header>

        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading shared schedule...</div>
        )}

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {!isLoading && !error && !data && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            This share link is invalid or has expired.
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              editable={false}
              events={events}
              height="auto"
            />
            {data.visits.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Next visit: {formatLocalDateTimeWithZone(data.visits[0].start_time)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedCalendarView;
