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

export interface EmployeeBalance {
  user_id: number;
  username: string;
  period_start: string;
  period_end: string;
  expected_weekly_hours: number;
  hours_per_scheduled_day: number;
  scheduled_days: number[];
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