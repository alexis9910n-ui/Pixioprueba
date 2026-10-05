import type { RateCard, SubscriptionPlan } from './types';

export const COMMISSION_FREE = 0.03;
export const COMMISSION_PRO = 0.02;
export const COMMISSION_RATE = 0.15;
export const PAYOUT_RATE = 0.85;
export const MILESTONE_THRESHOLD = 1000;
export const RELEASE_WINDOW_HOURS = 48;
export const MAX_BIDS = 5;
export const MIN_BID_PERCENTAGE = 0.8;
export const DEFAULT_RADIUS_KM = 20;
export const PRO_MONTHLY_FEE = 50;
export const VERIFICATION_FEE = 1.0;

export interface PriceEstimate {
  min: number;
  max: number;
  minAllowedBid: number;
}

export function getCommissionRate(plan: SubscriptionPlan): number {
  return plan === 'pro' || plan === 'vip' ? COMMISSION_PRO : COMMISSION_FREE;
}

export function estimatePrice(
  rateCards: RateCard[],
  categoryId: string,
  zipCode: string,
): PriceEstimate {
  const zip3 = zipCode.slice(0, 3) || '000';

  const exactZip = rateCards.find(
    (rc) => rc.category_id === categoryId && rc.zip_prefix === zip3,
  );
  const card = exactZip ?? rateCards.find(
    (rc) => rc.category_id === categoryId && rc.zip_prefix === '000',
  );

  if (!card) return { min: 0, max: 0, minAllowedBid: 0 };

  const min = card.unit === 'hourly' ? card.min_hourly : card.min_project;
  const max = card.unit === 'hourly' ? card.max_hourly : card.max_project;

  return {
    min,
    max,
    minAllowedBid: Math.round(min * MIN_BID_PERCENTAGE),
  };
}

export function validateBid(
  bidAmount: number,
  estimate: PriceEstimate,
): { valid: boolean; minAllowed: number } {
  const minAllowed = estimate.minAllowedBid;
  return {
    valid: bidAmount >= minAllowed,
    minAllowed,
  };
}

export function shouldUseMilestones(totalAmount: number): boolean {
  return totalAmount >= MILESTONE_THRESHOLD;
}

export interface MilestonePlan {
  phases: { phase_number: number; label: string; percentage: number; amount: number }[];
}

export function generateMilestones(totalAmount: number): MilestonePlan['phases'] {
  if (!shouldUseMilestones(totalAmount)) {
    return [{
      phase_number: 1,
      label: 'Full Payment',
      percentage: 100,
      amount: totalAmount,
    }];
  }
  return [
    { phase_number: 1, label: 'Initial / Materials', percentage: 30, amount: Math.round(totalAmount * 0.3 * 100) / 100 },
    { phase_number: 2, label: 'Progress', percentage: 40, amount: Math.round(totalAmount * 0.4 * 100) / 100 },
    { phase_number: 3, label: 'Final Delivery', percentage: 30, amount: Math.round(totalAmount * 0.3 * 100) / 100 },
  ];
}

export function calculatePayout(grossAmount: number, plan: SubscriptionPlan = 'free'): { commission: number; commissionRate: number; net: number } {
  const rate = getCommissionRate(plan);
  return {
    commissionRate: rate,
    commission: Math.round(grossAmount * rate * 100) / 100,
    net: Math.round(grossAmount * (1 - rate) * 100) / 100,
  };
}
