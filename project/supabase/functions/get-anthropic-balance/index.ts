import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BalanceStatus {
  level: 'healthy' | 'warning' | 'low' | 'critical' | 'not_set';
  message: string;
  showAlert: boolean;
}

function getBalanceStatus(balance: number, threshold: number): BalanceStatus {
  if (balance > 20) {
    return {
      level: 'healthy',
      message: 'Your balance is healthy',
      showAlert: false,
    };
  } else if (balance > threshold && balance <= 20) {
    return {
      level: 'warning',
      message: 'Balance getting low - consider adding credits soon',
      showAlert: true,
    };
  } else if (balance > 1 && balance <= threshold) {
    return {
      level: 'low',
      message: 'Low balance - add credits soon to avoid service interruption',
      showAlert: true,
    };
  } else if (balance > 0) {
    return {
      level: 'critical',
      message: 'Critical: Add credits immediately to avoid service interruption',
      showAlert: true,
    };
  } else {
    return {
      level: 'critical',
      message: 'Balance depleted - add credits at console.anthropic.com to continue',
      showAlert: true,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's API key and balance data from database
    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from("user_api_keys")
      .select("encrypted_api_key, is_valid, starting_balance_usd, balance_synced_at, balance_sync_source, low_balance_threshold_usd")
      .eq("user_id", user.id)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: "No API key found. Please add your Claude API key in Settings." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!apiKeyData.is_valid) {
      return new Response(
        JSON.stringify({ error: "API key is invalid. Please update your API key in Settings." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if starting balance is set
    if (apiKeyData.starting_balance_usd === null || apiKeyData.starting_balance_usd === undefined) {
      return new Response(
        JSON.stringify({
          balance_not_set: true,
          message: "Please set your starting balance in Settings to track spending",
          balance_usd: 0,
          status: {
            level: 'not_set',
            message: 'Set your balance in Settings to start tracking',
            showAlert: true,
          },
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Calculate spending since balance was synced
    const balanceSyncedAt = apiKeyData.balance_synced_at || new Date(0).toISOString();
    
    const { data: usageLogs, error: usageError } = await supabaseClient
      .from("api_usage_logs")
      .select("cost_usd")
      .eq("user_id", user.id)
      .gte("created_at", balanceSyncedAt);

    if (usageError) {
      throw usageError;
    }

    // Calculate total spent since balance sync
    const totalSpentSinceSync = usageLogs?.reduce((sum, log) => sum + (Number(log.cost_usd) || 0), 0) || 0;

    // Calculate current balance
    const startingBalance = Number(apiKeyData.starting_balance_usd) || 0;
    const currentBalance = Math.max(0, startingBalance - totalSpentSinceSync);
    const threshold = Number(apiKeyData.low_balance_threshold_usd) || 10;

    // Get balance status
    const status = getBalanceStatus(currentBalance, threshold);

    // Calculate average daily spend
    const syncDate = new Date(balanceSyncedAt);
    const now = new Date();
    const daysSinceSync = Math.max(1, (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageDailySpend = totalSpentSinceSync / daysSinceSync;
    const estimatedDaysRemaining = averageDailySpend > 0 ? Math.floor(currentBalance / averageDailySpend) : null;

    // Check if balance needs re-sync (older than 14 days)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const needsResync = new Date(balanceSyncedAt) < fourteenDaysAgo;

    return new Response(
      JSON.stringify({
        balance_usd: currentBalance,
        starting_balance_usd: startingBalance,
        total_spent_since_sync: totalSpentSinceSync,
        balance_synced_at: balanceSyncedAt,
        balance_sync_source: apiKeyData.balance_sync_source || 'manual',
        status: status,
        average_daily_spend: averageDailySpend,
        estimated_days_remaining: estimatedDaysRemaining,
        needs_resync: needsResync,
        low_balance_threshold: threshold,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});