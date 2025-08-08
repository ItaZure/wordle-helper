import React from 'react';
import { EntropyResult } from '@/services/entropyCalculator';

interface RecommendationDisplayProps {
  recommendations: EntropyResult[];
  loading?: boolean;
  error?: string;
  isFirstGuess?: boolean;
}

export const RecommendationDisplay: React.FC<RecommendationDisplayProps> = ({
  recommendations,
  loading = false,
  error,
  isFirstGuess = false
}) => {
  if (loading) {
    return (
      <div className="p-6 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">正在计算最优单词...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p className="font-medium">错误：</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500">
        <p>选择单词长度后将显示推荐的开局词</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        {isFirstGuess ? '推荐开局词' : '推荐单词'}
      </h3>
      <div className="space-y-2">
        {recommendations.map((rec, index) => (
          <div 
            key={rec.word}
            className="flex items-center justify-between p-3 bg-white rounded border border-green-200
              hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <span className="text-2xl font-bold text-gray-400 mr-3">
                {index + 1}
              </span>
              <span className="text-xl font-bold text-gray-800">
                {rec.word}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                熵值: <span className="font-mono font-bold">{rec.entropy.toFixed(3)}</span>
              </div>
              <div className="text-xs text-gray-500">
                期望剩余: {rec.expectedRemaining.toFixed(1)}个
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};