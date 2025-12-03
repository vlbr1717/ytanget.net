import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    console.log('Received chat request with', messages.length, 'messages');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add system message for LaTeX formatting
    const systemMessage = {
      role: 'system',
      content: 'You are a helpful assistant. CRITICAL FORMATTING RULES:\n\n**Main Formulas:**\n- NEVER write formulas as plain text (e.g., NEVER write "F_d = 1/2 · C_d · ρ · A · v^2")\n- ONLY use LaTeX with $$...$$ delimiters\n- Put formulas on their own line with blank lines before and after\n\n**Correct Example:**\n\nThe air resistance is given by:\n\n$$F_d = \\frac{1}{2} \\cdot C_d \\cdot \\rho \\cdot A \\cdot v^2$$\n\nwhere:\n- $F_d$ is the drag force\n- $C_d$ is the drag coefficient\n- $\\rho$ is the air density\n\n**Variables in explanatory text:**\n- Use $...$ for inline variables (e.g., $F_d$ is the drag force)\n- Use $...$ for Greek letters and symbols (e.g., $\\rho$, $C_d$)\n\n**NEVER do this:**\n- F_d = 1/2 · C_d · ρ · A · v^2 (plain text formula)\n- Fd or C_d without $ delimiters in explanations'
    };

    // Prepend system message if not already present
    const messagesWithSystem = messages[0]?.role === 'system' 
      ? messages 
      : [systemMessage, ...messages];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messagesWithSystem,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI gateway request failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Streaming response from AI gateway');
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
