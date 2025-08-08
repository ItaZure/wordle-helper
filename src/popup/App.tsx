import { useEffect, useState } from 'react';
import { GameConfig } from '@/components/GameConfig';
import { GuessInput } from '@/components/GuessInput';
import { RecommendationDisplay } from '@/components/RecommendationDisplay';
import { useGameStore } from '@/stores/gameStore';
import { imageRecognitionService } from '@/services/imageRecognition';
import { Camera } from 'lucide-react';

function App() {
  console.log('=== App组件加载了 ===');
  console.log('当前时间:', new Date().toLocaleTimeString());
  
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
  
  const [isCapturing, setIsCapturing] = useState(false);
  
  console.log('当前状态 - isCapturing:', isCapturing);
  console.log('当前状态 - wordLength:', wordLength);
  console.log('当前状态 - guesses数量:', guesses.length);

  // 初始化时加载默认长度的推荐词
  useEffect(() => {
    console.log('=== useEffect初始化执行 ===');
    if (recommendations.length === 0 && guesses.length === 0) {
      setWordLength(wordLength);
    }
    
    // 检查是否有截图结果
    chrome.storage.local.get(['capturedGameState', 'captureError', 'timestamp'], (result) => {
      if (result.capturedGameState && result.timestamp) {
        // 如果是最近5秒内的截图结果
        if (Date.now() - result.timestamp < 5000) {
          const gameState = result.capturedGameState;
          const { setGameState } = useGameStore.getState();
          setGameState(gameState);
          calculateRecommendations();
          
          // 清除存储的结果
          chrome.storage.local.remove(['capturedGameState', 'timestamp']);
        }
      } else if (result.captureError && result.timestamp) {
        if (Date.now() - result.timestamp < 5000) {
          alert('截图识别失败: ' + result.captureError);
          chrome.storage.local.remove(['captureError', 'timestamp']);
        }
      }
    });
  }, []);

  const handleAddRow = () => {
    addGuess('', Array(wordLength).fill('absent'));
  };
  
  const handleCapture = async () => {
    console.log('handleCapture被调用');
    setIsCapturing(true);
    try {
      console.log('开始截图...');
      // 先执行截图，再关闭窗口
      const screenshotDataUrl = await imageRecognitionService.captureScreenArea();
      console.log('截图完成，开始识别...');
      
      const gameState = await imageRecognitionService.recognizeGameState(screenshotDataUrl);
      console.log('识别结果:', gameState);
      
      // 使用setGameState直接更新状态
      const { setGameState } = useGameStore.getState();
      setGameState(gameState);
      
      // 如果有识别到内容，计算推荐
      if (gameState.rows.some(row => row.some(cell => cell.letter !== ''))) {
        await calculateRecommendations();
      }
      
      setIsCapturing(false);
    } catch (error) {
      console.error('截图失败:', error);
      if ((error as Error).message === '用户取消选择') {
        // 用户取消，不显示错误
      } else {
        alert('截图识别失败: ' + (error as Error).message);
      }
      setIsCapturing(false);
    }
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
      
      {/* 截图按钮 */}
      <div className="mb-6">
        <button
          onClick={() => {
            console.log('按钮被点击了');
            handleCapture();
          }}
          disabled={isCapturing}
          className={`w-full py-3 rounded font-medium transition-colors flex items-center justify-center gap-2
            ${
              isCapturing
                ? 'bg-gray-400 text-white cursor-wait'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
        >
          <Camera size={20} />
          {isCapturing ? '正在截图...' : '截图识别游戏状态'}
        </button>
      </div>
      
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
        disabled={isCalculating || !guesses.some(g => g.word.trim() !== '')}
        className={`w-full py-3 mb-6 rounded font-medium transition-colors
          ${!guesses.some(g => g.word.trim() !== '') 
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
        isFirstGuess={!guesses.some(g => g.word.trim() !== '')}
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