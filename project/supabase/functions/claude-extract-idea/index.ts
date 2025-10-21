import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Anthropic from "npm:@anthropic-ai/sdk@0.65.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  emailPreview: string;
  fullContent: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization header
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

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
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

    // Get user's API key from database
    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from("user_api_keys")
      .select("encrypted_api_key, is_valid")
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

    // Parse request body
    const { emailPreview, fullContent }: RequestPayload = await req.json();

    // Initialize Anthropic client with user's API key
    const anthropic = new Anthropic({
      apiKey: apiKeyData.encrypted_api_key,
    });

    const combinedContent = `Email Preview:\n${emailPreview}\n\nFull Content:\n${fullContent}`;

    const prompt = `Extract startup idea data from this content and return ONLY valid JSON with no markdown formatting:

Content: ${combinedContent}

Return this structure:
{
  "title": "idea title",
  "summary": "2-3 sentence summary in your own words",
  "arr_potential": "dollar amount mentioned",
  "pricing": "pricing model",
  "target_market": "target customers",
  "market_size": "market size data",
  "time_to_mvp": "estimated time",
  "capital_needed": "estimated capital range",
  "competition_level": "Low/Medium/High",
  "required_skills": ["skill1", "skill2"],
  "market_type": "B2B or B2C",
  "founder_fit_tags": ["technical_founder", "bootstrapper", etc],
  "growth_channels": "list channels",
  "key_risks": "main risks",
  "key_opportunities": "main opportunities",
  "competitors_mentioned": "competitors if any",
  "original_link": "extract URL if present"
}

Tags: technical_founder, design_founder, marketing_founder, quick_shipper, bootstrapper, funded, nights_weekends, hardware_experience, b2b_sales`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude API");
    }

    let jsonText = content.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    const extractedData = JSON.parse(jsonText);

    // Calculate cost based on token usage
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;
    const costUsd = (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0;

    // Log API usage
    try {
      await supabaseClient.from("api_usage_logs").insert({
        user_id: user.id,
        idea_id: null,
        operation_type: "extract_idea",
        model_used: "claude-sonnet-4-20250514",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: costUsd,
      });
    } catch (logError) {
      console.error("Failed to log API usage:", logError);
    }

    // Update last_used_at for the API key
    await supabaseClient
      .from("user_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({
      ...extractedData,
      _usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: costUsd,
      },
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
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
