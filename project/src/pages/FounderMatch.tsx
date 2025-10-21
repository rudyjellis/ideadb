import { useState, useEffect } from 'react';
import { Target, FileText } from 'lucide-react';
import { getIdeas } from '../services/ideas';
import type { Idea } from '../types/database';
import IdeaModal from '../components/IdeaModal';
import { updateIdea } from '../services/ideas';

interface MatchedIdea {
  idea: Idea;
  matchScore: number;
  reasons: string[];
}

const SKILLS = ['code', 'design', 'marketing', 'sales'];
const BUDGET_RANGES = ['<$1K', '$1K-5K', '$5K-20K', '$20K-50K', '$50K+'];
const TIME_OPTIONS = ['full-time', 'nights-weekends'];

export default function FounderMatch() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>('');
  const [timeAvailability, setTimeAvailability] = useState<string>('');
  const [matchedIdeas, setMatchedIdeas] = useState<MatchedIdea[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const calculateMatch = async () => {
    if (selectedSkills.length === 0 || !budget || !timeAvailability) {
      alert('Please fill in all fields');
      return;
    }

    setHasSearched(true);

    const ideas = await getIdeas();
    const matches: MatchedIdea[] = [];

    for (const idea of ideas) {
      let matchScore = 0;
      const reasons: string[] = [];

      // Skills match (40%)
      const requiredSkills = idea.required_skills || [];
      if (requiredSkills.length > 0) {
        const matchingSkills = selectedSkills.filter((skill) =>
          requiredSkills.some((rs) => rs.toLowerCase().includes(skill.toLowerCase()))
        );
        const skillMatchPercent = matchingSkills.length / requiredSkills.length;
        matchScore += skillMatchPercent * 40;

        if (matchingSkills.length > 0) {
          reasons.push(
            `${matchingSkills.length} of ${requiredSkills.length} required skills match`
          );
        }
      } else {
        matchScore += 20;
      }

      // Budget match (30%)
      const capitalNeeded = idea.capital_needed || '';
      let budgetScore = 0;

      if (capitalNeeded.toLowerCase().includes('bootstrap') || capitalNeeded.toLowerCase().includes('low')) {
        if (budget === '<$1K' || budget === '$1K-5K') {
          budgetScore = 30;
          reasons.push('Low capital requirements match your budget');
        } else {
          budgetScore = 20;
        }
      } else if (capitalNeeded.includes('$')) {
        const capNeededNum = parseInt(capitalNeeded.replace(/[^0-9]/g, ''));
        const budgetNum = getBudgetNumber(budget);

        if (capNeededNum <= budgetNum) {
          budgetScore = 30;
          reasons.push('Capital requirements fit within your budget');
        } else if (capNeededNum <= budgetNum * 1.5) {
          budgetScore = 20;
          reasons.push('Capital requirements slightly above budget');
        } else {
          budgetScore = 10;
        }
      } else {
        budgetScore = 15;
      }

      matchScore += budgetScore;

      // Time match (30%)
      const timeToMvp = idea.time_to_mvp || '';
      const founderTags = idea.founder_fit_tags || [];
      let timeScore = 0;

      if (timeAvailability === 'full-time') {
        if (
          founderTags.includes('quick_shipper') ||
          timeToMvp.toLowerCase().includes('week') ||
          timeToMvp.toLowerCase().includes('1 month') ||
          timeToMvp.toLowerCase().includes('2 month')
        ) {
          timeScore = 30;
          reasons.push('Quick MVP timeline suits full-time commitment');
        } else {
          timeScore = 20;
        }
      } else {
        if (
          founderTags.includes('nights_weekends') ||
          founderTags.includes('bootstrapper')
        ) {
          timeScore = 30;
          reasons.push('Tagged for nights/weekends founders');
        } else if (
          timeToMvp.toLowerCase().includes('month') &&
          !timeToMvp.toLowerCase().includes('1 month')
        ) {
          timeScore = 20;
          reasons.push('Longer timeline works for part-time effort');
        } else {
          timeScore = 10;
        }
      }

      matchScore += timeScore;

      // Founder fit tags bonus
      const matchingTags = founderTags.filter((tag) => {
        if (selectedSkills.includes('code') && tag === 'technical_founder') return true;
        if (selectedSkills.includes('design') && tag === 'design_founder') return true;
        if (selectedSkills.includes('marketing') && tag === 'marketing_founder') return true;
        return false;
      });

      if (matchingTags.length > 0) {
        matchScore += 5;
        reasons.push(`Founder fit: ${matchingTags.join(', ')}`);
      }

      // Quality score bonus
      if (idea.quality_score && idea.quality_score > 70) {
        reasons.push(`High quality score: ${idea.quality_score}/100`);
      }

      if (matchScore > 20) {
        matches.push({
          idea,
          matchScore: Math.min(Math.round(matchScore), 100),
          reasons,
        });
      }
    }

    // Sort by combined match score and quality score
    matches.sort((a, b) => {
      const scoreA = a.matchScore + (a.idea.quality_score || 0) * 0.2;
      const scoreB = b.matchScore + (b.idea.quality_score || 0) * 0.2;
      return scoreB - scoreA;
    });

    setMatchedIdeas(matches.slice(0, 3));
  };

  const getBudgetNumber = (budgetRange: string): number => {
    if (budgetRange === '<$1K') return 1000;
    if (budgetRange === '$1K-5K') return 5000;
    if (budgetRange === '$5K-20K') return 20000;
    if (budgetRange === '$20K-50K') return 50000;
    if (budgetRange === '$50K+') return 100000;
    return 0;
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!selectedIdea) return;

    try {
      await updateIdea(selectedIdea.id, { personal_notes: notes });
      setSelectedIdea({ ...selectedIdea, personal_notes: notes });
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('Failed to save notes');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Founder Match</h1>
        <p className="text-gray-600">
          Find the best startup ideas that match your skills, budget, and availability.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Your Skills (select all that apply)
            </label>
            <div className="flex flex-wrap gap-3">
              {SKILLS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedSkills.includes(skill)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {skill.charAt(0).toUpperCase() + skill.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
              Available Budget
            </label>
            <select
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select budget range</option>
              {BUDGET_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
              Time Availability
            </label>
            <select
              id="time"
              value={timeAvailability}
              onChange={(e) => setTimeAvailability(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select time availability</option>
              {TIME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={calculateMatch}
            className="w-full py-3 px-6 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Target className="w-5 h-5" />
            Find My Best Ideas
          </button>
        </div>
      </div>

      {hasSearched && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Top Matches</h2>

          {matchedIdeas.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">
                No strong matches found. Try adjusting your criteria or add more ideas to your database.
              </p>
            </div>
          ) : (
            matchedIdeas.map((match, index) => (
              <div
                key={match.idea.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-bold">
                        #{index + 1}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900">{match.idea.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-3">{match.idea.summary}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-3xl font-bold text-indigo-600">{match.matchScore}</div>
                    <div className="text-sm text-gray-500">Match Score</div>
                    {match.idea.quality_score && (
                      <div className="text-sm text-gray-500 mt-1">
                        Quality: {match.idea.quality_score}/100
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-indigo-900 mb-2">Why it matches:</h4>
                  <ul className="space-y-1">
                    {match.reasons.map((reason, idx) => (
                      <li key={idx} className="text-sm text-indigo-700 flex items-start gap-2">
                        <span>•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium text-gray-700">ARR Potential:</span>
                    <div className="text-gray-600">{match.idea.arr_potential || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Time to MVP:</span>
                    <div className="text-gray-600">{match.idea.time_to_mvp || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Capital Needed:</span>
                    <div className="text-gray-600">{match.idea.capital_needed || 'N/A'}</div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedIdea(match.idea)}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Full Details & Documents
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {selectedIdea && (
        <IdeaModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onUpdate={handleUpdateNotes}
        />
      )}
    </div>
  );
}
