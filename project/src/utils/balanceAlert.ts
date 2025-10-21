export type BalanceLevel = 'healthy' | 'warning' | 'low' | 'critical' | 'not_set';

export interface BalanceStatus {
  level: BalanceLevel;
  message: string;
  showAlert: boolean;
}

export interface BalanceData {
  balance_usd: number;
  starting_balance_usd?: number;
  total_spent_since_sync?: number;
  balance_synced_at?: string;
  balance_sync_source?: string;
  status: BalanceStatus;
  average_daily_spend?: number;
  estimated_days_remaining?: number | null;
  needs_resync?: boolean;
  low_balance_threshold?: number;
  balance_not_set?: boolean;
}

export function getBalanceColorClass(level: BalanceLevel): string {
  switch (level) {
    case 'healthy':
      return 'text-green-600';
    case 'warning':
      return 'text-yellow-600';
    case 'low':
      return 'text-orange-600';
    case 'critical':
      return 'text-red-600';
    case 'not_set':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
}

export function getBalanceBgClass(level: BalanceLevel): string {
  switch (level) {
    case 'healthy':
      return 'bg-green-50 border-green-200';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200';
    case 'low':
      return 'bg-orange-50 border-orange-200';
    case 'critical':
      return 'bg-red-50 border-red-200';
    case 'not_set':
      return 'bg-gray-50 border-gray-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

export function getBalanceGradientClass(level: BalanceLevel): string {
  switch (level) {
    case 'healthy':
      return 'from-green-500 to-emerald-600';
    case 'warning':
      return 'from-yellow-500 to-amber-600';
    case 'low':
      return 'from-orange-500 to-red-600';
    case 'critical':
      return 'from-red-500 to-rose-700';
    case 'not_set':
      return 'from-gray-400 to-gray-600';
    default:
      return 'from-gray-400 to-gray-600';
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

export function getEstimatedOperationsRemaining(balance: number, averageCostPerOperation: number): number | null {
  if (averageCostPerOperation <= 0 || balance <= 0) {
    return null;
  }
  return Math.floor(balance / averageCostPerOperation);
}

export const ANTHROPIC_CONSOLE_URL = 'https://console.anthropic.com/settings/billing';
