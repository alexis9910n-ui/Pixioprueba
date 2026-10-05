export type UserRole = 'client' | 'contractor' | 'admin';
export type AppMode = 'client' | 'contractor';

export type JobStatus =
  | 'open'
  | 'quote_limit_reached'
  | 'inspection_scheduled'
  | 'inspection_confirmed'
  | 'final_quote_pending'
  | 'final_quote_approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type QuoteStatus = 'pending' | 'accepted' | 'rejected';

export type ExtraWorkStatus = 'pending' | 'approved' | 'rejected';

export type PaymentStatus = 'pending' | 'held_in_escrow' | 'released' | 'refunded' | 'disputed';

export type DisputeStatus = 'open' | 'in_review' | 'resolved_client' | 'resolved_contractor' | 'closed';

export type MilestoneStatus =
  | 'pending_deposit'
  | 'deposited'
  | 'work_completed'
  | 'release_scheduled'
  | 'released'
  | 'disputed';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type SubscriptionPlan = 'free' | 'pro' | 'vip';

export type WalletTxType = 'escrow_hold' | 'milestone_release' | 'change_order_release' | 'commission' | 'withdrawal' | 'refund';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  phone_number: string | null;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  service_radius_km: number | null;
  rating_avg: number | null;
  rating_count: number;
  rating: number | null;
  jobs_completed: number;
  subscription_plan: SubscriptionPlan;
  biometric_enabled: boolean;
  trade_category: string | null;
  zip_code: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  verification_status: VerificationStatus;
  verified_at: string | null;
  stripe_identity_session_id: string | null;
  document_type: string | null;
  document_id_url: string | null;
  selfie_url: string | null;
  company_name: string | null;
  license_number: string | null;
  insurance_policy: string | null;
  business_phone: string | null;
  status_message: string | null;
  trades: string[] | null;
  service_zips: string[] | null;
  is_enterprise: boolean;
  accepts_subcontracts: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  category_group: 'construction' | 'installations' | 'remodeling' | 'maintenance' | 'landscaping' | 'cleaning';
  icon: string;
  sort_order: number;
  name_en: string;
  name_es: string;
}

export interface RateCard {
  id: string;
  category_id: string;
  zip_prefix: string;
  min_hourly: number;
  max_hourly: number;
  min_project: number;
  max_project: number;
  unit: 'hourly' | 'project';
}

export interface JobRequest {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string;
  audio_note_url: string | null;
  image_urls: string[];
  zip_code: string;
  status: JobStatus;
  quotes_count: number;
  inspection_date: string | null;
  inspection_time_slot: string | null;
  final_quote_amount: number | null;
  final_quote_breakdown: EstimateBreakdown | null;
  final_quote_status: string | null;
  final_quote_notes: string | null;
  created_at: string;
}

export interface EstimateLineItem {
  category: 'labor' | 'materials' | 'equipment' | 'permits' | 'other';
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface EstimateBreakdown {
  line_items: EstimateLineItem[];
  subtotal: number;
  overhead_pct: number;
  overhead_amount: number;
  grand_total: number;
  warranty: string;
  payment_terms: string;
  estimated_weeks: number | null;
}

export interface JobQuote {
  id: string;
  job_id: string;
  contractor_id: string;
  proposed_amount: number;
  estimated_days: number | null;
  notes: string;
  breakdown: EstimateBreakdown | null;
  status: QuoteStatus;
  created_at: string;
}

export interface ExtraWorkRequest {
  id: string;
  job_id: string;
  requested_by: string;
  title: string;
  description: string;
  additional_amount: number;
  status: ExtraWorkStatus;
  created_at: string;
}

export interface Payment {
  id: string;
  job_id: string;
  client_id: string;
  contractor_id: string;
  amount: number;
  extra_work_amount: number;
  total_amount: number;
  platform_fee: number;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface DisputeClaim {
  id: string;
  job_id: string;
  filed_by: string;
  reason: string;
  details: string;
  status: DisputeStatus;
  admin_notes: string | null;
  created_at: string;
}

export interface CategoryGalleryItem {
  id: string;
  category_name: string;
  image_url: string;
  display_order: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface AdminAlert {
  id: string;
  event_type: string;
  reference_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  phase_number: number;
  label: string;
  percentage: number;
  amount: number;
  status: MilestoneStatus;
  proof_photo_urls: string[];
  completed_at: string | null;
  release_scheduled_at: string | null;
  released_at: string | null;
  stripe_payment_intent_id: string | null;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  is_masked: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  contractor_id: string;
  project_id: string | null;
  type: WalletTxType;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  stripe_transfer_id: string | null;
  created_at: string;
}
