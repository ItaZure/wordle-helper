import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GuessResult, LetterStatus } from '@/types';
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
  setWordLength: (length: number) => void;
  addGuess: (word: string, statuses: LetterStatus[]) => void;
  updateGuess: (index: number, word: string, statuses: LetterStatus[]) => void;
  removeGuess: (index: number) => void;
  clearGuesses: () => void;
  calculateRecommendations: () => Promise<void>;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // 初始状态
      wordLength: 5,
      maxGuesses: 6,
      guesses: [],
      currentConstraints: new WordConstraints(),
      possibleWords: [],
      recommendations: [],
      isCalculating: false,
      error: null,
      
      // 设置单词长度
      setWordLength: (length) => {
        set({
          wordLength: length,
          guesses: [],
          currentConstraints: new WordConstraints(),
          possibleWords: [],
          recommendations: [],
          error: null
        });
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
      clearGuesses: () => {
        set({
          guesses: [],
          currentConstraints: new WordConstraints(),
          possibleWords: [],
          recommendations: [],
          error: null
        });
      },
      
      // 计算推荐
      calculateRecommendations: async () => {
        const state = get();
        
        // 验证是否有猜测
        if (state.guesses.length === 0) {
          set({ error: '请先输入至少一个猜测' });
          return;
        }
        
        set({ isCalculating: true, error: null });
        
        try {
          // 获取所有该长度的单词
          const allWords = await getWordsByLength(state.wordLength);
          
          // 根据猜测构建约束
          const constraints = buildConstraintsFromGuesses(state.guesses);
          
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