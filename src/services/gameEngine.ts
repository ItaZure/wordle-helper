/**
 * Wordle 游戏核心引擎
 * 包含数据结构定义和筛选算法
 */

import { LetterStatus, GuessResult } from '@/types';

// 字母出现的详细信息
export interface LetterOccurrence {
  position: number;
  status: LetterStatus;
}

// 字母数量约束
export interface LetterCount {
  exact?: number;  // 精确数量
  min?: number;    // 最少数量
}

// 单词约束条件
export class WordConstraints {
  correctLetters: Map<number, string> = new Map();      // 位置 -> 正确字母
  presentLetters: Set<string> = new Set();              // 存在但位置未定的字母
  absentLetters: Set<string> = new Set();               // 不存在的字母
  wrongPositions: Map<string, Set<number>> = new Map(); // 字母 -> 错误位置集合
  letterCounts: Map<string, LetterCount> = new Map();   // 字母 -> 数量约束
}

/**
 * 根据猜测词和目标词创建猜测结果
 */
export function createGuessResult(word: string, target: string): GuessResult {
  word = word.toUpperCase();
  target = target.toUpperCase();
  
  const letterStatuses: LetterStatus[] = new Array(word.length).fill('absent');
  const targetChars = target.split('');
  
  // 第一遍：标记绿色（正确位置）
  for (let i = 0; i < word.length; i++) {
    if (word[i] === targetChars[i]) {
      letterStatuses[i] = 'correct';
      targetChars[i] = ''; // 标记已使用
    }
  }
  
  // 第二遍：标记黄色（存在但位置错误）
  for (let i = 0; i < word.length; i++) {
    if (letterStatuses[i] === 'absent' && targetChars.includes(word[i])) {
      letterStatuses[i] = 'present';
      // 找到并移除第一个匹配
      const index = targetChars.indexOf(word[i]);
      if (index !== -1) {
        targetChars[index] = '';
      }
    }
  }
  
  return { word, letterStatuses };
}

/**
 * 获取按字母分组的详细信息
 */
export function getLetterDetails(guess: GuessResult): Map<string, LetterOccurrence[]> {
  const details = new Map<string, LetterOccurrence[]>();
  
  for (let i = 0; i < guess.word.length; i++) {
    const letter = guess.word[i];
    if (!details.has(letter)) {
      details.set(letter, []);
    }
    details.get(letter)!.push({
      position: i,
      status: guess.letterStatuses[i]
    });
  }
  
  return details;
}

/**
 * 根据新的猜测结果更新约束条件
 */
export function updateConstraints(
  constraints: WordConstraints, 
  guess: GuessResult
): void {
  const letterDetails = getLetterDetails(guess);
  
  for (const [letter, occurrences] of letterDetails) {
    // 统计各种状态的数量
    const correctCount = occurrences.filter(o => o.status === 'correct').length;
    const presentCount = occurrences.filter(o => o.status === 'present').length;
    const absentCount = occurrences.filter(o => o.status === 'absent').length;
    
    // 1. 更新正确位置
    for (const occ of occurrences) {
      if (occ.status === 'correct') {
        // 检查冲突
        if (constraints.correctLetters.has(occ.position) && 
            constraints.correctLetters.get(occ.position) !== letter) {
          throw new Error(`位置${occ.position}的字母冲突`);
        }
        constraints.correctLetters.set(occ.position, letter);
      }
    }
    
    // 2. 更新存在但位置未定的字母
    // 只有当字母没有任何确定位置时才加入presentLetters
    if (presentCount > 0 && correctCount === 0) {
      const hasCorrectPosition = Array.from(constraints.correctLetters.values())
        .includes(letter);
      if (!hasCorrectPosition) {
        constraints.presentLetters.add(letter);
      }
    }
    
    // 3. 更新错误位置
    for (const occ of occurrences) {
      if (occ.status === 'present') {
        if (!constraints.wrongPositions.has(letter)) {
          constraints.wrongPositions.set(letter, new Set());
        }
        constraints.wrongPositions.get(letter)!.add(occ.position);
      }
    }
    
    // 4. 更新字母数量约束
    if (absentCount > 0) {
      // 有灰色 = 数量确定
      const exactCount = correctCount + presentCount;
      
      // 检查与已有约束的冲突
      const existing = constraints.letterCounts.get(letter);
      if (existing?.min && existing.min > exactCount) {
        throw new Error(
          `约束冲突：${letter}之前至少${existing.min}个，现在恰好${exactCount}个`
        );
      }
      
      constraints.letterCounts.set(letter, { exact: exactCount });
      
      // 如果数量为0，加入absentLetters
      if (exactCount === 0) {
        constraints.absentLetters.add(letter);
      }
    } else {
      // 全是绿色或黄色 = 至少这么多
      const minCount = correctCount + presentCount;
      
      const existing = constraints.letterCounts.get(letter);
      if (existing?.exact !== undefined) {
        // 已知精确数量，验证是否一致
        if (existing.exact < minCount) {
          throw new Error(
            `约束冲突：${letter}恰好${existing.exact}个，但现在至少需要${minCount}个`
          );
        }
      } else if (existing?.min) {
        // 更新为更大的min值
        constraints.letterCounts.set(letter, {
          min: Math.max(existing.min, minCount)
        });
      } else {
        constraints.letterCounts.set(letter, { min: minCount });
      }
    }
  }
}

/**
 * 检查单词是否满足所有约束条件
 */
export function isWordValid(word: string, constraints: WordConstraints): boolean {
  word = word.toUpperCase();
  
  // 1. 检查正确位置的字母
  for (const [position, letter] of constraints.correctLetters) {
    if (position >= word.length || word[position] !== letter) {
      return false;
    }
  }
  
  // 2. 检查必须存在但位置未定的字母
  for (const letter of constraints.presentLetters) {
    if (!word.includes(letter)) {
      return false;
    }
  }
  
  // 3. 检查不应存在的字母
  for (const letter of constraints.absentLetters) {
    if (word.includes(letter)) {
      return false;
    }
  }
  
  // 4. 检查错误位置约束
  for (const [letter, wrongPositions] of constraints.wrongPositions) {
    for (const pos of wrongPositions) {
      if (pos < word.length && word[pos] === letter) {
        return false;
      }
    }
  }
  
  // 5. 检查字母数量约束
  for (const [letter, countConstraint] of constraints.letterCounts) {
    const actualCount = word.split('').filter(c => c === letter).length;
    
    if (countConstraint.exact !== undefined && actualCount !== countConstraint.exact) {
      return false;
    }
    
    if (countConstraint.min !== undefined && actualCount < countConstraint.min) {
      return false;
    }
  }
  
  return true;
}

/**
 * 根据约束条件筛选单词列表
 */
export function filterWords(words: string[], constraints: WordConstraints): string[] {
  return words.filter(word => isWordValid(word, constraints));
}

/**
 * 从游戏状态构建约束条件
 */
export function buildConstraintsFromGuesses(guesses: GuessResult[]): WordConstraints {
  const constraints = new WordConstraints();
  
  for (const guess of guesses) {
    updateConstraints(constraints, guess);
  }
  
  return constraints;
}