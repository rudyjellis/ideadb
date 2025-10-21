import { CheckCircle, Loader2 } from 'lucide-react';
import type { ProcessProgress } from '../types/idea';

interface ProgressIndicatorProps {
  progress: ProcessProgress;
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const percentage = (progress.stepNumber / progress.totalSteps) * 100;
  const isComplete = progress.step === 'complete';

  const steps = [
    { step: 'fetching-url', label: 'Fetch URL Content' },
    { step: 'extracting', label: 'Extract Idea Data' },
    { step: 'generating-prd', label: 'Generate PRD' },
    { step: 'generating-gtm', label: 'Generate GTM Strategy' },
    { step: 'generating-marketing', label: 'Generate Marketing Plan' },
    { step: 'saving', label: 'Save to Database' },
  ];

  const getStepStatus = (stepIndex: number) => {
    if (progress.stepNumber > stepIndex + 1) return 'complete';
    if (progress.stepNumber === stepIndex + 1) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-base font-bold tracking-wide px-4 py-2 rounded-lg ${
            isComplete
              ? 'text-green-700 bg-green-50 border border-green-200'
              : 'text-blue-700 bg-blue-50 border border-blue-200'
          }`}>
            {isComplete ? 'COMPLETE' : `STEP ${progress.stepNumber}/${progress.totalSteps}`}
          </span>
          <span className={`text-2xl font-bold ${
            isComplete ? 'text-green-600' : 'text-blue-600'
          }`}>
            {Math.round(percentage)}%
          </span>
        </div>

        <div className="overflow-hidden h-4 flex rounded-full bg-gray-200 shadow-inner">
          <div
            style={{ width: `${percentage}%` }}
            className={`shadow-sm flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-700 ease-out ${
              isComplete ? 'bg-green-600' : 'bg-blue-600'
            }`}
          ></div>
        </div>

        <p className={`text-center text-lg font-medium ${
          isComplete ? 'text-green-700' : 'text-gray-800'
        }`}>
          {progress.message}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Processing Steps</h3>
        <div className="space-y-3">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <div
                key={step.step}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  status === 'active'
                    ? 'bg-blue-50 border border-blue-200 shadow-sm'
                    : status === 'complete'
                    ? 'bg-green-50'
                    : 'bg-gray-50'
                }`}
              >
                {status === 'complete' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : status === 'active' ? (
                  <Loader2 className="w-6 h-6 text-blue-600 flex-shrink-0 animate-spin" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}
                <span className={`text-base flex-1 ${
                  status === 'complete'
                    ? 'text-green-700 font-medium'
                    : status === 'active'
                    ? 'text-blue-700 font-bold'
                    : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
