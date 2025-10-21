import { AlertTriangle, X } from 'lucide-react';
import { formatCost } from '../utils/costCalculator';

interface CostWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  estimatedCost: { min: number; max: number; estimate: number };
  operationType: string;
  threshold: number;
}

export default function CostWarningModal({
  isOpen,
  onClose,
  onConfirm,
  estimatedCost,
  operationType,
  threshold,
}: CostWarningModalProps) {
  if (!isOpen) return null;

  const exceedsThreshold = estimatedCost.estimate > threshold;

  const getOperationLabel = (type: string): string => {
    const labels: Record<string, string> = {
      extract_idea: 'Extract Idea',
      generate_prd: 'Generate PRD',
      generate_gtm: 'Generate GTM Strategy',
      generate_marketing: 'Generate Marketing Plan',
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${exceedsThreshold ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${exceedsThreshold ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {exceedsThreshold ? 'High Cost Warning' : 'Estimated Cost'}
              </h3>
              <p className="text-sm text-gray-600">{getOperationLabel(operationType)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">
                {formatCost(estimatedCost.estimate)}
              </span>
              <span className="text-sm text-gray-500">estimated</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <span>Range: {formatCost(estimatedCost.min)} - {formatCost(estimatedCost.max)}</span>
            </div>
          </div>

          {exceedsThreshold && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                This operation exceeds your alert threshold of {formatCost(threshold)}.
                You can adjust this threshold in Settings.
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600">
            The actual cost will be determined by the exact number of tokens used.
            Costs are based on Claude Sonnet 4 pricing: $3 per million input tokens and $15 per million output tokens.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
