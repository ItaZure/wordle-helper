import { GameConfig } from '@/components/GameConfig';
import { GuessInput } from '@/components/GuessInput';
import { RecommendationDisplay } from '@/components/RecommendationDisplay';
import { useGameStore } from '@/stores/gameStore';

function App() {
  const {
    wordLength,
    guesses,
    recommendations,
    isCalculating,
    error,
    setWordLength,
    addGuess,
    updateGuess,
    removeGuess,
    clearGuesses,
    calculateRecommendations
  } = useGameStore();

  const handleAddRow = () => {
    addGuess('', Array(wordLength).fill('absent'));
  };

  return (
    <div className="w-full min-h-[600px] p-6 bg-white">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Wordle 助手
      </h1>
      
      {/* 游戏配置 */}
      <GameConfig 
        wordLength={wordLength}
        onWordLengthChange={setWordLength}
      />
      
      {/* 猜测输入区 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">猜测记录</h2>
          {guesses.length > 0 && (
            <button
              onClick={clearGuesses}
              className="text-sm text-red-500 hover:text-red-700"
            >
              清空所有
            </button>
          )}
        </div>
        
        {guesses.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded text-center text-gray-500 mb-3">
            还没有猜测记录，点击下方按钮开始
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            {guesses.map((guess, index) => (
              <GuessInput
                key={index}
                wordLength={wordLength}
                guessIndex={index}
                initialWord={guess.word}
                initialStatuses={guess.letterStatuses}
                onGuessChange={(word, statuses) => updateGuess(index, word, statuses)}
                onRemove={() => removeGuess(index)}
              />
            ))}
          </div>
        )}
        
        <button
          onClick={handleAddRow}
          className="w-full py-2 bg-blue-500 text-white rounded font-medium
            hover:bg-blue-600 transition-colors"
        >
          + 新增一行
        </button>
      </div>
      
      {/* 推荐按钮 */}
      <button
        onClick={calculateRecommendations}
        disabled={isCalculating || guesses.length === 0}
        className={`w-full py-3 mb-6 rounded font-medium transition-colors
          ${guesses.length === 0 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : isCalculating
            ? 'bg-blue-400 text-white cursor-wait'
            : 'bg-green-500 text-white hover:bg-green-600'
          }`}
      >
        {isCalculating ? '计算中...' : '推荐单词'}
      </button>
      
      {/* 推荐结果 */}
      <RecommendationDisplay
        recommendations={recommendations}
        loading={isCalculating}
        error={error || undefined}
      />
      
      {/* 统计信息 */}
      {recommendations.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
          <p>剩余可能单词: {useGameStore.getState().possibleWords.length} 个</p>
        </div>
      )}
    </div>
  );
}

export default App;