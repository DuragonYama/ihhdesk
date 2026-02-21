export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  expected_weekly_hours?: number;
  has_km_compensation?: boolean;
  work_days?: number[];
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
  expected_weekly_hours?: number;
  has_km_compensation?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  is_active?: boolean;
  expected_weekly_hours?: number;
  has_km_compensation?: boolean;
}

export interface WorkSchedule {
  user_id: number;
  days: number[]; // 0=Mon, 6=Sun
}

export interface ApiError {
  detail: string;
}

export interface Absence {
  id: number;
  user_id: number;
  username: string;
  start_date: string;
  end_date: string | null;
  type: 'sick' | 'personal' | 'vacation';
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
}

export interface ApproveRejectRequest {
  message?: string;
}

export interface UpdateAbsenceRequest {
  start_date?: string;
  reason?: string;
}

export interface AdminCreateAbsenceRequest {
  user_id: number;
  start_date: string;
  end_date?: string;
  type: 'sick' | 'personal' | 'vacation';
  reason: string;
  auto_approve?: boolean;
}

export interface BulkAbsenceRequest {
  user_ids: number[];
  start_date: string;
  end_date?: string | null;
  absence_type: 'sick' | 'personal' | 'vacation';
  reason: string;
  auto_approve: boolean;
}

export interface EmployeeBalance {
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
    work_from_home: boolean;
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

export interface EventCategory {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  date: string;
  time_start: string | null;
  time_end: string | null;
  visibility: string;
  status: string;
  created_by: number;
  username?: string; // For pending events
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
}

export interface CompanyHoliday {
  id: number;
  name: string;
  date: string;
  created_by: number;
  created_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  color: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  category_id?: number;
  date: string;
  time_start?: string;
  time_end?: string;
  visibility: 'all' | 'specific';
  assigned_user_ids?: number[];
}

export interface CreateHolidayRequest {
  name: string;
  date: string;
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
}

export interface PendingClockEvent {
  id: number;
  user_id: number;
  username: string;
  date: string;
  clock_in: string;
  clock_out: string;
  came_by_car: boolean;
  parking_cost: number | null;
  km_driven: number | null;
  work_from_home?: boolean;
  requested_reason: string | null;
  created_at: string | null;
  status: string;
}

export interface CreateClockEventRequest {
  user_id: number;
  event_date: string;
  clock_in_time: string;
  clock_out_time: string;
  came_by_car?: boolean;
  parking_cost?: number | null;
  km_driven?: number | null;
  work_from_home?: boolean;
}

export interface UpdateClockEventRequest {
  clock_in?: string;
  clock_out?: string;
  came_by_car?: boolean;
  parking_cost?: number | null;
  km_driven?: number | null;
  work_from_home?: boolean;
}

export interface BulkEmailRequest {
  employee_ids: number[];
  external_emails: string[];
  subject: string;
  message: string;
}

export interface BulkEmailResponse {
  total_recipients: number;
  successful_count: number;
  failed_emails: string[];
  success: boolean;
}