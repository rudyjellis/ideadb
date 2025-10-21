import { useState, useEffect } from 'react';
import { FileText, Download, Package, Link, CheckCircle, Database, AlertCircle, Play, Eye, Loader2, Save } from 'lucide-react';
import ProgressIndicator from '../components/ProgressIndicator';
import ApiKeyPrompt from '../components/ApiKeyPrompt';
import BalanceWarningBanner from '../components/BalanceWarningBanner';
import { useApiKey } from '../hooks/useApiKey';
import { extractIdeaData, generatePRD, generateGTM, generateMarketingPlan } from '../services/claude';
import { createIdea } from '../services/ideas';
import { calculateQualityScore } from '../utils/qualityScore';
import { downloadMarkdown, downloadAsZip, getDocumentFilename } from '../utils/download';
import { fetchUrlContent } from '../utils/urlFetcher';
import { supabase } from '../lib/supabase';
import type { ProcessProgress, ExtractedIdea, GeneratedDocuments } from '../types/idea';
import {
  createGenerationSession,
  updateGenerationSession,
  getActiveGenerationSession,
  markSessionCompleted,
  markSessionFailed,
  deleteGenerationSession,
} from '../services/generationSessions';
import type { GenerationSession } from '../types/database';

interface ExtractIdeaProps {
  onNavigateToSettings: () => void;
  onNavigateToViewIdeas?: () => void;
}

