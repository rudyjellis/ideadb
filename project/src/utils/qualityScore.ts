import type { ExtractedIdea } from '../types/idea';

export function calculateQualityScore(idea: ExtractedIdea): number {
  let score = 0;

  // Completeness of fields (30 points)
  const fields = [
    idea.title,
    idea.summary,
    idea.arr_potential,
    idea.pricing,
    idea.target_market,
    idea.market_size,
    idea.time_to_mvp,
    idea.capital_needed,
    idea.competition_level,
    idea.required_skills?.length > 0 ? 'yes' : null,
    idea.market_type,
    idea.founder_fit_tags?.length > 0 ? 'yes' : null,
    idea.growth_channels,
    idea.key_risks,
    idea.key_opportunities,
  ];

  const filledFields = fields.filter(
    (field) => field && field.trim() !== ''
  ).length;
  const completenessScore = (filledFields / fields.length) * 30;
  score += completenessScore;

  // Competition level (20 points)
  if (idea.competition_level) {
    const level = idea.competition_level.toLowerCase();
    if (level.includes('low')) {
      score += 20;
    } else if (level.includes('medium')) {
      score += 12;
    } else if (level.includes('high')) {
      score += 5;
    }
  }

  // ARR potential presence and quality (20 points)
  if (idea.arr_potential && idea.arr_potential.trim() !== '') {
    score += 10; // Base points for having ARR data

    // Bonus points if it contains actual numbers
    if (/\d/.test(idea.arr_potential)) {
      score += 10;
    }
  }

  // Market size data (15 points)
  if (idea.market_size && idea.market_size.trim() !== '') {
    score += 8; // Base points for having market size

    // Bonus points if it contains actual numbers or analysis
    if (/\d/.test(idea.market_size)) {
      score += 7;
    }
  }

  // Time to MVP feasibility (15 points)
  if (idea.time_to_mvp) {
    const time = idea.time_to_mvp.toLowerCase();

    // Short time to MVP is better
    if (time.includes('week') || time.includes('1 month') || time.includes('2 month')) {
      score += 15;
    } else if (time.includes('3 month') || time.includes('4 month')) {
      score += 12;
    } else if (time.includes('month')) {
      score += 8;
    } else if (time.includes('year')) {
      score += 3;
    }
  }

  // Ensure score is between 0 and 100
  return Math.min(Math.max(Math.round(score), 0), 100);
}
