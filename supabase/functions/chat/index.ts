import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messagesWithSystem,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API request failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Streaming response from OpenAI');
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
