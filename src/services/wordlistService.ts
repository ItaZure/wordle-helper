// 词库服务 - 负责加载和管理词库数据

import wordlistData from '../../data/wordle-wordlist.json';
import commonWordsData from '../../data/common-words.json';

interface WordlistMetadata {
  source: string;
  totalWords: number;
  createDate: string;
  description: string;
}

interface WordlistData {
  metadata: WordlistMetadata;
  wordsByLength: { [key: number]: string[] };
  allWords: string[];
}

class WordlistService {
  private fullWordlist: WordlistData;
  private commonWordlist: WordlistData;
  
  constructor() {
    this.fullWordlist = wordlistData as WordlistData;
    this.commonWordlist = commonWordsData as WordlistData;
  }
  
  // 获取指定长度的所有单词
  getWordsByLength(length: number, useCommonOnly: boolean = false): string[] {
    const wordlist = useCommonOnly ? this.commonWordlist : this.fullWordlist;
    return wordlist.wordsByLength[length] || [];
  }
  
  // 获取所有单词
  getAllWords(useCommonOnly: boolean = false): string[] {
    const wordlist = useCommonOnly ? this.commonWordlist : this.fullWordlist;
    return wordlist.allWords;
  }
  
  // 检查单词是否有效
  isValidWord(word: string): boolean {
    const upperWord = word.toUpperCase();
    return this.fullWordlist.allWords.includes(upperWord);
  }
  
  // 获取词库信息
  getMetadata(useCommonOnly: boolean = false): WordlistMetadata {
    const wordlist = useCommonOnly ? this.commonWordlist : this.fullWordlist;
    return wordlist.metadata;
  }
  
  // 获取各长度单词的统计
  getStatistics(): { [key: number]: number } {
    const stats: { [key: number]: number } = {};
    for (let len = 3; len <= 11; len++) {
      stats[len] = this.fullWordlist.wordsByLength[len]?.length || 0;
    }
    return stats;
  }
}

// 导出单例
export const wordlistService = new WordlistService();

// 导出便捷方法
export const getWordsByLength = (length: number, useCommonOnly: boolean = false): Promise<string[]> => {
  return Promise.resolve(wordlistService.getWordsByLength(length, useCommonOnly));
};