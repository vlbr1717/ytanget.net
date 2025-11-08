import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const braveSearchApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('Received web search request for:', query);

    if (!braveSearchApiKey) {
      console.error('BRAVE_SEARCH_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Brave Search API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Subscription-Token': braveSearchApiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brave Search API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch search results' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extract relevant information from top results
    const results = data.web?.results || [];
    const searchResults = results.slice(0, 3).map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description || ''
    }));

    console.log('Successfully fetched search results');
    return new Response(
      JSON.stringify({ results: searchResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in web-search function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
