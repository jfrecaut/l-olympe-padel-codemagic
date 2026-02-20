export interface Profile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  role: 'admin' | 'manager' | 'player';
  is_active: boolean;
  created_at: string;
}

export interface Court {
  id: string;
  name: string;
  capacity: 2 | 4;
  price: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  court_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  players_count: number;
  status: 'confirmed' | 'cancelled';
  payment_status: 'pending_payment' | 'partial_payment_completed' | 'payment_completed' | 'payment_failed' | 'confirmed' | 'cancelled';
  total_amount: number;
  amount_paid: number;
  original_amount?: number;
  promotion_id?: string;
  promotion_discount?: number;
  booking_code?: string;
  created_by_admin?: boolean;
  created_at: string;
  court?: Court;
  profile?: Profile;
  promotion?: Promotion;
}

export interface Settings {
  id: string;
  game_duration_minutes: number;
  cancellation_hours: number;
  max_bookings_per_user: number;
  payment_timeout_hours: number;
  welcome_video_url?: string;
  welcome_video_mobile_url?: string;
  welcome_banner_url?: string;
  welcome_banner_mobile_url?: string;
  company_logo_url?: string;
  company_logo_dark_url?: string;
  created_at: string;
  updated_at: string;
}

export interface OpeningHours {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  created_at: string;
}

export interface Holiday {
  id: string;
  date: string;
  end_date?: string;
  reason: string;
  created_at: string;
}

export interface BookingParticipant {
  id: string;
  booking_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface StripeSettings {
  id: number;
  environment: 'staging' | 'production';
  is_active: boolean;
  publishable_key: string;
  secret_key: string;
  webhook_secret?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentLog {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  payment_type: 'partial' | 'full';
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  booking?: Booking;
  profile?: Profile;
}

export interface Refund {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  cancelled_by: 'admin' | 'client';
  cancelled_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  stripe_refund_id?: string;
  created_at: string;
  updated_at: string;
  booking?: Booking;
  profile?: Profile;
  reviewer?: Profile;
}

export interface Promotion {
  id: string;
  name: string;
  label: string;
  court_ids: string[];
  discount_type: 'percentage' | 'amount';
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}
