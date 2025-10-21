import { supabase } from '../lib/supabase';
import type { Idea, IdeaInsert, IdeaUpdate } from '../types/database';

export async function createIdea(idea: IdeaInsert): Promise<Idea> {
  console.log('[IDEAS SERVICE] createIdea called');
  console.log('[IDEAS SERVICE] Idea object keys:', Object.keys(idea));
  console.log('[IDEAS SERVICE] Documents generated flag:', idea.documents_generated);
  console.log('[IDEAS SERVICE] Has PRD content:', !!idea.prd_content);
  console.log('[IDEAS SERVICE] Has GTM content:', !!idea.gtm_content);
  console.log('[IDEAS SERVICE] Has Marketing content:', !!idea.marketing_content);

  const { data: { user } } = await supabase.auth.getUser();
  console.log('[IDEAS SERVICE] Current user:', user?.id, user?.email);

  if (!user) {
    console.error('[IDEAS SERVICE] No authenticated user found');
    throw new Error('You must be logged in to create ideas');
  }

  const ideaToInsert = { ...idea, user_id: user.id };
  console.log('[IDEAS SERVICE] Attempting to insert idea with user_id:', user.id);
  console.log('[IDEAS SERVICE] Idea title:', ideaToInsert.title);
  console.log('[IDEAS SERVICE] Full idea payload (truncated):', {
    ...ideaToInsert,
    prd_content: ideaToInsert.prd_content ? `[${ideaToInsert.prd_content.length} chars]` : null,
    gtm_content: ideaToInsert.gtm_content ? `[${ideaToInsert.gtm_content.length} chars]` : null,
    marketing_content: ideaToInsert.marketing_content ? `[${ideaToInsert.marketing_content.length} chars]` : null,
  });

  const { data, error } = await supabase
    .from('ideas')
    .insert(ideaToInsert)
    .select()
    .single();

  if (error) {
    console.error('[IDEAS SERVICE] Insert failed:', error.message);
    console.error('[IDEAS SERVICE] Error code:', error.code);
    console.error('[IDEAS SERVICE] Error details:', error.details);
    console.error('[IDEAS SERVICE] Error hint:', error.hint);
    console.error('[IDEAS SERVICE] Full error object:', JSON.stringify(error, null, 2));

    // Provide more helpful error messages
    if (error.code === '23505') {
      throw new Error('An idea with this title already exists');
    } else if (error.code === '23502') {
      throw new Error(`Missing required field: ${error.message}`);
    } else if (error.code === '23503') {
      throw new Error('Your account profile is out of sync. Please sign out and sign back in to refresh your session.');
    } else if (error.code === '42501') {
      throw new Error('Permission denied. Please ensure you are logged in and your session is valid.');
    } else if (error.message.includes('row-level security')) {
      throw new Error('Database security check failed. Your session may have expired. Please refresh the page and try again.');
    }

    throw error;
  }

  console.log('[IDEAS SERVICE] Idea created successfully with ID:', data.id);
  console.log('[IDEAS SERVICE] Saved idea has documents_generated:', data.documents_generated);
  return data;
}

export async function getIdeas(): Promise<Idea[]> {
  console.log('[IDEAS SERVICE] getIdeas called');

  const { data: { user } } = await supabase.auth.getUser();
  console.log('[IDEAS SERVICE] Fetching ideas for user:', user?.id, user?.email);

  if (!user) {
    console.error('[IDEAS SERVICE] No authenticated user for fetching ideas');
    throw new Error('You must be logged in to view ideas');
  }

  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('date_added', { ascending: false });

  if (error) {
    console.error('[IDEAS SERVICE] Fetch failed:', error.message);
    console.error('[IDEAS SERVICE] Error code:', error.code);
    console.error('[IDEAS SERVICE] Error details:', error);
    throw error;
  }

  console.log('[IDEAS SERVICE] Found', data?.length || 0, 'ideas');
  if (data && data.length > 0) {
    console.log('[IDEAS SERVICE] First idea:', data[0].title, 'ID:', data[0].id);
    console.log('[IDEAS SERVICE] First idea user_id:', data[0].user_id);
    console.log('[IDEAS SERVICE] First idea documents_generated:', data[0].documents_generated);
    console.log('[IDEAS SERVICE] First idea has PRD:', !!data[0].prd_content);
  } else {
    console.log('[IDEAS SERVICE] No ideas found for this user');
  }

  return data || [];
}

export async function getIdeaById(id: string): Promise<Idea | null> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateIdea(id: string, updates: IdeaUpdate): Promise<Idea> {
  const { data, error } = await supabase
    .from('ideas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabase.from('ideas').delete().eq('id', id);

  if (error) throw error;
}

export async function searchIdeas(query: string): Promise<Idea[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
    .order('date_added', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function filterIdeasByTag(tag: string): Promise<Idea[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .contains('founder_fit_tags', [tag])
    .order('date_added', { ascending: false });

  if (error) throw error;
  return data || [];
}
