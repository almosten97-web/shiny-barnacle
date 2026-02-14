import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VisitCalendarDashboard from './VisitCalendarDashboard';

const {
  refetchMock,
  useCachedQueryMock,
  setCachedQueryDataMock,
  invalidateCachedQueryMock,
  eqMock,
  updateMock,
  fromMock,
} = vi.hoisted(() => ({
  refetchMock: vi.fn(async () => ({})),
  useCachedQueryMock: vi.fn(),
  setCachedQueryDataMock: vi.fn(),
  invalidateCachedQueryMock: vi.fn(),
  eqMock: vi.fn(async () => ({ error: null })),
  updateMock: vi.fn(),
  fromMock: vi.fn(),
}));

updateMock.mockImplementation(() => ({ eq: eqMock }));
fromMock.mockImplementation(() => ({ update: updateMock }));

vi.mock('../supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('../lib/query-cache', () => ({
  useCachedQuery: useCachedQueryMock,
  setCachedQueryData: setCachedQueryDataMock,
  invalidateCachedQuery: invalidateCachedQueryMock,
}));

vi.mock('../lib/datetime', () => ({
  formatLocalDateTimeWithZone: (value: string) => value,
  getLocalTimeZone: () => 'UTC',
  toUtcISOString: (date: string, time: string) => `${date}T${time}:00.000Z`,
}));

vi.mock('../lib/error-mapping', () => ({
  mapDataError: (message: string) => message,
}));

vi.mock('@fullcalendar/daygrid', () => ({ default: 'dayGridPlugin' }));
vi.mock('@fullcalendar/timegrid', () => ({ default: 'timeGridPlugin' }));
vi.mock('@fullcalendar/interaction', () => ({ default: 'interactionPlugin' }));

vi.mock('@fullcalendar/react', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');
  let lastProps: Record<string, unknown> | null = null;

  const MockCalendar = (props: Record<string, unknown>) => {
    lastProps = props;
    return ReactModule.createElement('div', { 'data-testid': 'mock-fullcalendar' });
  };

  return {
    default: MockCalendar,
    __getLastProps: () => lastProps,
  };
});

const dashboardData = {
  visits: [
    {
      id: 'visit-1',
      client_id: 'client-1',
      caregiver_id: 'caregiver-1',
      start_time: '2026-02-10T09:00:00.000Z',
      end_time: '2026-02-10T10:00:00.000Z',
      notes: 'Morning visit',
      status: 'scheduled',
      clients: { id: 'client-1', first_name: 'Ava', last_name: 'Clark', sharing_token: 'client-token-1' },
      profiles: { id: 'caregiver-1', full_name: 'Jordan Lee', color_code: '#1D4ED8', sharing_token: 'cg-token-1' },
    },
  ],
  clients: [{ id: 'client-1', first_name: 'Ava', last_name: 'Clark' }],
  caregivers: [{ id: 'caregiver-1', full_name: 'Jordan Lee', color_code: '#1D4ED8', sharing_token: 'cg-token-1' }],
};

const renderDashboard = () =>
  renderToStaticMarkup(
    <VisitCalendarDashboard title="Charleen's Scheduling App" subtitle="Admin perspective" embedded allowShiftManagement />
  );

describe('VisitCalendarDashboard FullCalendar wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useCachedQueryMock.mockReturnValue({
      data: dashboardData,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: refetchMock,
    });
  });

  it('configures full calendar with month/week/day views and resize/edit enabled', async () => {
    renderDashboard();
    const module = await import('@fullcalendar/react');
    const props = (module as unknown as { __getLastProps: () => Record<string, unknown> }).__getLastProps();

    expect(props).toBeTruthy();
    expect(props.initialView).toBe('dayGridMonth');
    expect(props.headerToolbar).toEqual({
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    });
    expect(props.editable).toBe(true);
    expect(props.eventDurationEditable).toBe(true);
    expect(props.eventStartEditable).toBe(true);
    expect(props.eventResize).toBeTypeOf('function');
    expect(props.eventDrop).toBeTypeOf('function');
    expect(props.dateClick).toBeTypeOf('function');
    expect(props.height).toBe('auto');
  });

  it('persists resized events through supabase and refreshes cache', async () => {
    renderDashboard();
    const module = await import('@fullcalendar/react');
    const props = (module as unknown as { __getLastProps: () => Record<string, unknown> }).__getLastProps();

    const eventResize = props.eventResize as (arg: any) => Promise<void>;
    const revert = vi.fn();

    await eventResize({
      event: {
        id: 'visit-1',
        start: new Date('2026-03-01T13:00:00.000Z'),
        end: new Date('2026-03-01T14:30:00.000Z'),
      },
      revert,
    });

    await vi.runAllTimersAsync();

    expect(fromMock).toHaveBeenCalledWith('visits');
    expect(updateMock).toHaveBeenCalledWith({
      start_time: '2026-03-01T13:00:00.000Z',
      end_time: '2026-03-01T14:30:00.000Z',
    });
    expect(eqMock).toHaveBeenCalledWith('id', 'visit-1');
    expect(invalidateCachedQueryMock).toHaveBeenCalledWith(['calendar-dashboard', 'unlocked', 'all']);
    expect(refetchMock).toHaveBeenCalled();
    expect(revert).not.toHaveBeenCalled();
  });

  it('renders calendar filter controls and print action for admin/manager usage', () => {
    const html = renderDashboard();

    expect(html).toContain('Perspective');
    expect(html).toContain('Client');
    expect(html).toContain('Caregiver');
    expect(html).toContain('Select Client');
    expect(html).toContain('All Clients');
    expect(html).toContain('Export PDF');
    expect(html).toContain('Add Shift');
    expect(html).toContain('Add Caregiver');
    expect(html).toContain('Delete Selected');
  });
});
