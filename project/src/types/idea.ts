export interface ExtractedIdea {
  title: string;
  summary: string;
  arr_potential: string;
  pricing: string;
  target_market: string;
  market_size: string;
  time_to_mvp: string;
  capital_needed: string;
  competition_level: string;
  required_skills: string[];
  market_type: string;
  founder_fit_tags: string[];
  growth_channels: string;
  key_risks: string;
  key_opportunities: string;
  competitors_mentioned: string;
  original_link: string;
}

export interface GeneratedDocuments {
  prd: string;
  gtm: string;
  marketing: string;
}

export interface ProcessedIdea extends ExtractedIdea, GeneratedDocuments {
  quality_score: number;
}

export type ProcessStep =
  | 'fetching-url'
  | 'extracting'
  | 'generating-prd'
  | 'generating-gtm'
  | 'generating-marketing'
  | 'saving'
  | 'complete';

export interface ProcessProgress {
  step: ProcessStep;
  stepNumber: number;
  totalSteps: number;
  message: string;
}
