import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Search for relevant document chunks using keyword matching
async function searchDocuments(
  supabase: any, 
  folderId: string, 
  query: string,
  userId: string
): Promise<{ documentName: string; content: string }[]> {
  try {
    // Get all documents in this folder
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, name')
      .eq('folder_id', folderId)
      .eq('user_id', userId)
      .eq('status', 'ready');

    if (docsError || !docs || docs.length === 0) {
      console.log('No documents found in folder:', folderId);
      return [];
    }

    console.log(`Found ${docs.length} documents in folder`);

    // Get chunks from these documents
    const docIds = docs.map((d: any) => d.id);
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('content, document_id')
      .in('document_id', docIds)
      .limit(50);

    if (chunksError || !chunks) {
      console.error('Error fetching chunks:', chunksError);
      return [];
    }

    // Create a map of doc id to name
    const docNameMap: Record<string, string> = {};
    for (const doc of docs) {
      docNameMap[doc.id] = doc.name;
    }

    // Simple keyword relevance scoring
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scoredChunks = chunks.map((chunk: any) => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 1;
        }
      }
      return { ...chunk, score, documentName: docNameMap[chunk.document_id] };
    });

    // Sort by score and take top 5
    const topChunks = scoredChunks
      .filter((c: any) => c.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);

    console.log(`Returning ${topChunks.length} relevant chunks`);

    return topChunks.map((c: any) => ({
      documentName: c.documentName,
      content: c.content
    }));
  } catch (error) {
    console.error('Failed to search documents:', error);
    return [];
  }
}

// Input validation constants
const MAX_MESSAGE_LENGTH = 10000;
const MAX_MESSAGES = 50;

// yTangent system prompt with branch awareness and document context
const getSystemPrompt = (depth: number, branchName?: string, documentContext?: string) => {
  let branchInfo = `Current depth: ${depth} messages from root.`;
  if (branchName) {
    branchInfo += ` Active tangent: '${branchName}'`;
  }

  let documentSection = '';
  if (documentContext) {
    documentSection = `

## Document Context
The following content is from documents in the user's folder. Use this information to answer questions when relevant:

${documentContext}`;
  }
  if (branchName) {
    branchInfo += ` Active tangent: '${branchName}'`;
  }

  return `## Identity & Purpose
You are yTangent, an advanced AI assistant optimized for branched, non-linear conversations. Your architecture allows users to "fork" discussions into tangents without losing the primary context of the project backlog.

## Current Context
${branchInfo}

## Information Architecture: The "Briefing" Standard
- **The Lead-In:** Start every response with the direct answer. No introductions.
- **Structural Scannability:** Use nested bullet points to show relationships between ideas. Use headers (##) to separate distinct topics.
- **No Filler:** If a word does not add factual value, delete it. Eliminate "I understand," "Here is," and "In conclusion."
- **Atomic Responses:** Treat each point as a standalone piece of information.

## Interaction Framework: The Branching Logic
1. **Context Isolation:** You are aware that the user may switch between different "branches" of a conversation. Treat each branch as a distinct logical path.
2. **Parent Context Awareness:** While focusing on the current tangent, maintain awareness of the "Root" or "Parent" context (the core project goals) unless the user explicitly branches into a completely unrelated topic.
3. **No Derailment:** If a conversation path becomes circular or low-utility, acknowledge the state and suggest returning to a previous branch or the main project line.
4. **Backlog Integration:** Help the user maintain their project backlog by identifying key takeaways from tangents that should be "merged" back into the main project summary.

## Response Style
- **Modular & Concise:** Provide information that can be easily categorized.
- **Git-Inspired Language:** Occasionally use terms like "forking," "merging," or "switching context" if it helps the user navigate.
- **State Recognition:** If a user says "Back to the main point," immediately drop the context of the current tangent and revert to the prior state.

## Formatting Rules
- Use LaTeX with $$...$$ for block formulas and $...$ for inline math
- Put formulas on their own line with blank lines before and after
- Use proper markdown for structure


## Operational Constraints
- Do not repeat information that exists in the parent branch unless necessary for the current task.
- If the user provides a URL or file in a parent branch, assume that knowledge persists across all child branches.
- Prioritize compute efficiency by focusing only on the active branch's specific requirements.
- When using document context, cite the document name when referencing specific information.${documentSection}`;
};

