import { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BalanceData, ANTHROPIC_CONSOLE_URL, formatCurrency } from '../utils/balanceAlert';

export default function BalanceWarningBanner() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBalance();
    }
  }, [user]);

  const fetchBalance = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-anthropic-balance`,
        {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !balance) return null;
  if (dismissed) return null;
  if (balance.balance_not_set) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-900">
              Balance tracking not set up
            </p>
            <p className="text-sm text-yellow-800 mt-1">
              Set your starting balance in Settings to track spending and get low balance alerts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="text-sm font-medium text-yellow-900 hover:text-yellow-800 whitespace-nowrap"
            >
              Go to Settings
            </a>
            <button
              onClick={() => setDismissed(true)}
              className="text-yellow-600 hover:text-yellow-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!balance.status.showAlert) return null;

  const bgColor = balance.status.level === 'critical'
    ? 'bg-red-50 border-red-200'
    : balance.status.level === 'low'
    ? 'bg-orange-50 border-orange-200'
    : 'bg-yellow-50 border-yellow-200';

  const textColor = balance.status.level === 'critical'
    ? 'text-red-900'
    : balance.status.level === 'low'
    ? 'text-orange-900'
    : 'text-yellow-900';

  const subtextColor = balance.status.level === 'critical'
    ? 'text-red-800'
    : balance.status.level === 'low'
    ? 'text-orange-800'
    : 'text-yellow-800';

  const iconColor = balance.status.level === 'critical'
    ? 'text-red-600'
    : balance.status.level === 'low'
    ? 'text-orange-600'
    : 'text-yellow-600';

  const buttonColor = balance.status.level === 'critical'
    ? 'bg-red-600 hover:bg-red-700'
    : balance.status.level === 'low'
    ? 'bg-orange-600 hover:bg-orange-700'
    : 'bg-yellow-600 hover:bg-yellow-700';

  return (
    <div className={`${bgColor} border-b px-4 py-3`}>
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${textColor}`}>
            {balance.status.message}
          </p>
          <p className={`text-sm ${subtextColor} mt-1`}>
            Current balance: {formatCurrency(balance.balance_usd)}
            {balance.estimated_days_remaining !== null && balance.estimated_days_remaining !== undefined && (
              <span> • Approximately {balance.estimated_days_remaining} day{balance.estimated_days_remaining !== 1 ? 's' : ''} remaining</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={ANTHROPIC_CONSOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonColor} text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 whitespace-nowrap`}
          >
            Add Credits
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setDismissed(true)}
            className={iconColor}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
