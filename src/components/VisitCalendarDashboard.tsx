import React, { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import { DatesSetArg, EventDropArg } from '@fullcalendar/core';
import { supabase } from '../supabase';
import { formatLocalDateTimeWithZone, getLocalTimeZone, toUtcISOString } from '../lib/datetime';
import { mapDataError } from '../lib/error-mapping';
import { invalidateCachedQuery, setCachedQueryData, useCachedQuery } from '../lib/query-cache';

type Perspective = 'client' | 'caregiver';

interface ClientOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface CaregiverOption {
  id: string;
  full_name: string | null;
  color_code?: string | null;
  sharing_token?: string | null;
}

interface VisitRow {
  id: string;
  client_id: string | null;
  caregiver_id: string | null;
  start_time: string;
  end_time: string;
  notes?: string | null;
  status?: string | null;
  clients?: (ClientOption & { sharing_token?: string | null }) | (ClientOption & { sharing_token?: string | null })[] | null;
  profiles?: CaregiverOption | CaregiverOption[] | null;
}

interface DashboardData {
  visits: VisitRow[];
  clients: ClientOption[];
  caregivers: CaregiverOption[];
}

interface ShiftRow {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string | null;
}

interface ShiftRequestRow {
  id: string;
  shift_id: string;
  user_id: string;
  status: string;
  request_type?: string | null;
  shifts?: ShiftRow | ShiftRow[] | null;
  profiles?: {
    id: string;
    full_name: string | null;
    role: string | null;
  } | null;
}

interface CaregiverCoverageData {
  role: string;
  myShifts: ShiftRow[];
  myCoverageRequests: ShiftRequestRow[];
  pendingCoverageRequests: ShiftRequestRow[];
}

const buildDashboardQueryKey = (lockedPerspective?: Perspective, lockedCaregiverId?: string) =>
  ['calendar-dashboard', lockedPerspective || 'unlocked', lockedCaregiverId || 'all'] as const;
const FALLBACK_COLORS = ['#1D4ED8', '#0F766E', '#C2410C', '#15803D', '#9A3412', '#0369A1'];
const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const displayClientName = (client?: ClientOption | null) => {
  const fullName = `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim();
  return fullName || 'Unknown Client';
};

const displayCaregiverName = (caregiver?: CaregiverOption | null) => {
  return caregiver?.full_name?.trim() || 'Unassigned Caregiver';
};

const getVisitClient = (visit?: VisitRow | null): (ClientOption & { sharing_token?: string | null }) | null => {
  if (!visit?.clients) return null;
  return Array.isArray(visit.clients) ? visit.clients[0] || null : visit.clients;
};

const getVisitCaregiver = (visit?: VisitRow | null): CaregiverOption | null => {
  if (!visit?.profiles) return null;
  return Array.isArray(visit.profiles) ? visit.profiles[0] || null : visit.profiles;
};

const LOCKED_STATUSES = new Set(['completed', 'cancelled', 'canceled']);

const isVisitEditable = (visit?: VisitRow | null) => {
  if (!visit) return false;
  const status = (visit.status || '').toLowerCase();
  if (LOCKED_STATUSES.has(status)) return false;
  return new Date(visit.start_time).getTime() > Date.now();
};

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface VisitCalendarDashboardProps {
  title: string;
  subtitle?: string;
  embedded?: boolean;
  allowShiftManagement?: boolean;
  lockedPerspective?: Perspective;
  lockedCaregiverId?: string;
}

const VisitCalendarDashboard: React.FC<VisitCalendarDashboardProps> = ({
  title,
  subtitle,
  embedded = false,
  allowShiftManagement = false,
  lockedPerspective,
  lockedCaregiverId,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<Perspective>('client');
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [selectedCaregiverId, setSelectedCaregiverId] = useState('all');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isCreatingShift, setIsCreatingShift] = useState(false);
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [isDeletingShift, setIsDeletingShift] = useState(false);
  const [newShiftClientId, setNewShiftClientId] = useState('');
  const [newShiftCaregiverId, setNewShiftCaregiverId] = useState('');
  const [newShiftDate, setNewShiftDate] = useState('');
  const [newShiftStartTime, setNewShiftStartTime] = useState('09:00');
  const [newShiftEndTime, setNewShiftEndTime] = useState('10:00');
  const [newShiftNotes, setNewShiftNotes] = useState('');
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatUntilDate, setRepeatUntilDate] = useState('');
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [currentCalendarView, setCurrentCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [currentCalendarRangeLabel, setCurrentCalendarRangeLabel] = useState<string>('');
  const [requestingCoverageShiftId, setRequestingCoverageShiftId] = useState<string | null>(null);
  const [claimingCoverageRequestId, setClaimingCoverageRequestId] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const dashboardQueryKey = useMemo(
    () => buildDashboardQueryKey(lockedPerspective, lockedCaregiverId),
    [lockedPerspective, lockedCaregiverId]
  );

  const {
    data: dashboardData,
    error: queryError,
    isLoading,
    isFetching,
    refetch,
  } = useCachedQuery<DashboardData>({
    queryKey: dashboardQueryKey,
    staleTime: 60_000,
    queryFn: async () => {
      const visitsQuery = supabase
        .from('visits')
        .select(`
          id,
          client_id,
          caregiver_id,
          start_time,
          end_time,
          status,
          notes,
          clients:client_id (id, first_name, last_name, sharing_token),
          profiles:caregiver_id (id, full_name, color_code, sharing_token)
        `)
        .order('start_time', { ascending: true });

      if (lockedPerspective === 'caregiver' && lockedCaregiverId) {
        const [visitsResponse, caregiverResponse] = await Promise.all([
          visitsQuery.eq('caregiver_id', lockedCaregiverId),
          supabase.from('profiles').select('id, full_name, color_code, sharing_token').eq('id', lockedCaregiverId).limit(1),
        ]);

        if (visitsResponse.error) {
          throw new Error(visitsResponse.error.message);
        }

        const caregiver = ((caregiverResponse.data || [])[0] || null) as CaregiverOption | null;
        const scopedVisits = (visitsResponse.data || []) as VisitRow[];

        const clientMap = new Map<string, ClientOption>();
        const caregiverMap = new Map<string, CaregiverOption>();

        if (caregiver?.id) {
          caregiverMap.set(caregiver.id, caregiver);
        }

        scopedVisits.forEach((visit) => {
          const client = getVisitClient(visit);
          if (client?.id) {
            clientMap.set(client.id, {
              id: client.id,
              first_name: client.first_name,
              last_name: client.last_name,
            });
          }

          const visitCaregiver = getVisitCaregiver(visit);
          if (visitCaregiver?.id && !caregiverMap.has(visitCaregiver.id)) {
            caregiverMap.set(visitCaregiver.id, {
              id: visitCaregiver.id,
              full_name: visitCaregiver.full_name,
              color_code: visitCaregiver.color_code,
              sharing_token: visitCaregiver.sharing_token,
            });
          }
        });

        return {
          visits: scopedVisits,
          clients: Array.from(clientMap.values()),
          caregivers: Array.from(caregiverMap.values()),
        };
      }

      const [visitsResponse, clientsResponse, caregiversResponse] = await Promise.all([
        visitsQuery,
        supabase.from('clients').select('id, first_name, last_name').eq('active', true).order('last_name', { ascending: true }),
        supabase.from('profiles').select('id, full_name, color_code, sharing_token').order('full_name', { ascending: true }),
      ]);

      if (visitsResponse.error) {
        throw new Error(visitsResponse.error.message);
      }

      return {
        visits: (visitsResponse.data || []) as VisitRow[],
        clients: clientsResponse.error ? [] : ((clientsResponse.data || []) as ClientOption[]),
        caregivers: caregiversResponse.error ? [] : ((caregiversResponse.data || []) as CaregiverOption[]),
      };
    },
  });

  const visits = dashboardData?.visits || [];
  const clients = dashboardData?.clients || [];
  const caregivers = dashboardData?.caregivers || [];

  const availableClients = useMemo(() => {
    const clientMap = new Map<string, ClientOption>();

    clients.forEach((client) => {
      if (!client?.id) return;
      clientMap.set(client.id, client);
    });

    visits.forEach((visit) => {
      const visitClient = getVisitClient(visit);
      if (!visitClient?.id) return;
      if (!clientMap.has(visitClient.id)) {
        clientMap.set(visitClient.id, {
          id: visitClient.id,
          first_name: visitClient.first_name,
          last_name: visitClient.last_name,
        });
      }
    });

    return Array.from(clientMap.values()).sort((a, b) => displayClientName(a).localeCompare(displayClientName(b)));
  }, [clients, visits]);

  const availableCaregivers = useMemo(() => {
    const caregiverMap = new Map<string, CaregiverOption>();

    caregivers.forEach((caregiver) => {
      if (!caregiver?.id) return;
      caregiverMap.set(caregiver.id, caregiver);
    });

    visits.forEach((visit) => {
      const visitCaregiver = getVisitCaregiver(visit);
      if (!visitCaregiver?.id) return;
      if (!caregiverMap.has(visitCaregiver.id)) {
        caregiverMap.set(visitCaregiver.id, {
          id: visitCaregiver.id,
          full_name: visitCaregiver.full_name,
          color_code: visitCaregiver.color_code,
          sharing_token: visitCaregiver.sharing_token,
        });
      }
    });

    return Array.from(caregiverMap.values()).sort((a, b) =>
      displayCaregiverName(a).localeCompare(displayCaregiverName(b))
    );
  }, [caregivers, visits]);

  const coverageQueryEnabled = lockedPerspective === 'caregiver' && Boolean(lockedCaregiverId);
  const coverageQueryKey = useMemo(
    () => ['caregiver-coverage', lockedCaregiverId || 'unknown'] as const,
    [lockedCaregiverId]
  );

  const {
    data: caregiverCoverageData,
    error: coverageQueryError,
    isLoading: loadingCoverage,
    refetch: refetchCoverage,
  } = useCachedQuery<CaregiverCoverageData>({
    queryKey: coverageQueryKey,
    enabled: coverageQueryEnabled,
    staleTime: 20_000,
    queryFn: async () => {
      const caregiverId = lockedCaregiverId as string;

      const [profileResult, myShiftsResult, myRequestsResult, pendingCoverageResult] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', caregiverId).maybeSingle(),
        supabase
          .from('shifts')
          .select('id, start_time, end_time, status, notes')
          .eq('assigned_user_id', caregiverId)
          .neq('status', 'cancelled')
          .order('start_time', { ascending: true }),
        supabase
          .from('shift_requests')
          .select('id, shift_id, user_id, status, request_type')
          .eq('user_id', caregiverId)
          .eq('request_type', 'coverage')
          .order('created_at', { ascending: false }),
        supabase
          .from('shift_requests')
          .select(`
            id,
            shift_id,
            user_id,
            status,
            request_type,
            shifts:shift_id (id, start_time, end_time, status, notes),
            profiles:profiles!shift_requests_user_id_fkey (id, full_name, role)
          `)
          .eq('request_type', 'coverage')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      if (profileResult.error) throw new Error(profileResult.error.message);
      if (myShiftsResult.error) throw new Error(myShiftsResult.error.message);
      if (myRequestsResult.error) throw new Error(myRequestsResult.error.message);
      if (pendingCoverageResult.error) throw new Error(pendingCoverageResult.error.message);

      const currentRole = (profileResult.data?.role || 'employee').toLowerCase();
      const pendingRows = (pendingCoverageResult.data || []) as ShiftRequestRow[];
      const roleFilteredPending = pendingRows.filter((row) => {
        const requesterRole = (row.profiles?.role || 'employee').toLowerCase();
        return row.user_id !== caregiverId && requesterRole === currentRole;
      });

      return {
        role: currentRole,
        myShifts: (myShiftsResult.data || []) as ShiftRow[],
        myCoverageRequests: (myRequestsResult.data || []) as ShiftRequestRow[],
        pendingCoverageRequests: roleFilteredPending,
      };
    },
  });

  useEffect(() => {
    if (!lockedPerspective) return;
    setPerspective((current) => (current === lockedPerspective ? current : lockedPerspective));
  }, [lockedPerspective]);

  useEffect(() => {
    if (lockedPerspective !== 'caregiver' || !lockedCaregiverId) return;
    setSelectedCaregiverId((current) => (current === lockedCaregiverId ? current : lockedCaregiverId));
    setSelectedClientId('all');
  }, [lockedPerspective, lockedCaregiverId]);

  useEffect(() => {
    if (selectedClientId === 'all') return;
    const clientExists = availableClients.some((client) => client.id === selectedClientId);
    if (!clientExists) {
      setSelectedClientId('all');
    }
  }, [availableClients, selectedClientId]);

  useEffect(() => {
    if (selectedCaregiverId === 'all') return;
    if (lockedCaregiverId && selectedCaregiverId === lockedCaregiverId) return;
    const caregiverExists = availableCaregivers.some((caregiver) => caregiver.id === selectedCaregiverId);
    if (!caregiverExists) {
      setSelectedCaregiverId(lockedCaregiverId || 'all');
    }
  }, [availableCaregivers, lockedCaregiverId, selectedCaregiverId]);

  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      if (perspective === 'client' && selectedClientId !== 'all') {
        return visit.client_id === selectedClientId;
      }

      if (perspective === 'caregiver' && selectedCaregiverId !== 'all') {
        return visit.caregiver_id === selectedCaregiverId;
      }

      return true;
    });
  }, [visits, perspective, selectedClientId, selectedCaregiverId]);

  const selectedVisit = useMemo(() => {
    return filteredVisits.find((visit) => visit.id === selectedVisitId) || null;
  }, [filteredVisits, selectedVisitId]);

  const selectedClientLabel = useMemo(() => {
    if (selectedClientId === 'all') return 'All Clients';
    const match = availableClients.find((client) => client.id === selectedClientId);
    return displayClientName(match || null);
  }, [availableClients, selectedClientId]);

  const selectedCaregiverLabel = useMemo(() => {
    if (selectedCaregiverId === 'all') return 'All Caregivers';
    const match = availableCaregivers.find((caregiver) => caregiver.id === selectedCaregiverId);
    return displayCaregiverName(match || null);
  }, [availableCaregivers, selectedCaregiverId]);

  const printScheduleLabel = perspective === 'client' ? selectedClientLabel : selectedCaregiverLabel;
  const printRangeLabel =
    currentCalendarRangeLabel ||
    currentCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const printViewLabel =
    currentCalendarView === 'timeGridWeek'
      ? 'Weekly Schedule'
      : currentCalendarView === 'timeGridDay'
        ? 'Daily Schedule'
        : 'Monthly Schedule';

  const selectedShareToken = useMemo(() => {
    if (!selectedVisit) return null;
    return perspective === 'client'
      ? getVisitClient(selectedVisit)?.sharing_token || null
      : getVisitCaregiver(selectedVisit)?.sharing_token || null;
  }, [perspective, selectedVisit]);

  const caregiverColorMap = useMemo(() => {
    const colors = new Map<string, string>();
    let fallbackIndex = 0;

    caregivers.forEach((caregiver) => {
      const color = caregiver.color_code?.trim() || FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
      colors.set(caregiver.id, color);
      if (!caregiver.color_code) {
        fallbackIndex += 1;
      }
    });

    filteredVisits.forEach((visit) => {
      const caregiverId = visit.caregiver_id || '';
      if (!caregiverId || colors.has(caregiverId)) return;
      const color = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
      colors.set(caregiverId, color);
      fallbackIndex += 1;
    });

    return colors;
  }, [caregivers, filteredVisits]);

  const calendarEvents = useMemo(() => {
    return filteredVisits.map((visit) => {
      const caregiverName = displayCaregiverName(getVisitCaregiver(visit));
      const clientName = displayClientName(getVisitClient(visit));
      const color = visit.caregiver_id ? caregiverColorMap.get(visit.caregiver_id) : '#6B7280';

      return {
        id: visit.id,
        title: `${clientName} - ${caregiverName}`,
        start: visit.start_time,
        end: visit.end_time,
        backgroundColor: color,
        borderColor: color,
        editable: isVisitEditable(visit),
        startEditable: isVisitEditable(visit),
        durationEditable: isVisitEditable(visit),
        extendedProps: {
          caregiverId: visit.caregiver_id,
          status: visit.status,
        },
      };
    });
  }, [filteredVisits, caregiverColorMap]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current !== null) {
        globalThis.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const scheduleBackgroundRefresh = () => {
    if (refreshTimeoutRef.current !== null) {
      globalThis.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = globalThis.setTimeout(() => {
      invalidateCachedQuery(dashboardQueryKey);
      void refetch();
      refreshTimeoutRef.current = null;
    }, 1500);
  };

  const openCreateShiftForm = () => {
    const apiDate = calendarRef.current?.getApi().getDate() || null;
    const targetDate = selectedCalendarDate || apiDate || new Date();
    setNewShiftDate(toDateInputValue(targetDate));
    setNewShiftStartTime('09:00');
    setNewShiftEndTime('10:00');
    setNewShiftNotes('');
    setRepeatWeekly(false);
    setRepeatUntilDate('');
    setRepeatWeekdays([targetDate.getDay()]);
    setNewShiftClientId(
      perspective === 'client' && selectedClientId !== 'all' ? selectedClientId : availableClients[0]?.id || ''
    );
    setNewShiftCaregiverId(
      perspective === 'caregiver' && selectedCaregiverId !== 'all' ? selectedCaregiverId : availableCaregivers[0]?.id || ''
    );
    setError(null);
    setIsCreatingShift(true);
  };

  const persistVisitTime = async (info: EventDropArg | EventResizeDoneArg) => {
    const start = info.event.start;
    const end = info.event.end;

    if (!start || !end) {
      info.revert();
      setError('Unable to update visit time because one of the timestamps is missing.');
      return;
    }

    const previous = dashboardData;
    const startUtc = start.toISOString();
    const endUtc = end.toISOString();
    const caregiverId = (info.event.extendedProps?.caregiverId as string | null | undefined) || null;
    const status = ((info.event.extendedProps?.status as string | null | undefined) || '').toLowerCase();

    if (end.getTime() <= start.getTime()) {
      info.revert();
      setError('Visit end time must be after the start time.');
      return;
    }

    if (LOCKED_STATUSES.has(status) || start.getTime() <= Date.now()) {
      info.revert();
      setError('This visit is locked and cannot be edited.');
      return;
    }

    if (caregiverId) {
      const { data: conflictingRows, error: conflictError } = await supabase
        .from('visits')
        .select('id')
        .eq('caregiver_id', caregiverId)
        .neq('id', info.event.id)
        .lt('start_time', endUtc)
        .gt('end_time', startUtc)
        .limit(1);

      if (conflictError) {
        info.revert();
        setError(mapDataError(conflictError.message));
        return;
      }

      if (conflictingRows && conflictingRows.length > 0) {
        info.revert();
        setError('This change overlaps with another visit for the same caregiver.');
        return;
      }
    }

    setCachedQueryData<DashboardData>(dashboardQueryKey, (current) => {
      if (!current) return undefined;

      return {
        ...current,
        visits: current.visits.map((visit) =>
          visit.id === info.event.id ? { ...visit, start_time: startUtc, end_time: endUtc } : visit
        ),
      };
    });

    const { error: updateError } = await supabase
      .from('visits')
      .update({
        start_time: startUtc,
        end_time: endUtc,
      })
      .eq('id', info.event.id);

    if (updateError) {
      info.revert();
      if (previous) {
        setCachedQueryData(dashboardQueryKey, previous);
      }
      setError(mapDataError(updateError.message));
      return;
    }

    scheduleBackgroundRefresh();
  };

  const createShift = async () => {
    if (!newShiftClientId || !newShiftDate || !newShiftStartTime || !newShiftEndTime) {
      setError('Client, date, start time, and end time are required.');
      return;
    }

    const startIso = toUtcISOString(newShiftDate, newShiftStartTime);
    const endIso = toUtcISOString(newShiftDate, newShiftEndTime);

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError('Shift end time must be after the start time.');
      return;
    }

    if (repeatWeekly && !repeatUntilDate) {
      setError('Select a repeat-until date for weekly autofill.');
      return;
    }

    setError(null);
    setIsSavingShift(true);

    const normalizedRepeatDays =
      repeatWeekdays.length > 0
        ? repeatWeekdays
        : [new Date(`${newShiftDate}T00:00:00`).getDay()];

    const scheduleDates: string[] = [];
    if (!repeatWeekly) {
      scheduleDates.push(newShiftDate);
    } else {
      const startDate = new Date(`${newShiftDate}T00:00:00`);
      const untilDate = new Date(`${repeatUntilDate}T00:00:00`);
      if (untilDate.getTime() < startDate.getTime()) {
        setError('Repeat-until date must be the same day or after the first shift date.');
        setIsSavingShift(false);
        return;
      }

      const cursor = new Date(startDate);
      while (cursor.getTime() <= untilDate.getTime()) {
        if (normalizedRepeatDays.includes(cursor.getDay())) {
          scheduleDates.push(toDateInputValue(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    if (scheduleDates.length === 0) {
      setError('No matching dates found for the selected repeat pattern.');
      setIsSavingShift(false);
      return;
    }

    if (scheduleDates.length > 400) {
      setError('Repeat range is too large. Reduce the date range.');
      setIsSavingShift(false);
      return;
    }

    const payloads = scheduleDates.map((dateValue) => ({
      client_id: newShiftClientId,
      caregiver_id: newShiftCaregiverId || null,
      start_time: toUtcISOString(dateValue, newShiftStartTime),
      end_time: toUtcISOString(dateValue, newShiftEndTime),
      status: 'scheduled',
      notes: newShiftNotes.trim() || null,
    }));

    const { data: insertedRows, error: insertError } = await supabase
      .from('visits')
      .insert(payloads)
      .select(`
        id,
        client_id,
        caregiver_id,
        start_time,
        end_time,
        status,
        notes,
        clients:client_id (id, first_name, last_name, sharing_token),
        profiles:caregiver_id (id, full_name, color_code, sharing_token)
      `);

    if (insertError) {
      setError(mapDataError(insertError.message));
      setIsSavingShift(false);
      return;
    }

    const insertedVisits = (insertedRows || []) as VisitRow[];

    if (insertedVisits.length > 0) {
      setCachedQueryData<DashboardData>(dashboardQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          visits: [...current.visits, ...insertedVisits].sort(
            (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          ),
        };
      });
      setSelectedVisitId(insertedVisits[0].id);
    }

    setIsSavingShift(false);
    setIsCreatingShift(false);
    scheduleBackgroundRefresh();
  };

  const deleteSelectedShift = async () => {
    if (!selectedVisit) {
      setError('Select a shift before deleting.');
      return;
    }

    const confirmed = window.confirm('Delete this shift? This action cannot be undone.');
    if (!confirmed) return;

    setError(null);
    setIsDeletingShift(true);

    const { error: deleteError } = await supabase.from('visits').delete().eq('id', selectedVisit.id);

    if (deleteError) {
      setError(mapDataError(deleteError.message));
      setIsDeletingShift(false);
      return;
    }

      setCachedQueryData<DashboardData>(dashboardQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
        visits: current.visits.filter((visit) => visit.id !== selectedVisit.id),
      };
    });

    setSelectedVisitId(null);
    setIsDeletingShift(false);
    scheduleBackgroundRefresh();
  };

  const generateShareableLink = async () => {
    if (!selectedVisit) {
      setError('Select a visit before generating a shareable link.');
      return;
    }

    const token = selectedShareToken;

    if (!token) {
      setError('No sharing token is available for the selected view.');
      return;
    }

    const shareType = perspective === 'client' ? 'clients' : 'caregivers';
    const url = `${window.location.origin}/shared/${shareType}/${token}`;
    setShareLink(url);

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard may be blocked in insecure contexts. Keep URL visible in UI.
    }
  };

  const printCurrentView = () => {
    window.print();
  };

  const openDailyView = (info: DateClickArg) => {
    setSelectedCalendarDate(info.date);

    if (lockedPerspective === 'caregiver') {
      setPerspective('caregiver');
      if (lockedCaregiverId) {
        setSelectedCaregiverId(lockedCaregiverId);
      }
      setSelectedClientId('all');
    }

    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.changeView('timeGridDay', info.date);
  };

  const legendItems = useMemo(() => {
    const legendMap = new Map<string, { name: string; color: string }>();

    filteredVisits.forEach((visit) => {
      const key = visit.caregiver_id || 'unassigned';
      if (legendMap.has(key)) return;
      legendMap.set(key, {
        name: displayCaregiverName(getVisitCaregiver(visit)),
        color: visit.caregiver_id ? caregiverColorMap.get(visit.caregiver_id) || '#6B7280' : '#6B7280',
      });
    });

    return Array.from(legendMap.values());
  }, [filteredVisits, caregiverColorMap]);

  const combinedError = error || queryError;
  const effectiveError = combinedError || coverageQueryError;

  const coverageRequestedShiftIds = useMemo(() => {
    const ids = new Set<string>();
    (caregiverCoverageData?.myCoverageRequests || []).forEach((request) => {
      if (request.shift_id && ['pending', 'claimed', 'approved'].includes((request.status || '').toLowerCase())) {
        ids.add(request.shift_id);
      }
    });
    return ids;
  }, [caregiverCoverageData?.myCoverageRequests]);

  const resolveShiftFromRequest = (request: ShiftRequestRow): ShiftRow | null => {
    if (!request.shifts) return null;
    return Array.isArray(request.shifts) ? request.shifts[0] || null : request.shifts;
  };

  const requestCoverage = async (shiftId: string) => {
    if (!lockedCaregiverId) return;
    setError(null);
    setRequestingCoverageShiftId(shiftId);

    const { error: requestError } = await supabase.from('shift_requests').insert([
      {
        shift_id: shiftId,
        user_id: lockedCaregiverId,
        status: 'pending',
        request_type: 'coverage',
      },
    ]);

    if (requestError) {
      setError(mapDataError(requestError.message));
      setRequestingCoverageShiftId(null);
      return;
    }

    invalidateCachedQuery(coverageQueryKey);
    await refetchCoverage();
    setRequestingCoverageShiftId(null);
  };

  const claimCoverageRequest = async (requestId: string) => {
    setError(null);
    setClaimingCoverageRequestId(requestId);

    const { error: updateError } = await supabase
      .from('shift_requests')
      .update({ status: 'claimed' })
      .eq('id', requestId)
      .eq('status', 'pending');

    if (updateError) {
      setError(mapDataError(updateError.message));
      setClaimingCoverageRequestId(null);
      return;
    }

    invalidateCachedQuery(coverageQueryKey);
    await refetchCoverage();
    setClaimingCoverageRequestId(null);
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-emerald-50/50 p-4 sm:p-8'}>
      <div className={embedded ? '' : 'mx-auto max-w-7xl'}>
        <header className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-900">{title}</h1>
            {subtitle && <p className="text-emerald-600">{subtitle}</p>}
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-500">Times shown in {getLocalTimeZone()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowShiftManagement && (
              <button
                onClick={openCreateShiftForm}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Add Shift
              </button>
            )}
            {allowShiftManagement && (
              <button
                onClick={deleteSelectedShift}
                disabled={!selectedVisit || isDeletingShift}
                className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingShift ? 'Deleting...' : 'Delete Selected'}
              </button>
            )}
            <button
              onClick={generateShareableLink}
              disabled={!selectedVisit || !selectedShareToken}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate Shareable Link
            </button>
            <button
              onClick={printCurrentView}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
            >
              Export PDF
            </button>
            <button
              onClick={() => {
                invalidateCachedQuery(dashboardQueryKey);
                void refetch();
              }}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
            >
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </header>

        {effectiveError && (
          <div className="no-print mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert" aria-live="polite">
            {effectiveError}
          </div>
        )}

        {shareLink && (
          <div className="no-print mb-4 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-900">
            Shareable link copied (or ready to copy): <span className="font-semibold">{shareLink}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="no-print rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            {!lockedPerspective && (
              <>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-500">Perspective</p>
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-emerald-50 p-1">
                  <button
                    onClick={() => setPerspective('client')}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold ${
                      perspective === 'client' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-600'
                    }`}
                  >
                    Client
                  </button>
                  <button
                    onClick={() => setPerspective('caregiver')}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold ${
                      perspective === 'caregiver' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-600'
                    }`}
                  >
                    Caregiver
                  </button>
                </div>
              </>
            )}

            {perspective === 'client' ? (
              <div className="mb-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-emerald-500">Select Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Clients</option>
                  {availableClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {displayClientName(client)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mb-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-emerald-500">Select Caregiver</label>
                <select
                  value={selectedCaregiverId}
                  onChange={(e) => {
                    if (lockedCaregiverId) return;
                    setSelectedCaregiverId(e.target.value);
                  }}
                  disabled={Boolean(lockedCaregiverId)}
                  className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {!lockedCaregiverId && <option value="all">All Caregivers</option>}
                  {availableCaregivers.map((caregiver) => (
                    <option key={caregiver.id} value={caregiver.id}>
                      {displayCaregiverName(caregiver)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-sm text-emerald-900">
              <p className="font-semibold">Selected Visit</p>
              {selectedVisit ? (
                <>
                  <p className="mt-2">{displayClientName(getVisitClient(selectedVisit))}</p>
                  <p className="text-emerald-700">{displayCaregiverName(getVisitCaregiver(selectedVisit))}</p>
                  <p className="text-xs text-emerald-600">
                    {formatLocalDateTimeWithZone(selectedVisit.start_time)} - {formatLocalDateTimeWithZone(selectedVisit.end_time)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-emerald-700">Click an event to inspect and share.</p>
              )}
            </div>

            {allowShiftManagement && isCreatingShift && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">Add Shift</p>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Client</label>
                    <select
                      value={newShiftClientId}
                      onChange={(e) => setNewShiftClientId(e.target.value)}
                      disabled={availableClients.length === 0}
                      className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">
                        {availableClients.length === 0 ? 'No clients available' : 'Select client'}
                      </option>
                      {availableClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {displayClientName(client)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={newShiftCaregiverId}
                    onChange={(e) => setNewShiftCaregiverId(e.target.value)}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm"
                  >
                    <option value="">Unassigned caregiver</option>
                      {availableCaregivers.map((caregiver) => (
                        <option key={caregiver.id} value={caregiver.id}>
                          {displayCaregiverName(caregiver)}
                        </option>
                      ))}
                  </select>
                  <input
                    type="date"
                    value={newShiftDate}
                    onChange={(e) => setNewShiftDate(e.target.value)}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={newShiftStartTime}
                      onChange={(e) => setNewShiftStartTime(e.target.value)}
                      className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm"
                    />
                    <input
                      type="time"
                      value={newShiftEndTime}
                      onChange={(e) => setNewShiftEndTime(e.target.value)}
                      className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    value={newShiftNotes}
                    onChange={(e) => setNewShiftNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="h-20 w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm"
                  />
                  <div className="rounded-lg border border-emerald-200 bg-white p-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <input
                        type="checkbox"
                        checked={repeatWeekly}
                        onChange={(e) => setRepeatWeekly(e.target.checked)}
                      />
                      Repeat weekly (autofill)
                    </label>

                    {repeatWeekly && (
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            Repeat Until
                          </label>
                          <input
                            type="date"
                            value={repeatUntilDate}
                            min={newShiftDate || undefined}
                            onChange={(e) => setRepeatUntilDate(e.target.value)}
                            className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Days</span>
                          <div className="grid grid-cols-4 gap-1">
                            {WEEKDAY_OPTIONS.map((day) => (
                              <label key={day.value} className="flex items-center gap-1 rounded border border-emerald-100 px-2 py-1 text-[11px] text-emerald-800">
                                <input
                                  type="checkbox"
                                  checked={repeatWeekdays.includes(day.value)}
                                  onChange={(e) => {
                                    setRepeatWeekdays((current) =>
                                      e.target.checked
                                        ? [...current, day.value].sort((a, b) => a - b)
                                        : current.filter((value) => value !== day.value)
                                    );
                                  }}
                                />
                                {day.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={createShift}
                      disabled={isSavingShift}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isSavingShift ? 'Saving...' : 'Save Shift'}
                    </button>
                    <button
                      onClick={() => setIsCreatingShift(false)}
                      className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {allowShiftManagement && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs font-semibold text-amber-800">
                  Add caregivers from the <span className="font-bold">Roles &amp; Access</span> tab. Manager/admin onboarding uses invite links and creates auth-linked profiles.
                </p>
              </div>
            )}

            {coverageQueryEnabled && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">My Shifts</p>
                  {loadingCoverage ? (
                    <p className="text-sm text-emerald-700">Loading your shifts...</p>
                  ) : (caregiverCoverageData?.myShifts || []).length === 0 ? (
                    <p className="text-sm text-emerald-700">No assigned shifts.</p>
                  ) : (
                    <div className="space-y-2">
                      {(caregiverCoverageData?.myShifts || []).slice(0, 8).map((shift) => {
                        const requested = coverageRequestedShiftIds.has(shift.id);
                        return (
                          <div key={shift.id} className="rounded-lg border border-emerald-100 bg-white p-2">
                            <p className="text-xs font-semibold text-emerald-900">
                              {formatLocalDateTimeWithZone(shift.start_time)} - {formatLocalDateTimeWithZone(shift.end_time)}
                            </p>
                            <button
                              onClick={() => {
                                void requestCoverage(shift.id);
                              }}
                              disabled={requested || requestingCoverageShiftId === shift.id}
                              className="mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {requestingCoverageShiftId === shift.id
                                ? 'Requesting...'
                                : requested
                                  ? 'Coverage Requested'
                                  : 'Request Coverage'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">Available Shifts</p>
                  {loadingCoverage ? (
                    <p className="text-sm text-emerald-700">Loading coverage requests...</p>
                  ) : (caregiverCoverageData?.pendingCoverageRequests || []).length === 0 ? (
                    <p className="text-sm text-emerald-700">No pending coverage requests for your role.</p>
                  ) : (
                    <div className="space-y-2">
                      {(caregiverCoverageData?.pendingCoverageRequests || []).slice(0, 8).map((request) => {
                        const shift = resolveShiftFromRequest(request);
                        const requesterName = request.profiles?.full_name?.trim() || 'Caregiver';
                        return (
                          <div key={request.id} className="rounded-lg border border-emerald-100 bg-white p-2">
                            <p className="text-xs font-semibold text-emerald-900">
                              {shift
                                ? `${formatLocalDateTimeWithZone(shift.start_time)} - ${formatLocalDateTimeWithZone(shift.end_time)}`
                                : 'Shift details unavailable'}
                            </p>
                            <p className="mt-1 text-[11px] text-emerald-700">Requested by {requesterName}</p>
                            <button
                              onClick={() => {
                                void claimCoverageRequest(request.id);
                              }}
                              disabled={claimingCoverageRequestId === request.id}
                              className="mt-2 w-full rounded-lg border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {claimingCoverageRequestId === request.id ? 'Claiming...' : 'Claim Shift'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          <main className="print-calendar rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="mb-4 hidden border-b border-slate-300 pb-3 print:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Charleen&apos;s Scheduling App</p>
              <h2 className="text-xl font-bold text-slate-900">{printScheduleLabel}</h2>
              <p className="text-sm text-slate-600">
                {perspective === 'client' ? 'Client Perspective' : 'Caregiver Perspective'} {printViewLabel}: {printRangeLabel}
              </p>
            </div>
            {isLoading ? (
              <div className="flex min-h-[520px] items-center justify-center text-emerald-600">Loading visits...</div>
            ) : (
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                editable
                droppable={false}
                eventDurationEditable
                eventStartEditable
                events={calendarEvents}
                eventClick={(info) => {
                  setSelectedVisitId(info.event.id);
                  const visit = filteredVisits.find((item) => item.id === info.event.id);
                  if (visit && !isVisitEditable(visit)) {
                    setError('This visit is locked and cannot be edited.');
                  }
                }}
                eventDrop={persistVisitTime}
                eventResize={persistVisitTime}
                dateClick={openDailyView}
                datesSet={(arg: DatesSetArg) => {
                  setCurrentCalendarDate(arg.view.currentStart);
                  const viewType = arg.view.type as 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
                  setCurrentCalendarView(viewType);

                  if (viewType === 'dayGridMonth') {
                    setCurrentCalendarRangeLabel(
                      arg.view.currentStart.toLocaleDateString(undefined, {
                        month: 'long',
                        year: 'numeric',
                      })
                    );
                    return;
                  }

                  const start = new Date(arg.start);
                  const endExclusive = new Date(arg.end);
                  const end = new Date(endExclusive.getTime() - 60_000);

                  if (viewType === 'timeGridDay') {
                    setCurrentCalendarRangeLabel(
                      start.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    );
                    return;
                  }

                  setCurrentCalendarRangeLabel(
                    `${start.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })} - ${end.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`
                  );
                }}
                height="auto"
              />
            )}

            <section className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-500">Caregiver Color Legend</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {legendItems.length === 0 ? (
                  <p className="text-sm text-emerald-700">No caregivers in the current filter.</p>
                ) : (
                  legendItems.map((item) => (
                    <div key={`${item.name}-${item.color}`} className="flex items-center gap-2 text-sm text-emerald-900">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default VisitCalendarDashboard;
