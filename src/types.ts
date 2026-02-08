export interface Availability {
  id: string;
  user_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string | null;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  active: boolean | null;
  created_at: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean | null;
  created_at: string | null;
  is_admin: boolean | null;
}

export type ShiftStatus = 'open' | 'assigned' | 'completed' | 'cancelled';
export type ShiftRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ShiftRequest {
  id: string;
  shift_id: string | null;
  user_id: string | null;
  status: ShiftRequestStatus | null;
  created_at: string | null;
}

export interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  assigned_user_id: string | null;
  status: ShiftStatus;
  created_by: string | null;
  notes: string | null;
  created_at: string | null;
  assigned_to: string | null;
}

export interface VisitRequest {
  id: string;
  visit_id: string | null;
  caregiver_id: string | null;
  status: string | null;
  created_at: string | null;
}

export interface Visit {
  id: string;
  client_id: string | null;
  caregiver_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  created_by: string | null;
  notes: string | null;
  created_at: string | null;
}
