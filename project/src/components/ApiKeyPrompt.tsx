import { AlertCircle, Key } from 'lucide-react';

interface ApiKeyPromptProps {
  onNavigateToSettings: () => void;
}

export default function ApiKeyPrompt({ onNavigateToSettings }: ApiKeyPromptProps) {
  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            API Key Required
          </h3>
          <p className="text-yellow-800 mb-4">
            You need to add your Claude API key before you can extract startup ideas.
            Your API key is stored securely and used only for your requests.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onNavigateToSettings}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
            >
              <Key className="w-4 h-4" />
              Add API Key in Settings
            </button>
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-yellow-300 text-yellow-900 rounded-lg font-medium hover:bg-yellow-50 transition-colors"
            >
              Get API Key from Anthropic
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
