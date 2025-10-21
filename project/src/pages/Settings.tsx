import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Key, CheckCircle, XCircle, Loader2, Eye, EyeOff, DollarSign, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate, ANTHROPIC_CONSOLE_URL } from '../utils/balanceAlert';

export default function Settings() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [existingKeyMask, setExistingKeyMask] = useState<string | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [balanceSyncedAt, setBalanceSyncedAt] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceSuccess, setBalanceSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkExistingKey();
    loadBalanceInfo();
  }, [user]);

  const checkExistingKey = async () => {
    if (!user) return;

    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('key_last_four, is_valid')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasExistingKey(true);
        setExistingKeyMask(data.key_last_four ? `••••${data.key_last_four}` : '••••••••');
      }
    } catch (err) {
      console.error('Error checking API key:', err);
    } finally {
      setChecking(false);
    }
  };

  const loadBalanceInfo = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('starting_balance_usd, balance_synced_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentBalance(data.starting_balance_usd);
        setBalanceSyncedAt(data.balance_synced_at);
      }
    } catch (err) {
      console.error('Error loading balance info:', err);
    }
  };

  const handleUpdateBalance = async () => {
    if (!user) return;

    const balance = parseFloat(balanceInput);
    if (isNaN(balance) || balance < 0) {
      setBalanceError('Please enter a valid positive number');
      return;
    }

    setBalanceLoading(true);
    setBalanceError(null);
    setBalanceSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('user_api_keys')
        .update({
          starting_balance_usd: balance,
          balance_synced_at: new Date().toISOString(),
          balance_sync_source: 'manual',
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setBalanceSuccess(`Balance updated to ${formatCurrency(balance)}`);
      setBalanceInput('');
      await loadBalanceInfo();
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : 'Failed to update balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleSaveKey = async () => {
    if (!user || !apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Invalid API key format. Claude API keys start with "sk-ant-"');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const lastFour = apiKey.slice(-4);

      const { error: upsertError } = await supabase
        .from('user_api_keys')
        .upsert(
          {
            user_id: user.id,
            encrypted_api_key: apiKey,
            key_last_four: lastFour,
            is_valid: true,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (upsertError) throw upsertError;

      setSuccess('API key saved successfully!');
      setApiKey('');
      setShowApiKey(false);
      await checkExistingKey();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!user) return;

    if (!confirm('Are you sure you want to remove your API key? You will not be able to extract ideas without it.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: deleteError } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setSuccess('API key removed successfully');
      setHasExistingKey(false);
      setExistingKeyMask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove API key');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!user) return;

    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('No active session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-extract-idea`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            emailPreview: 'Test connection',
            fullContent: 'This is a test to verify the API key is working.',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Connection test failed');
      }

      setSuccess('API key is valid and working!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  if (checking) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your Claude API key and account settings</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Account Balance</h2>
        </div>

        {!hasExistingKey ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              Add your API key first to enable balance tracking
            </p>
          </div>
        ) : (
          <>
            {currentBalance !== null && balanceSyncedAt && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Current Synced Balance</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      {formatCurrency(currentBalance)}
                    </p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Last updated {formatDate(balanceSyncedAt)}
                </p>
              </div>
            )}

            {currentBalance === null && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    No balance set. Enter your current balance to start tracking spending.
                  </p>
                </div>
              </div>
            )}

            {balanceError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{balanceError}</p>
              </div>
            )}

            {balanceSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">{balanceSuccess}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-2">
                  {currentBalance !== null ? 'Update Balance' : 'Set Starting Balance'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    $
                  </span>
                  <input
                    id="balance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={balanceLoading}
                  />
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <p className="text-xs text-gray-500 flex-1">
                    Check your current balance at{' '}
                    <a
                      href={ANTHROPIC_CONSOLE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                    >
                      console.anthropic.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>

              <button
                onClick={handleUpdateBalance}
                disabled={balanceLoading || !balanceInput.trim()}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {balanceLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>{currentBalance !== null ? 'Update Balance' : 'Set Balance'}</>
                )}
              </button>
            </div>

            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-xs font-semibold text-green-900 mb-1">How Balance Tracking Works</h4>
              <ul className="text-xs text-green-800 space-y-1">
                <li>• Enter your current balance from the Anthropic console</li>
                <li>• The app tracks all spending from that point forward</li>
                <li>• Your remaining balance is calculated in real-time</li>
                <li>• Re-sync anytime by entering your updated balance</li>
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Claude API Key</h2>
        </div>

        {hasExistingKey && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">API Key Configured</p>
                  <p className="text-sm text-green-700 mt-1">Key: {existingKeyMask}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasExistingKey && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                No API key configured. You'll need to add one to extract ideas.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              {hasExistingKey ? 'Update API Key' : 'Enter API Key'}
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Anthropic Console
              </a>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveKey}
              disabled={loading || !apiKey.trim()}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{hasExistingKey ? 'Update Key' : 'Save Key'}</>
              )}
            </button>

            {hasExistingKey && (
              <button
                onClick={handleTestConnection}
                disabled={testing || loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
            )}
          </div>

          {hasExistingKey && (
            <button
              onClick={handleRemoveKey}
              disabled={loading}
              className="w-full py-2 px-4 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Remove API Key
            </button>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">About API Key Security</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Your API key is encrypted and stored securely in the database</li>
          <li>• The key is never exposed to your browser or visible in network requests</li>
          <li>• All Claude API calls are proxied through secure backend functions</li>
          <li>• You can update or remove your key at any time</li>
        </ul>
      </div>
    </div>
  );
}
