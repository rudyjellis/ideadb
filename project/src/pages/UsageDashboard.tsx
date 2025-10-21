import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, TrendingUp, Activity, Download, RefreshCw, Loader2, Calendar, ExternalLink, AlertCircle } from 'lucide-react';
import { formatCost, formatTokens } from '../utils/costCalculator';
import { BalanceData, formatCurrency, formatDate, getBalanceColorClass, getBalanceGradientClass, ANTHROPIC_CONSOLE_URL } from '../utils/balanceAlert';

interface UsageLog {
  id: string;
  operation_type: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
  idea_id: string | null;
}

interface IdeaWithTitle {
  id: string;
  title: string;
}


type DateFilter = '7days' | '30days' | '90days' | 'all';
type OperationFilter = 'all' | 'extract_idea' | 'generate_prd' | 'generate_gtm' | 'generate_marketing';

export default function UsageDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [ideas, setIdeas] = useState<Map<string, string>>(new Map());
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [operationFilter, setOperationFilter] = useState<OperationFilter>('all');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, dateFilter, operationFilter]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBalance(),
        fetchUsageLogs(),
        fetchIdeas(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const fetchUsageLogs = async () => {
    if (!user) return;

    let query = supabase
      .from('api_usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply date filter
    if (dateFilter !== 'all') {
      const daysAgo = dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      query = query.gte('created_at', startDate.toISOString());
    }

    // Apply operation filter
    if (operationFilter !== 'all') {
      query = query.eq('operation_type', operationFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching usage logs:', error);
      return;
    }

    setUsageLogs(data || []);
  };

  const fetchIdeas = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ideas')
      .select('id, title')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching ideas:', error);
      return;
    }

    const ideasMap = new Map<string, string>();
    data?.forEach((idea: IdeaWithTitle) => {
      ideasMap.set(idea.id, idea.title);
    });
    setIdeas(ideasMap);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Operation', 'Idea', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cost (USD)'];
    const rows = usageLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      getOperationLabel(log.operation_type),
      log.idea_id ? ideas.get(log.idea_id) || 'Unknown' : 'N/A',
      log.input_tokens,
      log.output_tokens,
      log.total_tokens,
      log.cost_usd,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getOperationLabel = (type: string): string => {
    const labels: Record<string, string> = {
      extract_idea: 'Extract Idea',
      generate_prd: 'Generate PRD',
      generate_gtm: 'Generate GTM',
      generate_marketing: 'Generate Marketing',
    };
    return labels[type] || type;
  };

  const calculateStats = () => {
    const totalCost = usageLogs.reduce((sum, log) => sum + Number(log.cost_usd), 0);
    const totalTokens = usageLogs.reduce((sum, log) => sum + log.total_tokens, 0);
    const avgCostPerOperation = usageLogs.length > 0 ? totalCost / usageLogs.length : 0;

    const operationCounts: Record<string, number> = {};
    const operationCosts: Record<string, number> = {};

    usageLogs.forEach(log => {
      operationCounts[log.operation_type] = (operationCounts[log.operation_type] || 0) + 1;
      operationCosts[log.operation_type] = (operationCosts[log.operation_type] || 0) + Number(log.cost_usd);
    });

    return {
      totalCost,
      totalTokens,
      avgCostPerOperation,
      operationCounts,
      operationCosts,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Usage Dashboard</h1>
          <p className="text-gray-600">Track your API usage and costs</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {balance && (
        <>
          {balance.balance_not_set ? (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    Set Your Balance to Start Tracking
                  </h3>
                  <p className="text-yellow-800 mb-4">
                    To accurately track your spending, please set your starting balance in Settings.
                    Check your current balance at the Anthropic console and enter it to begin tracking.
                  </p>
                  <a
                    href="/settings"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
                    Go to Settings
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={`bg-gradient-to-r ${getBalanceGradientClass(balance.status.level)} rounded-lg p-6 mb-6 text-white shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white/90 text-sm mb-1">Account Balance</p>
                    <p className="text-4xl font-bold mb-2">{formatCurrency(balance.balance_usd)}</p>
                    <div className="flex items-center gap-2 text-white/80 text-xs">
                      <span>Last synced {balance.balance_synced_at ? formatDate(balance.balance_synced_at) : 'never'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <DollarSign className="w-12 h-12 text-white/30" />
                    <a
                      href="/settings"
                      className="text-xs text-white/90 hover:text-white underline flex items-center gap-1"
                    >
                      Update Balance
                    </a>
                  </div>
                </div>
                {balance.estimated_days_remaining !== null && balance.estimated_days_remaining !== undefined && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-white/90 text-sm">
                      Estimated {balance.estimated_days_remaining} day{balance.estimated_days_remaining !== 1 ? 's' : ''} remaining at current usage rate
                    </p>
                  </div>
                )}
              </div>

              {balance.status.showAlert && (
                <div className={`mb-6 p-4 rounded-lg border-2 ${balance.status.level === 'critical' ? 'bg-red-50 border-red-300' : balance.status.level === 'low' ? 'bg-orange-50 border-orange-300' : 'bg-yellow-50 border-yellow-300'}`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${balance.status.level === 'critical' ? 'text-red-600' : balance.status.level === 'low' ? 'text-orange-600' : 'text-yellow-600'}`} />
                    <div className="flex-1">
                      <p className={`font-semibold mb-1 ${balance.status.level === 'critical' ? 'text-red-900' : balance.status.level === 'low' ? 'text-orange-900' : 'text-yellow-900'}`}>
                        {balance.status.message}
                      </p>
                      <p className={`text-sm mb-3 ${balance.status.level === 'critical' ? 'text-red-800' : balance.status.level === 'low' ? 'text-orange-800' : 'text-yellow-800'}`}>
                        Add credits to your Anthropic account to continue using the service without interruption.
                      </p>
                      <a
                        href={ANTHROPIC_CONSOLE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${balance.status.level === 'critical' ? 'bg-red-600 hover:bg-red-700 text-white' : balance.status.level === 'low' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
                      >
                        Add Credits at Anthropic Console
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {balance.needs_resync && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 font-medium mb-1">
                        Balance hasn't been synced in over 14 days
                      </p>
                      <p className="text-sm text-blue-800 mb-3">
                        For accurate tracking, please update your balance in Settings.
                      </p>
                      <a
                        href="/settings"
                        className="text-sm text-blue-700 hover:text-blue-800 font-medium underline"
                      >
                        Update Balance Now
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Total Spent</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCost(stats.totalCost)}</p>
          <p className="text-sm text-gray-500 mt-1">{usageLogs.length} operations</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Total Tokens</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatTokens(stats.totalTokens)}</p>
          <p className="text-sm text-gray-500 mt-1">Input + Output</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Avg Cost</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCost(stats.avgCostPerOperation)}</p>
          <p className="text-sm text-gray-500 mt-1">Per operation</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Cost by Operation Type</h3>
        <div className="space-y-3">
          {Object.entries(stats.operationCosts).map(([type, cost]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-gray-700">{getOperationLabel(type)}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">{stats.operationCounts[type]} calls</span>
                <span className="font-semibold text-gray-900 min-w-20 text-right">
                  {formatCost(cost)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">Usage History</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            <select
              value={operationFilter}
              onChange={(e) => setOperationFilter(e.target.value as OperationFilter)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All operations</option>
              <option value="extract_idea">Extract Idea</option>
              <option value="generate_prd">Generate PRD</option>
              <option value="generate_gtm">Generate GTM</option>
              <option value="generate_marketing">Generate Marketing</option>
            </select>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {usageLogs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No usage data found for the selected filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Operation</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Idea</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tokens</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {getOperationLabel(log.operation_type)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                      {log.idea_id ? ideas.get(log.idea_id) || 'Unknown' : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">
                      {formatTokens(log.total_tokens)}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                      {formatCost(Number(log.cost_usd))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
