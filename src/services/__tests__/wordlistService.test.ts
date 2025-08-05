import { wordlistService } from '../wordlistService';

describe('WordlistService', () => {
  describe('getWordsByLength', () => {
    it('应该返回指定长度的单词列表', () => {
      const words5 = wordlistService.getWordsByLength(5);
      expect(words5.length).toBeGreaterThan(0);
      expect(words5.every(word => word.length === 5)).toBe(true);
    });
    
    it('应该返回大写的单词', () => {
      const words = wordlistService.getWordsByLength(3);
      expect(words.every(word => word === word.toUpperCase())).toBe(true);
    });
    
    it('无效长度应返回空数组', () => {
      expect(wordlistService.getWordsByLength(1)).toEqual([]);
      expect(wordlistService.getWordsByLength(15)).toEqual([]);
    });
    
    it('使用常用词模式应返回较少的单词', () => {
      const allWords = wordlistService.getWordsByLength(5, false);
      const commonWords = wordlistService.getWordsByLength(5, true);
      expect(commonWords.length).toBeLessThan(allWords.length);
      expect(commonWords.length).toBeGreaterThan(0);
    });
  });
  
  describe('isValidWord', () => {
    it('应该验证有效单词', () => {
      expect(wordlistService.isValidWord('THE')).toBe(true);
      expect(wordlistService.isValidWord('the')).toBe(true);
      expect(wordlistService.isValidWord('ABOUT')).toBe(true);
    });
    
    it('应该拒绝无效单词', () => {
      expect(wordlistService.isValidWord('XXXXX')).toBe(false);
      expect(wordlistService.isValidWord('')).toBe(false);
    });
  });
  
  describe('getStatistics', () => {
    it('应该返回各长度单词的统计', () => {
      const stats = wordlistService.getStatistics();
      expect(Object.keys(stats).length).toBe(9); // 3-11
      
      for (let len = 3; len <= 11; len++) {
        expect(stats[len]).toBeGreaterThan(0);
        expect(typeof stats[len]).toBe('number');
      }
    });
  });
  
  describe('getMetadata', () => {
    it('应该返回词库元数据', () => {
      const metadata = wordlistService.getMetadata();
      expect(metadata.source).toBe('david47k/top-english-wordlists');
      expect(metadata.totalWords).toBeGreaterThan(40000);
      expect(metadata.description).toContain('常用英文单词表');
    });
  });
});