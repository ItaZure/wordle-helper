import React from 'react';

interface GameConfigProps {
  wordLength: number;
  onWordLengthChange: (length: number) => void;
}

export const GameConfig: React.FC<GameConfigProps> = ({ wordLength, onWordLengthChange }) => {
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        目标单词长度
      </label>
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="range"
            min="3"
            max="11"
            value={wordLength}
            onChange={(e) => onWordLengthChange(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
            <span>3</span>
            <span>5</span>
            <span>7</span>
            <span>9</span>
            <span>11</span>
          </div>
        </div>
        <div className="w-16 text-center">
          <span className="text-2xl font-bold text-blue-600">{wordLength}</span>
          <span className="text-sm text-gray-500 block">字母</span>
        </div>
      </div>
    </div>
  );
};