// 游戏相关的数据结构

// 字母状态：绿色(正确位置)、黄色(存在但位置错误)、灰色(不存在)
export type LetterStatus = 'correct' | 'present' | 'absent';

// 单次猜测的结果
export interface GuessResult {
  word: string;                         // 猜测的单词
  letterStatuses: LetterStatus[];      // 每个字母的状态
}

// 游戏属性
export interface GameConfig {
  wordLength: number;                   // 目标单词的长度
  maxAttempts: number;                  // 最大猜测次数
}

// 当前游戏状态
export interface GameState {
  config: GameConfig;                   // 游戏配置
  guesses: GuessResult[];              // 已猜测的单词列表
  isComplete: boolean;                  // 游戏是否结束
}

// 单词推荐结果
export interface WordRecommendation {
  word: string;                         // 推荐的单词
  entropy: number;                      // 信息熵值
  possibleOutcomes: number;             // 可能的结果数
}