import { X, Lightbulb, Key, FileText, DollarSign } from 'lucide-react';

interface WelcomeModalProps {
  onClose: () => void;
  onNavigateToSettings: () => void;
}

export default function WelcomeModal({ onClose, onNavigateToSettings }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-lg p-2">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome to Startup Idea Database</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-lg text-gray-700 mb-4">
              Transform startup ideas from IdeaBrowser emails into actionable business documents automatically.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0">
                <Key className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Step 1: Add Your API Key</h3>
                <p className="text-sm text-gray-600">
                  Get a Claude API key from Anthropic Console and add it in Settings. Your key is stored securely and never shared.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-green-50 rounded-lg">
              <div className="flex-shrink-0">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Step 2: Set Your Balance</h3>
                <p className="text-sm text-gray-600">
                  Enter your current Anthropic account balance in Settings to track spending and receive low balance alerts.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-orange-50 rounded-lg">
              <div className="flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Step 3: Extract Ideas</h3>
                <p className="text-sm text-gray-600">
                  Paste email previews or URLs from IdeaBrowser. The system will automatically extract key information and analyze the opportunity.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-purple-50 rounded-lg">
              <div className="flex-shrink-0">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Step 4: Generate Documents</h3>
                <p className="text-sm text-gray-600">
                  Automatically create Product Requirements Documents (PRD), Go-to-Market strategies, and Marketing Plans ready for execution.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">What You'll Get:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Structured idea analysis with quality scoring</li>
              <li>• Comprehensive PRDs with user stories and technical requirements</li>
              <li>• Go-to-Market strategies with timelines and budget allocation</li>
              <li>• Bottoms-up marketing plans with actionable tactics</li>
              <li>• All documents downloadable as Markdown files</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                onClose();
                onNavigateToSettings();
              }}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add API Key to Get Started
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
