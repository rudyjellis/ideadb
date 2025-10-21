import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Anthropic from "npm:@anthropic-ai/sdk@0.65.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IdeaData {
  id?: string;
  title: string;
  summary: string;
  target_market: string;
  arr_potential: string;
  time_to_mvp: string;
  capital_needed: string;
  required_skills: string[];
  key_opportunities: string;
  key_risks: string;
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

    const idea: IdeaData = await req.json();

    const anthropic = new Anthropic({
      apiKey: apiKeyData.encrypted_api_key,
    });

    const prompt = `Create a comprehensive Product Requirements Document for this startup idea:

Title: ${idea.title}
Summary: ${idea.summary}
Target Market: ${idea.target_market}
ARR Potential: ${idea.arr_potential}
Time to MVP: ${idea.time_to_mvp}
Capital Needed: ${idea.capital_needed}
Required Skills: ${idea.required_skills.join(", ")}
Key Opportunities: ${idea.key_opportunities}
Key Risks: ${idea.key_risks}

Structure:
1. Executive Summary
2. Problem Statement
3. Solution Overview
4. Target Market & User Personas
5. Core Features (MVP vs Future)
6. Technical Requirements
7. Success Metrics & KPIs
8. Development Timeline
9. Risk Assessment & Mitigation

Format as markdown. Be comprehensive, specific, and actionable. Include detailed user stories.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
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

    // Calculate cost based on token usage
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;
    const costUsd = (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0;

    // Log API usage
    try {
      await supabaseClient.from("api_usage_logs").insert({
        user_id: user.id,
        idea_id: idea.id || null,
        operation_type: "generate_prd",
        model_used: "claude-sonnet-4-20250514",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: costUsd,
      });
    } catch (logError) {
      console.error("Failed to log API usage:", logError);
    }

    // Update idea costs if idea_id is provided
    if (idea.id) {
      try {
        await supabaseClient
          .from("ideas")
          .update({
            prd_cost: costUsd,
          })
          .eq("id", idea.id)
          .eq("user_id", user.id);

        // Update total_cost
        await supabaseClient.rpc("update_idea_total_cost", { idea_id: idea.id });
      } catch (updateError) {
        console.error("Failed to update idea costs:", updateError);
      }
    }

    await supabaseClient
      .from("user_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({
      content: content.text,
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
