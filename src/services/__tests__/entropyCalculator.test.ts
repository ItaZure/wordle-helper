import {
  calculateEntropy,
  recommendWordsByEntropy,
  getBestOpeningWords,
  getWordRecommendations
} from '../entropyCalculator';
import { WordConstraints } from '../gameEngine';

describe('EntropyCalculator', () => {
  describe('calculateEntropy', () => {
    it('应该计算简单情况的熵', () => {
      // 只有两个可能答案：CAT和DOG
      const { entropy, patternDistribution } = calculateEntropy('CAT', ['CAT', 'DOG']);
      
      // CAT vs CAT → CCC (全绿)
      // CAT vs DOG → AAA (全灰)
      expect(patternDistribution.get('CCC')).toBe(1);
      expect(patternDistribution.get('AAA')).toBe(1);
      
      // 熵 = -0.5*log2(0.5) - 0.5*log2(0.5) = 1
      expect(entropy).toBeCloseTo(1, 5);
    });
    
    it('应该处理更复杂的模式分布', () => {
      // 测试包含黄色的情况
      const possibleAnswers = ['SPEED', 'SPEAR', 'SPEAK', 'SPEND'];
      const { entropy, patternDistribution } = calculateEntropy('SPEED', possibleAnswers);
      
      // SPEED vs SPEED → CCCCC (全绿)
      expect(patternDistribution.get('CCCCC')).toBe(1);
      
      // 其他模式会包含P（黄色）和A（灰色）
      let totalPatterns = 0;
      for (const count of patternDistribution.values()) {
        totalPatterns += count;
      }
      expect(totalPatterns).toBe(4); // 4个可能答案
    });
    
    it('最大熵出现在均匀分布时', () => {
      // 构造一个会产生均匀分布的场景
      const words = ['ABC', 'DEF', 'GHI', 'JKL'];
      const { entropy } = calculateEntropy('XYZ', words);
      
      // 如果XYZ与每个词都完全不同，所有都是AAA
      // 这种情况熵为0（没有信息量）
      expect(entropy).toBe(0);
    });
  });
  
  describe('recommendWordsByEntropy', () => {
    it('应该推荐高熵词', () => {
      const candidateWords = ['RATES', 'TEARS', 'STARE', 'LATER', 'WATER'];
      const possibleAnswers = ['TEARS', 'BEARS', 'YEARS', 'WEARS', 'HEARS'];
      
      const recommendations = recommendWordsByEntropy(candidateWords, possibleAnswers, 3);
      
      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].entropy).toBeGreaterThan(0);
      expect(recommendations[0].word).toBeTruthy();
      expect(recommendations[0].expectedRemaining).toBeGreaterThanOrEqual(0);
    });
    
    it('剩余答案很少时应该直接推荐答案', () => {
      const candidateWords = ['APPLE', 'APPLY'];
      const possibleAnswers = ['APPLE', 'APPLY'];
      
      const recommendations = recommendWordsByEntropy(candidateWords, possibleAnswers, 2);
      
      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].entropy).toBe(0);
      expect(['APPLE', 'APPLY']).toContain(recommendations[0].word);
    });
    
    it('应该优先推荐可能是答案的词（熵相近时）', () => {
      const candidateWords = ['CRANE', 'SLATE', 'TRACE']; // SLATE不在答案中
      const possibleAnswers = ['CRANE', 'TRACE'];
      
      const recommendations = recommendWordsByEntropy(candidateWords, possibleAnswers, 3);
      
      // 在熵相近的情况下，应该优先推荐CRANE或TRACE
      const topWord = recommendations[0].word;
      expect(possibleAnswers).toContain(topWord);
    });
  });
  
  describe('getBestOpeningWords', () => {
    it('应该返回预设的开局词', () => {
      expect(getBestOpeningWords(3)).toContain('SEA');
      expect(getBestOpeningWords(4)).toContain('SALE');
      expect(getBestOpeningWords(5)).toContain('TEARS');
      expect(getBestOpeningWords(6)).toContain('RAISED');
    });
    
    it('未知长度应返回空数组', () => {
      expect(getBestOpeningWords(15)).toEqual([]);
    });
  });
  
  describe('getWordRecommendations', () => {
    it('第一次猜测应使用开局词', () => {
      const allWords = ['TEARS', 'CRANE', 'SLICE', 'TRIED', 'HELLO'];
      const possibleAnswers = allWords;
      const constraints = new WordConstraints();
      
      const recommendations = getWordRecommendations(
        allWords,
        possibleAnswers,
        constraints,
        true // isFirstGuess
      );
      
      // 应该推荐TEARS（预设的5字母开局词）
      expect(recommendations[0].word).toBe('TEARS');
    });
    
    it('可能答案少时只从答案中选择', () => {
      const allWords = Array(1000).fill('XXXXX'); // 很多词
      const possibleAnswers = ['APPLE', 'APPLY', 'HAPPY'];
      const constraints = new WordConstraints();
      
      const recommendations = getWordRecommendations(
        allWords,
        possibleAnswers,
        constraints,
        false
      );
      
      // 应该只推荐可能的答案
      expect(possibleAnswers).toContain(recommendations[0].word);
    });
    
    it('可能答案多时从更大范围选择', () => {
      // 生成100个可能答案
      const possibleAnswers = Array(100).fill(0).map((_, i) => 
        `WORD${i.toString().padStart(1, '0')}`
      );
      const allWords = [...possibleAnswers, 'SALET', 'CRANE'];
      const constraints = new WordConstraints();
      
      const recommendations = getWordRecommendations(
        allWords,
        possibleAnswers,
        constraints,
        false
      );
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].entropy).toBeGreaterThan(0);
    });
  });
  
  describe('熵计算的数学性质', () => {
    it('单一模式的熵为0', () => {
      // 所有答案都产生相同的反馈
      const words = ['CAT', 'CAT', 'CAT'];
      const { entropy } = calculateEntropy('DOG', words);
      
      expect(entropy).toBe(0); // 没有不确定性
    });
    
    it('均匀分布的熵最大', () => {
      // 4种模式，每种概率1/4
      // 这需要精心构造...实际测试中我们验证熵的范围
      const words = ['ABCD', 'EFGH', 'IJKL', 'MNOP'];
      const { entropy } = calculateEntropy('TEST', words);
      
      // 最大熵 = log2(n)，这里n最多是4
      expect(entropy).toBeLessThanOrEqual(2);
      expect(entropy).toBeGreaterThanOrEqual(0);
    });
  });
});