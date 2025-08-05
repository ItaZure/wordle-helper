import React, { useState, useEffect } from 'react';
import { LetterStatus } from '@/types';

interface GuessInputProps {
  wordLength: number;
  guessIndex: number;
  initialWord?: string;
  initialStatuses?: LetterStatus[];
  onGuessChange: (word: string, statuses: LetterStatus[]) => void;
  onRemove: () => void;
}

export const GuessInput: React.FC<GuessInputProps> = ({
  wordLength,
  guessIndex,
  initialWord = '',
  initialStatuses = [],
  onGuessChange,
  onRemove
}) => {
  const [letters, setLetters] = useState<string[]>(() => 
    initialWord.split('').concat(Array(wordLength - initialWord.length).fill(''))
  );
  const [statuses, setStatuses] = useState<LetterStatus[]>(() => 
    initialStatuses.length ? initialStatuses : Array(wordLength).fill('absent')
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 当字长变化时重置
  useEffect(() => {
    const newLetters = Array(wordLength).fill('');
    const newStatuses: LetterStatus[] = Array(wordLength).fill('absent');
    
    // 保留原有的字母和状态
    for (let i = 0; i < Math.min(wordLength, letters.length); i++) {
      if (letters[i]) {
        newLetters[i] = letters[i];
        newStatuses[i] = statuses[i];
      }
    }
    
    setLetters(newLetters);
    setStatuses(newStatuses);
  }, [wordLength]);

  // 通知父组件
  useEffect(() => {
    const word = letters.join('').toUpperCase();
    onGuessChange(word, statuses);
  }, [letters, statuses]);

  const handleLetterChange = (index: number, value: string) => {
    if (!/^[a-zA-Z]?$/.test(value)) return;
    
    const newLetters = [...letters];
    newLetters[index] = value.toUpperCase();
    setLetters(newLetters);
    
    // 自动跳到下一格
    if (value && index < wordLength - 1) {
      const nextInput = document.getElementById(`letter-${guessIndex}-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !letters[index] && index > 0) {
      // 如果当前格子为空，删除前一格
      const prevInput = document.getElementById(`letter-${guessIndex}-${index - 1}`);
      prevInput?.focus();
      handleLetterChange(index - 1, '');
    } else if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = document.getElementById(`letter-${guessIndex}-${index - 1}`);
      prevInput?.focus();
    } else if (e.key === 'ArrowRight' && index < wordLength - 1) {
      const nextInput = document.getElementById(`letter-${guessIndex}-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleStatusChange = (status: LetterStatus) => {
    if (selectedIndex !== null) {
      const newStatuses = [...statuses];
      newStatuses[selectedIndex] = status;
      setStatuses(newStatuses);
    }
  };

  const getStatusColor = (status: LetterStatus) => {
    switch (status) {
      case 'correct': return 'bg-green-500 text-white';
      case 'present': return 'bg-yellow-500 text-white';
      case 'absent': return 'bg-gray-300 text-gray-800';
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <span className="text-sm text-gray-600 mr-2">猜测 {guessIndex + 1}:</span>
        <button
          onClick={onRemove}
          className="ml-auto text-red-500 hover:text-red-700 text-sm"
        >
          删除
        </button>
      </div>
      
      <div className="flex gap-1 mb-2">
        {letters.map((letter, index) => (
          <input
            key={index}
            id={`letter-${guessIndex}-${index}`}
            type="text"
            value={letter}
            onChange={(e) => handleLetterChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => setSelectedIndex(index)}
            maxLength={1}
            className={`flex-1 h-10 text-center text-lg font-bold rounded border-2 
              ${selectedIndex === index ? 'border-blue-500' : 'border-gray-300'}
              ${getStatusColor(statuses[index])}
              transition-all duration-200`}
            style={{ minWidth: '30px' }}
          />
        ))}
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => handleStatusChange('absent')}
          className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm font-medium
            hover:bg-gray-400 transition-colors"
        >
          灰色
        </button>
        <button
          onClick={() => handleStatusChange('present')}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm font-medium
            hover:bg-yellow-600 transition-colors"
        >
          黄色
        </button>
        <button
          onClick={() => handleStatusChange('correct')}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm font-medium
            hover:bg-green-600 transition-colors"
        >
          绿色
        </button>
      </div>
    </div>
  );
};