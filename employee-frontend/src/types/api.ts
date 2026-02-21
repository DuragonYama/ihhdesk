export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  expected_weekly_hours: number;
  is_active: boolean;
  work_days?: number[];
}

export interface ClockEvent {
  id: number;
  user_id: number;
  date: string;
  clock_in: string;
  clock_out: string;
  came_by_car: boolean;
  parking_cost: number | null;
  km_driven: number | null;
  work_from_home?: boolean;
  status?: string;
  requested_reason?: string | null;
}

export interface Absence {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string | null;
  type: 'sick' | 'personal' | 'vacation';
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time_start: string | null;
  time_end: string | null;
  category_id: number | null;
}

export interface CompanyHoliday {
  id: number;
  name: string;
  date: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface ClockInRequest {
  came_by_car: boolean;
  parking_cost?: number;
  km_driven?: number;
  work_from_home?: boolean;
  reason?: string;
}

export interface UpdateClockEventRequest {
  clock_in?: string;
  clock_out?: string;
  came_by_car?: boolean;
  parking_cost?: number | null;
  km_driven?: number | null;
  work_from_home?: boolean;
}

export interface CreateClockEventRequest {
  date: string;
  clock_in: string;
  clock_out: string;
  came_by_car: boolean;
  parking_cost?: number;
  km_driven?: number;
  work_from_home?: boolean;
  reason?: string;
}

export interface RequestAbsenceRequest {
  start_date: string;
  end_date?: string;
  type: 'sick' | 'personal' | 'vacation';
  reason: string;
}

export interface TodayClockEvent {
  id: number;
  date: string;
  clock_in: string;
  clock_out: string | null;
  came_by_car: boolean;
  parking_cost: number | null;
  km_driven: number | null;
}

export interface MyBalance {
  user_id: number;
  username: string;
  period_start: string;
  period_end: string;
  expected_weekly_hours: number;
  hours_per_scheduled_day: number;
  scheduled_days: number[];
  total_hours_worked: number;  // Actual hours from clock events
  extra_hours: number;
  missing_hours: number;
  balance: number;
  total_parking: number;
  total_km: number;
}

export interface TodayStatus {
  date: string;
  stats: {
    total_employees: number;
    clocked_in: number;
    on_leave: number;
    expected_missing: number;
  };
  clocked_in: Array<{
    user_id: number;
    username: string;
    email: string;
    clock_in: string;
    clock_out: string;
    came_by_car: boolean;
  }>;
  on_leave: Array<{
    user_id: number;
    username: string;
    email: string;
    absence_type: string;
    start_date: string;
    end_date: string | null;
    reason: string;
  }>;
  expected_missing: Array<{
    user_id: number;
    username: string;
    email: string;
  }>;
}

export interface TeamStatus {
  date: string;
  team: Array<{
    username: string;
    status: 'present' | 'absent' | 'sick' | 'vacation' | 'personal';
  }>;
}