// Node type for tree traversal
interface NodeData {
  id: string;
  parent_id: string | null;
  user_message: string;
  assistant_response: string | null;
  branch_name: string | null;
  depth: number;
}

// Build path from node to root (path-based context - THE KEY COMPUTE OPTIMIZATION)
async function getPathToRoot(supabase: any, nodeId: string): Promise<NodeData[]> {
  const path: NodeData[] = [];
  let currentId: string | null = nodeId;
  
  while (currentId) {
    const { data, error }: { data: NodeData | null; error: any } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', currentId)
      .maybeSingle();
    
    if (error || !data) break;
    
    path.unshift(data); // Add to beginning (root first)
    currentId = data.parent_id;
  }
  
  return path;
}

// Convert node path to LLM messages format
function buildMessagesFromPath(path: any[]): { role: string; content: string }[] {
  const messages: { role: string; content: string }[] = [];
  
  for (const node of path) {
    messages.push({ role: 'user', content: node.user_message });
    if (node.assistant_response) {
      messages.push({ role: 'assistant', content: node.assistant_response });
    }
  }
  
  return messages;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, nodeId, userMessage, conversationId } = await req.json();
    
    let contextMessages: { role: string; content: string }[] = [];
    let depth = 1;
    let branchName: string | undefined;
    let documentContext: string | undefined;
    let folderId: string | null = null;
    
    // PATH-BASED CONTEXT MODE: If nodeId is provided, only send path from root to current node
    // This is where we save 60-70% compute - siblings/other branches are NOT included
    if (nodeId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Using path-based context for node:', nodeId);
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const path = await getPathToRoot(supabase, nodeId);
      
      depth = path.length + 1; // +1 for the new message
      branchName = path[path.length - 1]?.branch_name || undefined;
      
      contextMessages = buildMessagesFromPath(path);
      
      // Add the new user message
      if (userMessage) {
        contextMessages.push({ role: 'user', content: userMessage });
      }
      
      console.log(`Path-based context: ${path.length} nodes, depth ${depth}, branch: ${branchName || 'main'}`);

      // Check if conversation is in a folder for document context
      if (conversationId) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('folder_id, user_id')
          .eq('id', conversationId)
          .maybeSingle();
        
        if (conv?.folder_id && conv.user_id) {
          const folderIdStr = conv.folder_id as string;
          console.log('Conversation in folder:', folderIdStr);
          
          // Get the latest user message for searching
          const searchQuery = userMessage || path[path.length - 1]?.user_message;
          if (searchQuery) {
            const docResults = await searchDocuments(supabase, folderIdStr, searchQuery, conv.user_id);
            if (docResults.length > 0) {
              documentContext = docResults
                .map(d => `**From "${d.documentName}":**\n${d.content}`)
                .join('\n\n---\n\n');
              console.log(`Found ${docResults.length} relevant document chunks`);
            }
          }
        }
      }
    } else if (messages) {
      // FALLBACK: Traditional messages array (backward compatibility)
      console.log('Using traditional messages array');
      
      // Input validation
      if (!Array.isArray(messages)) {
        console.error('Invalid messages format');
        return new Response(
          JSON.stringify({ error: 'Invalid messages format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (messages.length > MAX_MESSAGES) {
        console.error('Too many messages:', messages.length);
        return new Response(
          JSON.stringify({ error: 'Too many messages in conversation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      for (const msg of messages) {
        if (!msg.role || !msg.content) {
          console.error('Invalid message structure');
          return new Response(
            JSON.stringify({ error: 'Invalid message structure' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH) {
          console.error('Message too long:', msg.content.length);
          return new Response(
            JSON.stringify({ error: 'Message exceeds maximum length' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      contextMessages = messages;
      depth = messages.filter((m: any) => m.role === 'user').length;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either messages or nodeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Chat request with', contextMessages.length, 'context messages');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the full message array with yTangent system prompt
    const fullMessages = [
      { role: 'system', content: getSystemPrompt(depth, branchName, documentContext) },
      ...contextMessages
    ];

    console.log('Calling Lovable AI with', fullMessages.length, 'total messages');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Streaming response from AI gateway');
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
