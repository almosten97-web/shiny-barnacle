
export type UserRole = 'manager' | 'caregiver';
export type ShiftStatus = 'scheduled' | 'open' | 'completed';
export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface Client {
  id: string;
  name: string;
  location: string;
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  locations: string[];
  maxHoursPerWeek: number;
  preferredHours: string;
  status: 'active' | 'inactive';
}

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  requiredRole: UserRole;
  assignedEmployeeId: string | null;
  status: ShiftStatus;
  clientId: string;
}

export interface Availability {
  id: string;
  employeeId: string;
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  availableFrom: string;
  availableTo: string;
  notes?: string;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: RequestStatus;
}

export interface ShiftSwapRequest {
  id: string;
  requestingEmployeeId: string;
  targetEmployeeId: string;
  requestingShiftId: string;
  targetShiftId: string;
  status: RequestStatus;
}

export interface OpenShiftClaim {
  id: string;
  employeeId: string;
  shiftId: string;
  status: RequestStatus;
}

export interface Conflict {
  type: 'overlap' | 'over-hours' | 'unassigned' | 'role-mismatch' | 'time-off';
  message: string;
  severity: 'warning' | 'error';
}
