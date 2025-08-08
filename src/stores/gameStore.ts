import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GuessResult, LetterStatus } from '@/types';
import { GameState as ImportedGameState } from '@/types/game';
import { 
  WordConstraints, 
  buildConstraintsFromGuesses,
  filterWords 
} from '@/services/gameEngine';
import { 
  getWordRecommendations,
  EntropyResult 
} from '@/services/entropyCalculator';
import { getWordsByLength } from '@/services/wordlistService';

interface GameState {
  // 游戏配置
  wordLength: number;
  maxGuesses: number;
  
  // 游戏状态
  guesses: GuessResult[];
  currentConstraints: WordConstraints;
  possibleWords: string[];
  recommendations: EntropyResult[];
  
  // UI状态
  isCalculating: boolean;
  error: string | null;
  
  // Actions
  setWordLength: (length: number) => Promise<void>;
  addGuess: (word: string, statuses: LetterStatus[]) => void;
  updateGuess: (index: number, word: string, statuses: LetterStatus[]) => void;
  removeGuess: (index: number) => void;
  clearGuesses: () => Promise<void>;
  calculateRecommendations: () => Promise<void>;
  setGameState: (gameState: ImportedGameState) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // 初始状态
      wordLength: 5,
      maxGuesses: 6,
      guesses: [{ word: '', letterStatuses: Array(5).fill('absent') }], // 默认一行
      currentConstraints: new WordConstraints(),
      possibleWords: [],
      recommendations: [],
      isCalculating: false,
      error: null,
      
      // 设置单词长度
      setWordLength: async (length) => {
        set({
          wordLength: length,
          guesses: [{ word: '', letterStatuses: Array(length).fill('absent') }], // 默认一行
          currentConstraints: new WordConstraints(),
          possibleWords: [],
          recommendations: [],
          error: null
        });
        
        // 自动获取开局词推荐
        try {
          const allWords = await getWordsByLength(length);
          const recommendations = getWordRecommendations(
            allWords,
            allWords, // 初始时所有词都是可能答案
            new WordConstraints(),
            true // isFirstGuess
          );
          
          set({ recommendations });
        } catch (error) {
          console.error('获取开局词推荐失败:', error);
        }
      },
      
      // 添加猜测
      addGuess: (word, statuses) => {
        if (word && word.length !== get().wordLength) return;
        
        const guess: GuessResult = { word, letterStatuses: statuses };
        set(state => ({
          guesses: [...state.guesses, guess],
          recommendations: [] // 清空推荐，需要重新计算
        }));
      },
      
      // 更新猜测
      updateGuess: (index, word, statuses) => {
        const state = get();
        if (index < 0 || index >= state.guesses.length) return;
        if (!word || word.length !== state.wordLength) return;
        
        const newGuesses = [...state.guesses];
        newGuesses[index] = { word, letterStatuses: statuses };
        
        set({
          guesses: newGuesses,
          recommendations: [] // 清空推荐，需要重新计算
        });
      },
      
      // 删除猜测
      removeGuess: (index) => {
        set(state => ({
          guesses: state.guesses.filter((_, i) => i !== index),
          recommendations: [] // 清空推荐，需要重新计算
        }));
      },
      
      // 清空所有猜测
      clearGuesses: async () => {
        const state = get();
        
        // 重置为初始状态，保留一个空行
        set({
          guesses: [{ word: '', letterStatuses: Array(state.wordLength).fill('absent') }], // 保留一个空行
          currentConstraints: new WordConstraints(),
          possibleWords: [],
          recommendations: [],
          error: null
        });
        
        // 重新获取开局词推荐
        try {
          const allWords = await getWordsByLength(state.wordLength);
          const recommendations = getWordRecommendations(
            allWords,
            allWords, // 初始时所有词都是可能答案
            new WordConstraints(),
            true // isFirstGuess
          );
          
          set({ recommendations });
        } catch (error) {
          console.error('获取开局词推荐失败:', error);
        }
      },
      
      // 设置游戏状态（从OCR识别结果）
      setGameState: (gameState: ImportedGameState) => {
        console.log('setGameState被调用，收到数据:', gameState);
        const guesses: GuessResult[] = [];
        
        // 检测单词长度
        let detectedWordLength = 5; // 默认5
        for (const row of gameState.rows) {
          if (row.length > 0) {
            detectedWordLength = row.length;
            break;
          }
        }
        console.log('检测到单词长度:', detectedWordLength);
        
        // 将OCR识别的游戏状态转换为内部格式
        for (const row of gameState.rows) {
          const word = row.map(cell => cell.letter).join('');
          
          const letterStatuses: LetterStatus[] = row.map(cell => {
            switch (cell.state) {
              case 'correct': return 'correct';
              case 'present': return 'present';
              case 'absent': return 'absent';
              default: return 'absent';
            }
          });
          
          // 只添加非空行或有状态的行
          const hasContent = word.trim() !== '' || letterStatuses.some(s => s === 'correct' || s === 'present');
          if (hasContent) {
            guesses.push({ word, letterStatuses });
          }
        }
        
        // 如果没有识别到任何猜测，添加一个空行
        if (guesses.length === 0) {
          guesses.push({ 
            word: '', 
            letterStatuses: Array(detectedWordLength).fill('absent') 
          });
        }
        
        console.log('准备更新状态，猜测列表:', JSON.stringify(guesses, null, 2));
        
        set({
          wordLength: detectedWordLength,
          guesses,
          recommendations: [],
          error: null
        });
        
        console.log('状态更新完成');
      },
      
      // 计算推荐
      calculateRecommendations: async () => {
        const state = get();
        
        // 过滤掉空的猜测
        const validGuesses = state.guesses.filter(g => g.word.trim() !== '');
        
        // 验证是否有有效猜测
        if (validGuesses.length === 0) {
          set({ error: '请先输入至少一个猜测' });
          return;
        }
        
        set({ isCalculating: true, error: null });
        
        try {
          // 获取所有该长度的单词
          const allWords = await getWordsByLength(state.wordLength);
          
          // 根据猜测构建约束
          const constraints = buildConstraintsFromGuesses(validGuesses);
          
          // 过滤可能的单词
          const possibleWords = filterWords(allWords, constraints);
          
          if (possibleWords.length === 0) {
            set({
              error: '没有找到符合条件的单词，请检查输入是否正确',
              possibleWords: [],
              recommendations: [],
              currentConstraints: constraints
            });
            return;
          }
          
          // 获取推荐
          const isFirstGuess = state.guesses.length === 0;
          const recommendations = getWordRecommendations(
            allWords,
            possibleWords,
            constraints,
            isFirstGuess
          );
          
          set({
            currentConstraints: constraints,
            possibleWords,
            recommendations,
            error: null
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '计算失败，请重试'
          });
        } finally {
          set({ isCalculating: false });
        }
      }
    }),
    {
      name: 'wordle-game-store',
      partialize: (state) => ({
        wordLength: state.wordLength,
        guesses: state.guesses
      })
    }
  )
);