export default function ExtractIdea({ onNavigateToSettings, onNavigateToViewIdeas }: ExtractIdeaProps) {
  const { hasApiKey, loading: apiKeyLoading } = useApiKey();
  const [emailPreview, setEmailPreview] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const [extractedIdea, setExtractedIdea] = useState<ExtractedIdea | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocuments | null>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbSaveError, setDbSaveError] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [currentSession, setCurrentSession] = useState<GenerationSession | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [activeSession, setActiveSession] = useState<GenerationSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedIdeaId, setSavedIdeaId] = useState<string | null>(null);
  const [contentSource, setContentSource] = useState<string>('email_preview');
  const [urlFetchedAt, setUrlFetchedAt] = useState<Date | null>(null);
  const [urlFetchFailed, setUrlFetchFailed] = useState(false);

  useEffect(() => {
    checkForActiveSession();
  }, []);

  const checkForActiveSession = async () => {
    const session = await getActiveGenerationSession();
    if (session && session.status !== 'completed' && session.status !== 'failed') {
      setActiveSession(session);
      setShowResumePrompt(true);
    }
  };

  const restoreSessionState = (session: GenerationSession) => {
    setEmailPreview(session.email_preview);
    setContentUrl(session.content_url);

    if (session.extracted_idea) {
      setExtractedIdea(session.extracted_idea as unknown as ExtractedIdea);
    }

    if (session.prd_content || session.gtm_content || session.marketing_content) {
      setDocuments({
        prd: session.prd_content || '',
        gtm: session.gtm_content || '',
        marketing: session.marketing_content || '',
      });
    }

    if (session.quality_score) {
      setQualityScore(session.quality_score);
    }

    const stepMap: Record<string, ProcessProgress> = {
      'fetching_url': { step: 'fetching-url', stepNumber: 1, totalSteps: 6, message: 'Fetching content from URL...' },
      'extracting': { step: 'extracting', stepNumber: 2, totalSteps: 6, message: 'Extracting idea data...' },
      'generating_prd': { step: 'generating-prd', stepNumber: 3, totalSteps: 6, message: 'Generating Product Requirements Document...' },
      'generating_gtm': { step: 'generating-gtm', stepNumber: 4, totalSteps: 6, message: 'Generating Go-to-Market Strategy...' },
      'generating_marketing': { step: 'generating-marketing', stepNumber: 5, totalSteps: 6, message: 'Generating Marketing Plan...' },
      'saving': { step: 'saving', stepNumber: 6, totalSteps: 6, message: 'Saving to database...' },
      'completed': { step: 'complete', stepNumber: 6, totalSteps: 6, message: 'Complete! Documents ready.' },
    };

    if (stepMap[session.status]) {
      setProgress(stepMap[session.status]);
    }

    if (session.status === 'completed') {
      setCompletedAt(new Date(session.completed_at!));
    }

    if (session.status === 'failed' && session.error_message) {
      setError(session.error_message);
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;

    setShowResumePrompt(false);
    restoreSessionState(activeSession);
    setCurrentSession(activeSession);

    if (activeSession.status !== 'completed' && activeSession.status !== 'failed') {
      await continueGeneration(activeSession);
    }
  };

  const handleDiscardSession = async () => {
    if (activeSession) {
      await deleteGenerationSession(activeSession.id);
    }
    setActiveSession(null);
    setShowResumePrompt(false);
  };

  const continueGeneration = async (session: GenerationSession) => {
    setIsProcessing(true);
    setError(null);

    try {
      let idea = session.extracted_idea as unknown as ExtractedIdea | null;
      let prd = session.prd_content;
      let gtm = session.gtm_content;
      let marketing = session.marketing_content;
      let score = session.quality_score;

      if (!idea) {
        setProgress({
          step: 'extracting',
          stepNumber: 2,
          totalSteps: 6,
          message: 'Extracting idea data...',
        });

        await updateGenerationSession(session.id, { status: 'extracting', current_step: 2 });

        idea = await extractIdeaData(session.email_preview, '');
        if (session.content_url) {
          idea.original_link = session.content_url;
        }

        score = calculateQualityScore(idea);
        setQualityScore(score);
        setExtractedIdea(idea);

        await updateGenerationSession(session.id, {
          extracted_idea: idea as any,
          quality_score: score,
        });
      }

      if (!prd && idea) {
        setProgress({
          step: 'generating-prd',
          stepNumber: 3,
          totalSteps: 6,
          message: 'Generating Product Requirements Document...',
        });

        await updateGenerationSession(session.id, { status: 'generating_prd', current_step: 3 });
        const prdResult = await generatePRD(idea);
        prd = prdResult.content;
        await updateGenerationSession(session.id, { prd_content: prd });
      }

      if (!gtm && idea) {
        setProgress({
          step: 'generating-gtm',
          stepNumber: 4,
          totalSteps: 6,
          message: 'Generating Go-to-Market Strategy...',
        });

        await updateGenerationSession(session.id, { status: 'generating_gtm', current_step: 4 });
        const gtmResult = await generateGTM(idea);
        gtm = gtmResult.content;
        await updateGenerationSession(session.id, { gtm_content: gtm });
      }

      if (!marketing && idea) {
        setProgress({
          step: 'generating-marketing',
          stepNumber: 5,
          totalSteps: 6,
          message: 'Generating Marketing Plan...',
        });

        await updateGenerationSession(session.id, { status: 'generating_marketing', current_step: 5 });
        const marketingResult = await generateMarketingPlan(idea);
        marketing = marketingResult.content;
        await updateGenerationSession(session.id, { marketing_content: marketing });
      }

      if (prd && gtm && marketing) {
        setDocuments({ prd, gtm, marketing });
      }

      setExtractedIdea(idea);
      setProgress({
        step: 'complete',
        stepNumber: 6,
        totalSteps: 6,
        message: 'Complete! Documents ready.',
      });
      setCompletedAt(new Date());

      // Store metadata from session for later save
      if (session) {
        setContentSource(session.content_source || 'email_preview');
        if (session.url_fetched_at) {
          setUrlFetchedAt(new Date(session.url_fetched_at));
        }
        setUrlFetchFailed(session.url_fetch_failed);

        // Check if already saved
        if (session.idea_id) {
          setSavedIdeaId(session.idea_id);
        }
      }
    } catch (err) {
      console.error('Error continuing generation:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      await markSessionFailed(session.id, errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtract = async () => {
    if (!emailPreview.trim() && !contentUrl.trim()) {
      setError('Please provide at least email preview or content URL');
      return;
    }

    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setExtractedIdea(null);
    setDocuments(null);
    setQualityScore(null);
    setDbSaveError(null);

    let fullContent = '';
    let contentSource = 'email_preview';
    let urlFetchFailed = false;
    let urlFetchedAt: Date | null = null;
    let session: GenerationSession | null = null;

    try {
      session = await createGenerationSession(emailPreview, contentUrl);
      setCurrentSession(session);
      // Step 1: Fetch URL content if provided
      if (contentUrl.trim()) {
        setProgress({
          step: 'fetching-url',
          stepNumber: 1,
          totalSteps: 6,
          message: 'Fetching content from URL...',
        });

        if (session) {
          await updateGenerationSession(session.id, { status: 'fetching_url', current_step: 1 });
        }

        const fetchResult = await fetchUrlContent(contentUrl);

        if (fetchResult.success) {
          fullContent = fetchResult.content;
          contentSource = emailPreview.trim() ? 'both' : 'url';
          urlFetchedAt = new Date();
        } else {
          urlFetchFailed = true;
          if (!emailPreview.trim()) {
            setError(`Failed to fetch URL: ${fetchResult.error}. Please provide email preview as fallback.`);
            setIsProcessing(false);
            return;
          }
          contentSource = 'email_preview';
        }
      }

      // Step 2: Extract data
      setProgress({
        step: 'extracting',
        stepNumber: 2,
        totalSteps: 6,
        message: 'Extracting idea data...',
      });

      if (session) {
        await updateGenerationSession(session.id, {
          status: 'extracting',
          current_step: 2,
          content_source: contentSource,
          url_fetched_at: urlFetchedAt?.toISOString(),
          url_fetch_failed: urlFetchFailed,
        });
      }

      const idea = await extractIdeaData(emailPreview, fullContent);

      if (contentUrl.trim()) {
        idea.original_link = contentUrl;
      }

      // Calculate quality score
      const score = calculateQualityScore(idea);
      setQualityScore(score);
      setExtractedIdea(idea);

      if (session) {
        await updateGenerationSession(session.id, {
          extracted_idea: idea as any,
          quality_score: score,
        });
      }

      // Step 3: Generate PRD
      setProgress({
        step: 'generating-prd',
        stepNumber: 3,
        totalSteps: 6,
        message: 'Generating Product Requirements Document...',
      });

      if (session) {
        await updateGenerationSession(session.id, { status: 'generating_prd', current_step: 3 });
      }

      const prdResult = await generatePRD(idea);
      const prd = prdResult.content;

      if (session) {
        await updateGenerationSession(session.id, { prd_content: prd });
      }

      // Step 4: Generate GTM
      setProgress({
        step: 'generating-gtm',
        stepNumber: 4,
        totalSteps: 6,
        message: 'Generating Go-to-Market Strategy...',
      });

      if (session) {
        await updateGenerationSession(session.id, { status: 'generating_gtm', current_step: 4 });
      }

      const gtmResult = await generateGTM(idea);
      const gtm = gtmResult.content;

      if (session) {
        await updateGenerationSession(session.id, { gtm_content: gtm });
      }

      // Step 5: Generate Marketing Plan
      setProgress({
        step: 'generating-marketing',
        stepNumber: 5,
        totalSteps: 6,
        message: 'Generating Marketing Plan...',
      });

      if (session) {
        await updateGenerationSession(session.id, { status: 'generating_marketing', current_step: 5 });
      }

      const marketingResult = await generateMarketingPlan(idea);
      const marketing = marketingResult.content;

      if (session) {
        await updateGenerationSession(session.id, { marketing_content: marketing });
      }

      setDocuments({ prd, gtm, marketing });
      setExtractedIdea(idea);

      // Documents are ready
      setProgress({
        step: 'complete',
        stepNumber: 6,
        totalSteps: 6,
        message: 'Complete! Documents ready.',
      });
      setCompletedAt(new Date());

      // Store metadata for later save
      setContentSource(contentSource);
      setUrlFetchedAt(urlFetchedAt);
      setUrlFetchFailed(urlFetchFailed);
    } catch (err) {
      console.error('Error processing idea:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);

      if (session) {
        await markSessionFailed(session.id, errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!extractedIdea || !documents || !qualityScore) {
      setDbSaveError('Missing required data to save');
      return;
    }

    setIsSaving(true);
    setDbSaveError(null);

    try {
      console.log('[MANUAL SAVE] Starting database save...');

      const authUser = await supabase.auth.getUser();
      if (!authUser.data.user) {
        throw new Error('User not authenticated. Please refresh the page and log in again.');
      }

      console.log('[MANUAL SAVE] User authenticated:', authUser.data.user?.id);
      console.log('[MANUAL SAVE] Creating idea with documents...');

      const savedIdea = await createIdea({
        ...extractedIdea,
        quality_score: qualityScore,
        prd_content: documents.prd,
        gtm_content: documents.gtm,
        marketing_content: documents.marketing,
        documents_generated: true,
        content_source: contentSource,
        url_fetched_at: urlFetchedAt?.toISOString(),
        url_fetch_failed: urlFetchFailed,
      });

      console.log('[MANUAL SAVE] Success! Idea ID:', savedIdea.id);
      setSavedIdeaId(savedIdea.id);

      if (currentSession) {
        await markSessionCompleted(currentSession.id, savedIdea.id);
      }
    } catch (dbError) {
      console.error('[MANUAL SAVE] Failed:', dbError);
      const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';

      let friendlyError = dbErrorMessage;
      if (dbErrorMessage.includes('session') || dbErrorMessage.includes('auth')) {
        friendlyError = 'Authentication session expired. Please refresh the page and try again.';
      } else if (dbErrorMessage.includes('permission') || dbErrorMessage.includes('policy')) {
        friendlyError = 'Database permission error. Please ensure you are logged in with the correct account.';
      }

      setDbSaveError(friendlyError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDocuments = () => {
    if (!extractedIdea || !documents) return;

    const docData = {
      title: extractedIdea.title,
      summary: extractedIdea.summary,
      qualityScore,
      prd: documents.prd,
      gtm: documents.gtm,
      marketing: documents.marketing,
      metadata: {
        arr_potential: extractedIdea.arr_potential,
        time_to_mvp: extractedIdea.time_to_mvp,
        market_type: extractedIdea.market_type,
        target_market: extractedIdea.target_market,
        pricing: extractedIdea.pricing,
        competition_level: extractedIdea.competition_level,
      }
    };

    sessionStorage.setItem('viewDocuments', JSON.stringify(docData));
    window.open('/view-documents', '_blank');
  };

  const handleReset = async () => {
    if (currentSession) {
      await deleteGenerationSession(currentSession.id);
    }

    setEmailPreview('');
    setContentUrl('');
    setExtractedIdea(null);
    setDocuments(null);
    setQualityScore(null);
    setProgress(null);
    setError(null);
    setCompletedAt(null);
    setCurrentSession(null);
    setSavedIdeaId(null);
    setDbSaveError(null);
    setContentSource('email_preview');
    setUrlFetchedAt(null);
    setUrlFetchFailed(false);

    await checkForActiveSession();
  };

  const handleDownloadPRD = () => {
    if (documents && extractedIdea) {
      downloadMarkdown(documents.prd, getDocumentFilename(extractedIdea.title, 'prd'));
    }
  };

  const handleDownloadGTM = () => {
    if (documents && extractedIdea) {
      downloadMarkdown(documents.gtm, getDocumentFilename(extractedIdea.title, 'gtm'));
    }
  };

  const handleDownloadMarketing = () => {
    if (documents && extractedIdea) {
      downloadMarkdown(documents.marketing, getDocumentFilename(extractedIdea.title, 'marketing'));
    }
  };

  const handleDownloadAll = async () => {
    if (documents && extractedIdea) {
      await downloadAsZip(extractedIdea.title, documents.prd, documents.gtm, documents.marketing);
    }
  };

  if (apiKeyLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BalanceWarningBanner />

      {showResumePrompt && activeSession && (
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Resume Previous Generation?</h3>
                <p className="text-sm text-blue-700 mb-4">
                  You have an incomplete document generation. Would you like to resume where you left off to avoid duplicate API costs?
                </p>
                <div className="bg-white rounded-lg p-3 mb-4 border border-blue-200">
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Status:</span> <span className="text-gray-700">{activeSession.status.replace(/_/g, ' ')}</span></div>
                    <div><span className="font-medium">Step:</span> <span className="text-gray-700">{activeSession.current_step} of {activeSession.total_steps}</span></div>
                    {activeSession.email_preview && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="font-medium">Preview:</span>
                        <p className="text-gray-600 text-xs mt-1 line-clamp-2">{activeSession.email_preview}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleResumeSession}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume Generation
                  </button>
                  <button
                    onClick={handleDiscardSession}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Start Fresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Extract Startup Idea</h1>
          <p className="text-gray-600">
            Provide a URL or email preview to automatically extract and generate comprehensive documents. URLs are fetched automatically, while email previews serve as a snapshot for when URLs expire.
          </p>
      </div>

      {!hasApiKey && !apiKeyLoading && (
        <div className="mb-6">
          <ApiKeyPrompt onNavigateToSettings={onNavigateToSettings} />
        </div>
      )}

      {!extractedIdea && !isProcessing && (
        <div className="space-y-6">
          <div>
            <label htmlFor="emailPreview" className="block text-sm font-medium text-gray-700 mb-2">
              Email Preview
            </label>
            <textarea
              id="emailPreview"
              value={emailPreview}
              onChange={(e) => setEmailPreview(e.target.value)}
              rows={6}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
              placeholder="Paste the email preview here..."
            />
          </div>

          <div>
            <label htmlFor="contentUrl" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Link className="w-4 h-4" />
              Content URL
            </label>
            <input
              id="contentUrl"
              type="url"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
              placeholder="https://www.ideabrowser.com/idea/your-idea-here"
            />
            <p className="mt-1 text-xs text-gray-500">
              Note: URLs from IdeaBrowser are only available for 24 hours. Email preview serves as a backup.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleExtract}
            disabled={!hasApiKey || isProcessing}
            className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Extract & Generate Documents'}
          </button>
        </div>
      )}

      {isProcessing && progress && (
        <div className="py-8">
          <ProgressIndicator progress={progress} />
        </div>
      )}

      {extractedIdea && documents && progress?.step === 'complete' && (
        <div className="space-y-6">

          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-green-800 mb-2">
                  Documents Generated Successfully!
                </h2>
                <p className="text-sm text-green-700">
                  Completed at {completedAt?.toLocaleTimeString()} on {completedAt?.toLocaleDateString()}
                </p>
                {savedIdeaId && (
                  <p className="text-sm text-green-700 mt-1 flex items-center gap-1">
                    <Database className="w-4 h-4" />
                    Saved to database for future access
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">All Documents Generated</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>PRD Complete</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>GTM Complete</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>Marketing Complete</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{extractedIdea.title}</h3>
              <p className="text-gray-600 mb-4">{extractedIdea.summary}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">ARR Potential:</span>
                  <span className="ml-2 text-gray-600">{extractedIdea.arr_potential || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Time to MVP:</span>
                  <span className="ml-2 text-gray-600">{extractedIdea.time_to_mvp || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Market Type:</span>
                  <span className="ml-2 text-gray-600">{extractedIdea.market_type || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Quality Score:</span>
                  <span className="ml-2 text-blue-600 font-semibold">{qualityScore}/100</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleViewDocuments}
              className="py-4 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Eye className="w-5 h-5" />
              View Documents in New Tab
            </button>

            <button
              onClick={handleDownloadAll}
              className="py-4 px-6 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Package className="w-5 h-5" />
              Download All as ZIP
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Save to Database
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Save this idea to your database for easy access, searching, and tracking. You can view all saved ideas in the Ideas Database.
            </p>

            {savedIdeaId ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Saved to database successfully!</span>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleSaveToDatabase}
                  disabled={isSaving}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save to Database
                    </>
                  )}
                </button>

                {dbSaveError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 mb-1">Failed to save to database</p>
                        <p className="text-xs text-red-700">{dbSaveError}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Download Individual Documents
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleDownloadPRD}
                className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                PRD
              </button>

              <button
                onClick={handleDownloadGTM}
                className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                GTM Strategy
              </button>

              <button
                onClick={handleDownloadMarketing}
                className="py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Marketing Plan
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {savedIdeaId && onNavigateToViewIdeas && (
              <button
                onClick={onNavigateToViewIdeas}
                className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Database className="w-5 h-5" />
                View All Ideas in Database
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex-1 py-3 px-6 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Extract Another Idea
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
