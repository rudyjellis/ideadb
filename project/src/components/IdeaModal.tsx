import { useState } from 'react';
import { X, Download, Package } from 'lucide-react';
import type { Idea } from '../types/database';
import { downloadMarkdown, downloadAsZip, getDocumentFilename } from '../utils/download';

interface IdeaModalProps {
  idea: Idea;
  onClose: () => void;
  onUpdate: (notes: string) => void;
}

type Tab = 'overview' | 'documents' | 'notes';

export default function IdeaModal({ idea, onClose, onUpdate }: IdeaModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [notes, setNotes] = useState(idea.personal_notes || '');

  const handleSaveNotes = () => {
    onUpdate(notes);
  };

  const handleDownloadPRD = () => {
    if (idea.prd_content) {
      downloadMarkdown(idea.prd_content, getDocumentFilename(idea.title, 'prd'));
    }
  };

  const handleDownloadGTM = () => {
    if (idea.gtm_content) {
      downloadMarkdown(idea.gtm_content, getDocumentFilename(idea.title, 'gtm'));
    }
  };

  const handleDownloadMarketing = () => {
    if (idea.marketing_content) {
      downloadMarkdown(idea.marketing_content, getDocumentFilename(idea.title, 'marketing'));
    }
  };

  const handleDownloadAll = async () => {
    if (idea.prd_content && idea.gtm_content && idea.marketing_content) {
      await downloadAsZip(idea.title, idea.prd_content, idea.gtm_content, idea.marketing_content);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{idea.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'documents'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'notes'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Notes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {idea.summary && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
                  <p className="text-gray-600">{idea.summary}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {idea.arr_potential && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">ARR Potential</h3>
                    <p className="text-gray-600">{idea.arr_potential}</p>
                  </div>
                )}

                {idea.pricing && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Pricing</h3>
                    <p className="text-gray-600">{idea.pricing}</p>
                  </div>
                )}

                {idea.target_market && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Target Market</h3>
                    <p className="text-gray-600">{idea.target_market}</p>
                  </div>
                )}

                {idea.market_size && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Market Size</h3>
                    <p className="text-gray-600">{idea.market_size}</p>
                  </div>
                )}

                {idea.time_to_mvp && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Time to MVP</h3>
                    <p className="text-gray-600">{idea.time_to_mvp}</p>
                  </div>
                )}

                {idea.capital_needed && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Capital Needed</h3>
                    <p className="text-gray-600">{idea.capital_needed}</p>
                  </div>
                )}

                {idea.competition_level && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Competition</h3>
                    <p className="text-gray-600">{idea.competition_level}</p>
                  </div>
                )}

                {idea.market_type && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Market Type</h3>
                    <p className="text-gray-600">{idea.market_type}</p>
                  </div>
                )}

                {idea.quality_score !== null && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Quality Score</h3>
                    <p className="text-indigo-600 font-semibold">{idea.quality_score}/100</p>
                  </div>
                )}
              </div>

              {idea.required_skills && idea.required_skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {idea.required_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {idea.founder_fit_tags && idea.founder_fit_tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Founder Fit Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {idea.founder_fit_tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {idea.growth_channels && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Growth Channels</h3>
                  <p className="text-gray-600">{idea.growth_channels}</p>
                </div>
              )}

              {idea.key_opportunities && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Key Opportunities</h3>
                  <p className="text-gray-600">{idea.key_opportunities}</p>
                </div>
              )}

              {idea.key_risks && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Key Risks</h3>
                  <p className="text-gray-600">{idea.key_risks}</p>
                </div>
              )}

              {idea.competitors_mentioned && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Competitors</h3>
                  <p className="text-gray-600">{idea.competitors_mentioned}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {idea.documents_generated ? (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleDownloadAll}
                      className="py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Download All as ZIP
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Product Requirements Document</h3>
                        <button
                          onClick={handleDownloadPRD}
                          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download PRD.md
                        </button>
                      </div>
                      <div className="text-sm text-gray-600 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
                        <pre className="whitespace-pre-wrap font-sans">
                          {idea.prd_content?.substring(0, 500)}...
                        </pre>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Go-to-Market Strategy</h3>
                        <button
                          onClick={handleDownloadGTM}
                          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download GTM.md
                        </button>
                      </div>
                      <div className="text-sm text-gray-600 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
                        <pre className="whitespace-pre-wrap font-sans">
                          {idea.gtm_content?.substring(0, 500)}...
                        </pre>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Marketing Plan</h3>
                        <button
                          onClick={handleDownloadMarketing}
                          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download Marketing.md
                        </button>
                      </div>
                      <div className="text-sm text-gray-600 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
                        <pre className="whitespace-pre-wrap font-sans">
                          {idea.marketing_content?.substring(0, 500)}...
                        </pre>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No documents generated for this idea yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Add your personal notes about this idea..."
                />
              </div>
              <button
                onClick={handleSaveNotes}
                className="py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Save Notes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
