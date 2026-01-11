
import { Employee, Shift, Availability, TimeOffRequest, Client } from './types';

export const MOCK_CLIENTS: Client[] = [
    { id: 'client-1', name: 'Client 1', location: 'Location 1' },
    { id: 'client-2', name: 'Client 2', location: 'Location 2' },
];

export const MOCK_EMPLOYEES: Employee[] = [];
export const MOCK_SHIFTS: Shift[] = [
    {
        id: '1',
        date: '2024-07-29',
        startTime: '09:00',
        endTime: '17:00',
        location: 'Location 1',
        requiredRole: 'caregiver',
        assignedEmployeeId: null,
        status: 'open',
        clientId: 'client-1'
    },
    {
        id: '2',
        date: '2024-07-29',
        startTime: '10:00',
        endTime: '18:00',
        location: 'Location 2',
        requiredRole: 'caregiver',
        assignedEmployeeId: null,
        status: 'open',
        clientId: 'client-2'
    }
];
export const MOCK_AVAILABILITY: Availability[] = [];
export const MOCK_TIME_OFF: TimeOffRequest[] = [];
