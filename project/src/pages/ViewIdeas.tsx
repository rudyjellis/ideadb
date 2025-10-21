import { useEffect, useState } from 'react';
import { Search, Trash2, FileText, RefreshCw, Download, Sparkles, Package } from 'lucide-react';
import IdeaModal from '../components/IdeaModal';
import { getIdeas, deleteIdea, updateIdea } from '../services/ideas';
import { generatePRD, generateGTM, generateMarketingPlan } from '../services/claude';
import { downloadAsZip } from '../utils/download';
import type { Idea } from '../types/database';

const FOUNDER_TAGS = [
  'technical_founder',
  'design_founder',
  'marketing_founder',
  'quick_shipper',
  'bootstrapper',
  'funded',
  'nights_weekends',
  'hardware_experience',
  'b2b_sales',
];

export default function ViewIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<Idea[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  useEffect(() => {
    loadIdeas();
  }, []);

  useEffect(() => {
    filterAndSearchIdeas();
  }, [ideas, searchQuery, selectedTag]);

  const loadIdeas = async () => {
    try {
      setIsLoading(true);
      const data = await getIdeas();
      setIdeas(data);
    } catch (error) {
      console.error('Error loading ideas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isRecentlyAdded = (dateAdded: string) => {
    const ideaDate = new Date(dateAdded);
    const now = new Date();
    const diffInMinutes = (now.getTime() - ideaDate.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  };

  const getMostRecentIdea = () => {
    if (filteredIdeas.length === 0) return null;
    return filteredIdeas.reduce((latest, current) => {
      return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
    });
  };

  const mostRecentIdea = getMostRecentIdea();

  const filterAndSearchIdeas = () => {
    let filtered = ideas;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (idea) =>
          idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          idea.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(
        (idea) => idea.founder_fit_tags && idea.founder_fit_tags.includes(selectedTag)
      );
    }

    setFilteredIdeas(filtered);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this idea?')) {
      try {
        await deleteIdea(id);
        setIdeas(ideas.filter((idea) => idea.id !== id));
      } catch (error) {
        console.error('Error deleting idea:', error);
        alert('Failed to delete idea');
      }
    }
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!selectedIdea) return;

    try {
      await updateIdea(selectedIdea.id, { personal_notes: notes });
      setIdeas(
        ideas.map((idea) =>
          idea.id === selectedIdea.id ? { ...idea, personal_notes: notes } : idea
        )
      );
      setSelectedIdea({ ...selectedIdea, personal_notes: notes });
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('Failed to save notes');
    }
  };

  const handleRegenerateDocuments = async (idea: Idea) => {
    if (
      !confirm(
        'This will regenerate all documents with fresh AI content. Continue?'
      )
    ) {
      return;
    }

    setRegeneratingId(idea.id);

    try {
      const prdResult = await generatePRD({
        title: idea.title,
        summary: idea.summary || '',
        arr_potential: idea.arr_potential || '',
        pricing: idea.pricing || '',
        target_market: idea.target_market || '',
        market_size: idea.market_size || '',
        time_to_mvp: idea.time_to_mvp || '',
        capital_needed: idea.capital_needed || '',
        competition_level: idea.competition_level || '',
        required_skills: idea.required_skills || [],
        market_type: idea.market_type || '',
        founder_fit_tags: idea.founder_fit_tags || [],
        growth_channels: idea.growth_channels || '',
        key_risks: idea.key_risks || '',
        key_opportunities: idea.key_opportunities || '',
        competitors_mentioned: idea.competitors_mentioned || '',
        original_link: idea.original_link || '',
      });

      const gtmResult = await generateGTM({
        title: idea.title,
        summary: idea.summary || '',
        arr_potential: idea.arr_potential || '',
        pricing: idea.pricing || '',
        target_market: idea.target_market || '',
        market_size: idea.market_size || '',
        time_to_mvp: idea.time_to_mvp || '',
        capital_needed: idea.capital_needed || '',
        competition_level: idea.competition_level || '',
        required_skills: idea.required_skills || [],
        market_type: idea.market_type || '',
        founder_fit_tags: idea.founder_fit_tags || [],
        growth_channels: idea.growth_channels || '',
        key_risks: idea.key_risks || '',
        key_opportunities: idea.key_opportunities || '',
        competitors_mentioned: idea.competitors_mentioned || '',
        original_link: idea.original_link || '',
      });

      const marketingResult = await generateMarketingPlan({
        title: idea.title,
        summary: idea.summary || '',
        arr_potential: idea.arr_potential || '',
        pricing: idea.pricing || '',
        target_market: idea.target_market || '',
        market_size: idea.market_size || '',
        time_to_mvp: idea.time_to_mvp || '',
        capital_needed: idea.capital_needed || '',
        competition_level: idea.competition_level || '',
        required_skills: idea.required_skills || [],
        market_type: idea.market_type || '',
        founder_fit_tags: idea.founder_fit_tags || [],
        growth_channels: idea.growth_channels || '',
        key_risks: idea.key_risks || '',
        key_opportunities: idea.key_opportunities || '',
        competitors_mentioned: idea.competitors_mentioned || '',
        original_link: idea.original_link || '',
      });

      const prd = prdResult.content;
      const gtm = gtmResult.content;
      const marketing = marketingResult.content;

      await updateIdea(idea.id, {
        prd_content: prd,
        gtm_content: gtm,
        marketing_content: marketing,
        documents_generated: true,
      });

      setIdeas(
        ideas.map((i) =>
          i.id === idea.id
            ? {
                ...i,
                prd_content: prd,
                gtm_content: gtm,
                marketing_content: marketing,
                documents_generated: true,
              }
            : i
        )
      );

      alert('Documents regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating documents:', error);
      alert('Failed to regenerate documents');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleQuickDownload = async (e: React.MouseEvent, idea: Idea) => {
    e.stopPropagation();
    if (idea.prd_content && idea.gtm_content && idea.marketing_content) {
      await downloadAsZip(idea.title, idea.prd_content, idea.gtm_content, idea.marketing_content);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Title',
      'Summary',
      'ARR Potential',
      'Pricing',
      'Target Market',
      'Market Size',
      'Time to MVP',
      'Capital Needed',
      'Competition Level',
      'Required Skills',
      'Market Type',
      'Founder Fit Tags',
      'Growth Channels',
      'Key Risks',
      'Key Opportunities',
      'Competitors',
      'Quality Score',
      'Status',
      'Date Added',
    ];

    const rows = filteredIdeas.map((idea) => [
      idea.title,
      idea.summary || '',
      idea.arr_potential || '',
      idea.pricing || '',
      idea.target_market || '',
      idea.market_size || '',
      idea.time_to_mvp || '',
      idea.capital_needed || '',
      idea.competition_level || '',
      (idea.required_skills || []).join(', '),
      idea.market_type || '',
      (idea.founder_fit_tags || []).join(', '),
      idea.growth_channels || '',
      idea.key_risks || '',
      idea.key_opportunities || '',
      idea.competitors_mentioned || '',
      idea.quality_score?.toString() || '',
      idea.status,
      idea.date_added,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `startup-ideas-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Startup Ideas</h1>
            <p className="text-gray-600">Manage and explore your extracted ideas</p>
          </div>
          <button
            onClick={exportToCSV}
            className="py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Tags</option>
            {FOUNDER_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mostRecentIdea && filteredIdeas.length > 0 && !isLoading && (
        <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">Latest Idea</h3>
                <p className="text-sm text-blue-700">{mostRecentIdea.title}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedIdea(mostRecentIdea)}
              className="py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading ideas...</p>
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No ideas found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ARR Potential
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time to MVP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredIdeas.map((idea) => {
                  const isRecent = isRecentlyAdded(idea.created_at);
                  const isLatest = mostRecentIdea?.id === idea.id;
                  return (
                    <tr
                      key={idea.id}
                      onClick={() => setSelectedIdea(idea)}
                      className={`cursor-pointer transition-colors ${
                        isLatest
                          ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isRecent && (
                            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                          <div className="text-sm font-medium text-gray-900">{idea.title}</div>
                        </div>
                      {idea.founder_fit_tags && idea.founder_fit_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {idea.founder_fit_tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs"
                            >
                              {tag.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {idea.founder_fit_tags.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              +{idea.founder_fit_tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {idea.arr_potential || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {idea.time_to_mvp || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-indigo-600">
                        {idea.quality_score || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {idea.documents_generated ? (
                        <span className="text-green-600">✓ Generated</span>
                      ) : (
                        <span className="text-gray-400">⏳ Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {idea.documents_generated && (
                          <button
                            onClick={(e) => handleQuickDownload(e, idea)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Download All Documents as ZIP"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIdea(idea);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View & Download Documents"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegenerateDocuments(idea);
                          }}
                          disabled={regeneratingId === idea.id}
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          title="Regenerate Documents"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${
                              regeneratingId === idea.id ? 'animate-spin' : ''
                            }`}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(idea.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
