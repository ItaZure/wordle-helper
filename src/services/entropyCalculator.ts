/**
 * 基于最大熵原理的单词推理算法
 * 
 * 熵的计算原理：
 * 1. 对于每个候选词，计算它作为猜测词时可能产生的所有反馈模式
 * 2. 每种反馈模式会将候选词集合分成不同的子集
 * 3. 熵 = -Σ(p_i * log2(p_i))，其中p_i是每个子集的概率
 * 4. 熵越大，说明这个猜测词能更均匀地分割候选词集合，获得的信息越多
 */

import { createGuessResult, WordConstraints } from './gameEngine';
import { LetterStatus } from '@/types';

// 表示一种反馈模式（例如：绿黄灰灰绿）
type FeedbackPattern = string;

// 单词推荐结果
export interface EntropyResult {
  word: string;
  entropy: number;           // 信息熵
  expectedRemaining: number;  // 期望剩余候选词数
  patternDistribution: Map<FeedbackPattern, number>; // 反馈模式分布
}

/**
 * 将字母状态数组转换为模式字符串
 * 例如：['correct', 'absent', 'present'] → 'CAP'
 */
function statusesToPattern(statuses: LetterStatus[]): FeedbackPattern {
  return statuses.map(s => {
    switch (s) {
      case 'correct': return 'C';
      case 'present': return 'P';
      case 'absent': return 'A';
    }
  }).join('');
}

/**
 * 计算一个猜测词的信息熵
 * @param guessWord 猜测词
 * @param possibleAnswers 所有可能的答案
 * @returns 信息熵值和模式分布
 */
export function calculateEntropy(
  guessWord: string,
  possibleAnswers: string[]
): { entropy: number; patternDistribution: Map<FeedbackPattern, number> } {
  
  // 统计每种反馈模式出现的次数
  const patternCounts = new Map<FeedbackPattern, number>();
  
  // 对每个可能的答案，计算会产生什么反馈
  for (const answer of possibleAnswers) {
    const result = createGuessResult(guessWord, answer);
    const pattern = statusesToPattern(result.letterStatuses);
    
    patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
  }
  
  // 计算信息熵
  let entropy = 0;
  const total = possibleAnswers.length;
  
  for (const count of patternCounts.values()) {
    if (count > 0) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
  }
  
  return { entropy, patternDistribution: patternCounts };
}

/**
 * 根据最大熵原理推荐最佳猜测词
 * @param candidateWords 候选猜测词（可以包含已排除的词）
 * @param possibleAnswers 可能的答案（满足当前约束的词）
 * @param topN 返回前N个推荐
 */
export function recommendWordsByEntropy(
  candidateWords: string[],
  possibleAnswers: string[],
  topN: number = 5
): EntropyResult[] {
  
  // 如果剩余可能答案很少，直接猜其中一个
  if (possibleAnswers.length <= 2) {
    return possibleAnswers.slice(0, topN).map(word => ({
      word,
      entropy: 0,
      expectedRemaining: 1,
      patternDistribution: new Map()
    }));
  }
  
  // 计算每个候选词的熵
  const results: EntropyResult[] = [];
  
  for (const word of candidateWords) {
    const { entropy, patternDistribution } = calculateEntropy(word, possibleAnswers);
    
    // 计算期望剩余候选词数
    let expectedRemaining = 0;
    for (const [pattern, count] of patternDistribution) {
      const probability = count / possibleAnswers.length;
      // 如果是全绿（CCCCC），剩余就是0，否则是这个子集的大小
      const remaining = pattern === 'C'.repeat(word.length) ? 0 : count;
      expectedRemaining += probability * remaining;
    }
    
    results.push({
      word,
      entropy,
      expectedRemaining,
      patternDistribution
    });
  }
  
  // 按熵降序排序
  results.sort((a, b) => {
    // 优先选择熵大的
    if (Math.abs(a.entropy - b.entropy) > 0.001) {
      return b.entropy - a.entropy;
    }
    // 熵相同时，优先选择可能是答案的词
    const aIsAnswer = possibleAnswers.includes(a.word);
    const bIsAnswer = possibleAnswers.includes(b.word);
    if (aIsAnswer !== bIsAnswer) {
      return aIsAnswer ? -1 : 1;
    }
    // 其他情况按期望剩余数升序
    return a.expectedRemaining - b.expectedRemaining;
  });
  
  return results.slice(0, topN);
}

/**
 * 获取最优开局词（预计算）
 * 这些是基于词库计算出的高熵开局词
 */
export function getBestOpeningWords(wordLength: number): string[] {
  const openingWords: { [key: number]: string[] } = {
    3: ['SEA', 'EAT', 'TEA'],
    4: ['SALE', 'TALE', 'SEAT'],
    5: ['TEARS', 'RATES', 'RAISE'],
    6: ['RAISED', 'MASTER', 'SECTOR'],
    7: ['PARTIES', 'DETAILS', 'CERTAIN'],
    8: ['ARTICLES', 'DOCTRINE', 'REACTION'],
    9: ['CENTURIES', 'REACTIONS', 'COUNTRIES'],
    10: ['CATEGORIES', 'SECURITIES', 'DIRECTIONS'],
    11: ['DESCRIPTION', 'DESTRUCTION', 'INSTRUCTION']
  };
  
  return openingWords[wordLength] || [];
}

/**
 * 完整的推荐流程
 */
export function getWordRecommendations(
  allWords: string[],          // 所有词库中的词
  possibleAnswers: string[],   // 满足当前约束的词
  _constraints: WordConstraints,
  isFirstGuess: boolean = false
): EntropyResult[] {
  
  // 第一次猜测使用预设的高熵词
  if (isFirstGuess && possibleAnswers.length > 0) {
    const wordLength = possibleAnswers[0].length;
    const openingWords = getBestOpeningWords(wordLength);
    
    if (openingWords.length > 0) {
      // 计算预设词的熵
      return openingWords.map(word => {
        const { entropy, patternDistribution } = calculateEntropy(word, possibleAnswers);
        return {
          word,
          entropy,
          expectedRemaining: possibleAnswers.length * 0.2, // 估计值
          patternDistribution
        };
      });
    }
  }
  
  // 候选词策略：
  // 1. 如果剩余可能答案少于50个，只从可能答案中选择
  // 2. 否则，从所有词中选择（可能选择已被排除的词以获得更多信息）
  let candidateWords: string[];
  
  if (possibleAnswers.length < 50) {
    candidateWords = possibleAnswers;
  } else {
    // 从所有词中选择，但限制数量以提高性能
    candidateWords = allWords
      .filter(word => word.length === possibleAnswers[0].length)
      .slice(0, 1000); // 限制计算量
  }
  
  return recommendWordsByEntropy(candidateWords, possibleAnswers, 5);
}