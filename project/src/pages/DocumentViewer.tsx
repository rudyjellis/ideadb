import { useEffect, useState } from 'react';
import { FileText, TrendingUp, Megaphone, X } from 'lucide-react';

interface DocumentData {
  title: string;
  summary: string;
  qualityScore: number | null;
  prd: string;
  gtm: string;
  marketing: string;
  metadata: {
    arr_potential?: string;
    time_to_mvp?: string;
    market_type?: string;
    target_market?: string;
    pricing?: string;
    competition_level?: string;
  };
}

type DocumentType = 'prd' | 'gtm' | 'marketing';

export default function DocumentViewer() {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [activeTab, setActiveTab] = useState<DocumentType>('prd');

  useEffect(() => {
    const storedData = sessionStorage.getItem('viewDocuments');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setDocumentData(data);
      } catch (error) {
        console.error('Failed to parse document data:', error);
      }
    }
  }, []);

  if (!documentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <p className="text-gray-600 mb-4">No document data found.</p>
          <p className="text-sm text-gray-500">Please generate documents first before viewing them.</p>
          <button
            onClick={() => window.close()}
            className="mt-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'prd' as DocumentType, label: 'Product Requirements', icon: FileText, content: documentData.prd },
    { id: 'gtm' as DocumentType, label: 'Go-to-Market Strategy', icon: TrendingUp, content: documentData.gtm },
    { id: 'marketing' as DocumentType, label: 'Marketing Plan', icon: Megaphone, content: documentData.marketing },
  ];

  const activeDocument = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{documentData.title}</h1>
              <p className="text-sm text-gray-600 mt-1">{documentData.summary}</p>
            </div>
            <button
              onClick={() => window.close()}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close window"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {documentData.metadata && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              {documentData.metadata.arr_potential && (
                <div>
                  <span className="font-medium text-gray-700">ARR Potential:</span>
                  <div className="text-gray-600">{documentData.metadata.arr_potential}</div>
                </div>
              )}
              {documentData.metadata.time_to_mvp && (
                <div>
                  <span className="font-medium text-gray-700">Time to MVP:</span>
                  <div className="text-gray-600">{documentData.metadata.time_to_mvp}</div>
                </div>
              )}
              {documentData.metadata.market_type && (
                <div>
                  <span className="font-medium text-gray-700">Market Type:</span>
                  <div className="text-gray-600">{documentData.metadata.market_type}</div>
                </div>
              )}
              {documentData.qualityScore !== null && (
                <div>
                  <span className="font-medium text-gray-700">Quality Score:</span>
                  <div className="text-blue-600 font-semibold">{documentData.qualityScore}/100</div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="prose prose-blue max-w-none">
            <div className="markdown-content">
              {activeDocument?.content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold text-gray-900 mt-8 mb-4">{line.substring(2)}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-bold text-gray-900 mt-6 mb-3">{line.substring(3)}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-semibold text-gray-900 mt-5 mb-2">{line.substring(4)}</h3>;
                } else if (line.startsWith('#### ')) {
                  return <h4 key={index} className="text-lg font-semibold text-gray-800 mt-4 mb-2">{line.substring(5)}</h4>;
                } else if (line.startsWith('- ')) {
                  return <li key={index} className="text-gray-700 ml-4 mb-1">{line.substring(2)}</li>;
                } else if (line.startsWith('* ')) {
                  return <li key={index} className="text-gray-700 ml-4 mb-1">{line.substring(2)}</li>;
                } else if (line.trim().match(/^\d+\. /)) {
                  const match = line.trim().match(/^\d+\. (.*)$/);
                  return <li key={index} className="text-gray-700 ml-4 mb-1">{match?.[1] || line}</li>;
                } else if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={index} className="font-bold text-gray-900 mt-3 mb-2">{line.substring(2, line.length - 2)}</p>;
                } else if (line.trim() === '') {
                  return <div key={index} className="h-4"></div>;
                } else if (line.trim()) {
                  return <p key={index} className="text-gray-700 leading-relaxed mb-3">{line}</p>;
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .sticky { position: relative !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
