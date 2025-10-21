import { supabase } from '../lib/supabase';
import type { GenerationSession, GenerationSessionUpdate } from '../types/database';

export async function createGenerationSession(
  emailPreview: string,
  contentUrl: string
): Promise<GenerationSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('generation_sessions')
    .insert({
      user_id: user.id,
      email_preview: emailPreview,
      content_url: contentUrl,
      status: 'pending',
      current_step: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create generation session: ${error.message}`);
  }

  return data;
}

export async function updateGenerationSession(
  sessionId: string,
  updates: GenerationSessionUpdate
): Promise<GenerationSession> {
  const { data, error } = await supabase
    .from('generation_sessions')
    .update({
      ...updates,
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update generation session: ${error.message}`);
  }

  return data;
}

export async function getActiveGenerationSession(): Promise<GenerationSession | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('generation_sessions')
    .select()
    .eq('user_id', user.id)
    .in('status', ['pending', 'fetching_url', 'extracting', 'generating_prd', 'generating_gtm', 'generating_marketing', 'saving'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to get active session:', error);
    return null;
  }

  return data;
}

export async function getGenerationSession(sessionId: string): Promise<GenerationSession | null> {
  const { data, error } = await supabase
    .from('generation_sessions')
    .select()
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Failed to get session:', error);
    return null;
  }

  return data;
}

export async function markSessionCompleted(
  sessionId: string,
  ideaId: string
): Promise<GenerationSession> {
  return updateGenerationSession(sessionId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    idea_id: ideaId,
  });
}

export async function markSessionFailed(
  sessionId: string,
  errorMessage: string
): Promise<GenerationSession> {
  return updateGenerationSession(sessionId, {
    status: 'failed',
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  });
}

export async function deleteGenerationSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('generation_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to delete generation session: ${error.message}`);
  }
}

export async function cleanupOldSessions(): Promise<void> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { error } = await supabase
    .from('generation_sessions')
    .delete()
    .lt('created_at', threeDaysAgo.toISOString())
    .in('status', ['completed', 'failed']);

  if (error) {
    console.error('Failed to cleanup old sessions:', error);
  }
}
