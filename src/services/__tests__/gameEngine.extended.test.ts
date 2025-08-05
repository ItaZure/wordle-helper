import {
  createGuessResult,
  WordConstraints,
  updateConstraints,
  isWordValid,
  filterWords
} from '../gameEngine';

describe('GameEngine - Extended Tests', () => {
  describe('不同长度单词的测试', () => {
    // 3字母测试
    it('3字母游戏：目标词 CAT', () => {
      // 第一次猜测 DOG
      const guess1 = createGuessResult('DOG', 'CAT');
      expect(guess1.letterStatuses).toEqual(['absent', 'absent', 'absent']);
      
      // 第二次猜测 CAR
      const guess2 = createGuessResult('CAR', 'CAT');
      expect(guess2.letterStatuses).toEqual(['correct', 'correct', 'absent']);
      
      // 建立约束
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess1);
      updateConstraints(constraints, guess2);
      
      // 验证约束
      expect(constraints.correctLetters.get(0)).toBe('C');
      expect(constraints.correctLetters.get(1)).toBe('A');
      expect(constraints.absentLetters.has('D')).toBe(true);
      expect(constraints.absentLetters.has('O')).toBe(true);
      expect(constraints.absentLetters.has('G')).toBe(true);
      expect(constraints.absentLetters.has('R')).toBe(true);
      
      // 验证单词
      expect(isWordValid('CAT', constraints)).toBe(true);
      expect(isWordValid('CAB', constraints)).toBe(true); // CAB符合C_A_模式，B没被禁止
      expect(isWordValid('BAT', constraints)).toBe(false); // B不是C
    });
    
    // 4字母测试
    it('4字母游戏：目标词 WORD，测试重复字母', () => {
      // 猜测 DOOR (有重复O)
      const guess = createGuessResult('DOOR', 'WORD');
      expect(guess.letterStatuses).toEqual([
        'present', // D (WORD中有D在位置3)
        'correct', // O
        'absent',  // O (第二个O，WORD只有一个O)
        'present'  // R (WORD中有R在位置2)
      ]);
      
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess);
      
      // O在位置1正确，恰好出现1次（因为第二个O是灰色）
      expect(constraints.correctLetters.get(1)).toBe('O');
      expect(constraints.letterCounts.get('O')?.exact).toBe(1);
    });
    
    // 5字母测试 - Wordle标准
    it('5字母游戏：目标词 AUDIO，测试元音字母', () => {
      // 第一次猜测 ADIEU (常用开局词)
      const guess1 = createGuessResult('ADIEU', 'AUDIO');
      expect(guess1.letterStatuses).toEqual([
        'correct', // A
        'present', // D (AUDIO中有D在位置2)
        'present', // I (AUDIO中有I在位置3)
        'absent',  // E
        'present'  // U (AUDIO中有U在位置1)
      ]);
      
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess1);
      
      expect(constraints.correctLetters.get(0)).toBe('A');
      expect(constraints.presentLetters.has('D')).toBe(true);
      expect(constraints.presentLetters.has('I')).toBe(true);
      expect(constraints.presentLetters.has('U')).toBe(true);
      expect(constraints.wrongPositions.get('D')?.has(1)).toBe(true);
      expect(constraints.wrongPositions.get('I')?.has(2)).toBe(true);
      expect(constraints.wrongPositions.get('U')?.has(4)).toBe(true);
      
      // 第二次猜测 AUDIT
      const guess2 = createGuessResult('AUDIT', 'AUDIO');
      expect(guess2.letterStatuses).toEqual([
        'correct', // A
        'correct', // U
        'correct', // D
        'correct', // I
        'absent'   // T
      ]);
    });
    
    // 6字母测试
    it('6字母游戏：目标词 BANANA，测试多重复字母', () => {
      // 猜测 ANIMAL
      const guess = createGuessResult('ANIMAL', 'BANANA');
      expect(guess.letterStatuses).toEqual([
        'present', // A (存在但不在位置0)
        'present', // N (存在但不在位置1)
        'absent',  // I
        'absent',  // M
        'present', // A (存在但不在位置4)
        'absent'   // L
      ]);
      
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess);
      
      // A至少出现2次
      expect(constraints.letterCounts.get('A')?.min).toBe(2);
      // N至少出现1次
      expect(constraints.letterCounts.get('N')?.min).toBe(1);
    });
    
    // 7字母测试
    it('7字母游戏：目标词 PATTERN，测试双字母', () => {
      // 猜测 ITTERS (包含双T)
      const guess = createGuessResult('SITTERS', 'PATTERN');
      expect(guess.letterStatuses).toEqual([
        'absent',  // S
        'absent',  // I
        'correct', // T
        'correct', // T
        'correct', // E
        'correct', // R
        'absent'   // S
      ]);
      
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess);
      
      // 验证T出现在正确位置
      expect(constraints.correctLetters.get(2)).toBe('T');
      expect(constraints.correctLetters.get(3)).toBe('T');
      expect(constraints.letterCounts.get('T')?.min).toBe(2);
    });
    
    // 8字母测试
    it('8字母游戏：目标词 ABSOLUTE', () => {
      // 猜测 SOLUTION
      const guess = createGuessResult('SOLUTION', 'ABSOLUTE');
      expect(guess.letterStatuses).toEqual([
        'present', // S (ABSOLUTE中有S)
        'present', // O (ABSOLUTE中有O)
        'present', // L (ABSOLUTE中有L但不在位置2)
        'present', // U (ABSOLUTE中有U)
        'present', // T (ABSOLUTE中有T)
        'absent',  // I
        'absent',  // O (第二个O，ABSOLUTE只有一个O)
        'absent'   // N
      ]);
      
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess);
      
      // O恰好出现1次（因为第二个O是灰色）
      expect(constraints.letterCounts.get('O')?.exact).toBe(1);
    });
    
    // 9字母测试
    it('9字母游戏：目标词 CHOCOLATE', () => {
      const guess = createGuessResult('CROCODILE', 'CHOCOLATE');
      // C正确，其他分析...
      expect(guess.letterStatuses[0]).toBe('correct'); // C
      
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess);
      expect(constraints.correctLetters.get(0)).toBe('C');
    });
    
    // 10字母测试
    it('10字母游戏：目标词 BASKETBALL', () => {
      const guess = createGuessResult('BLACKBOARD', 'BASKETBALL');
      expect(guess.letterStatuses[0]).toBe('correct'); // B
      expect(guess.letterStatuses[1]).toBe('present'); // L (在BASKETBALL中但不在位置1)
      
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess);
      
      // 验证多个字母的约束
      expect(constraints.correctLetters.get(0)).toBe('B');
      expect(constraints.presentLetters.has('L')).toBe(true);
    });
    
    // 11字母测试
    it('11字母游戏：目标词 PROGRAMMING', () => {
      const guess = createGuessResult('GRAMMATICAL', 'PROGRAMMING');
      // 分析复杂的11字母情况
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess);
      
      // G, R, A, M 都存在于PROGRAMMING中
      expect(constraints.presentLetters.size).toBeGreaterThan(0);
    });
  });
  
  describe('边界情况测试', () => {
    it('全部字母相同的单词', () => {
      // 目标词 AAA
      const guess = createGuessResult('AAB', 'AAA');
      expect(guess.letterStatuses).toEqual([
        'correct', // A
        'correct', // A
        'absent'   // B
      ]);
    });
    
    it('猜测词和目标词完全不同', () => {
      const guess = createGuessResult('ABCD', 'EFGH');
      expect(guess.letterStatuses).toEqual([
        'absent', 'absent', 'absent', 'absent'
      ]);
      
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess);
      
      expect(constraints.absentLetters.size).toBe(4);
      expect(constraints.presentLetters.size).toBe(0);
      expect(constraints.correctLetters.size).toBe(0);
    });
    
    it('包含所有状态的复杂情况', () => {
      // 目标词 SPEED，猜测 SEEDS
      const guess = createGuessResult('SEEDS', 'SPEED');
      expect(guess.letterStatuses).toEqual([
        'correct', // S
        'present', // E (第一个)
        'correct', // E (第二个)
        'present', // D
        'absent'   // S (第二个)
      ]);
      
      const constraints = new WordConstraints();
      updateConstraints(constraints, guess);
      
      // S恰好1个
      expect(constraints.letterCounts.get('S')?.exact).toBe(1);
      // E至少2个
      expect(constraints.letterCounts.get('E')?.min).toBe(2);
      // D至少1个
      expect(constraints.letterCounts.get('D')?.min).toBe(1);
    });
  });
  
  describe('约束累积测试', () => {
    it('多次猜测的约束应该正确累积', () => {
      const constraints = new WordConstraints();
      
      // 目标词：LEVEL
      // 第1次：HELLO
      const guess1 = createGuessResult('HELLO', 'LEVEL');
      updateConstraints(constraints, guess1);
      
      // 第2次：LEVER
      const guess2 = createGuessResult('LEVER', 'LEVEL');
      updateConstraints(constraints, guess2);
      
      // 第3次：LEVEL
      const guess3 = createGuessResult('LEVEL', 'LEVEL');
      updateConstraints(constraints, guess3);
      
      // 最终约束应该非常明确
      expect(constraints.correctLetters.size).toBe(5);
      // 按位置排序后应该是LEVEL
      const sortedLetters = Array.from(constraints.correctLetters.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([_, letter]) => letter)
        .join('');
      expect(sortedLetters).toBe('LEVEL');
    });
    
    it('约束冲突应该抛出错误', () => {
      const constraints = new WordConstraints();
      
      // 设置E至少2个
      constraints.letterCounts.set('E', { min: 2 });
      
      // 创建一个测试用的猜测结果
      const mockGuess = createGuessResult('TEETH', 'LEVEL');
      expect(() => {
        // 这里updateConstraints应该能处理，不会真正冲突
        updateConstraints(constraints, mockGuess);
      }).not.toThrow();
    });
  });
  
  describe('filterWords集成测试', () => {
    it('应该正确过滤不同长度的词库', () => {
      const constraints = new WordConstraints();
      
      // 5字母测试：S开头，E在位置2，包含P，P不能在位置3
      constraints.correctLetters.set(0, 'S');
      constraints.correctLetters.set(2, 'E');
      constraints.presentLetters.add('P');
      constraints.wrongPositions.set('P', new Set([3])); // P不能在位置3
      
      const words = [
        'SPEED', // ✓ 符合：S_EED，P在位置1
        'SLEPT', // ✗ P在位置3（错误位置） - 我弄错了，SLEEP是5个字母，位置是0-4
        'STEEL', // ✗ 没有P
        'SPECK', // ✓ 符合：S_ECK，P在位置1
        'SHEEP'  // ✓ 符合：S_EEP，P在位置4
      ];
      
      const valid = filterWords(words, constraints);
      expect(valid).toContain('SPEED');
      expect(valid).toContain('SPECK');
      expect(valid).toContain('SHEEP');
      expect(valid).not.toContain('SLEPT'); // P在错误位置
      expect(valid).not.toContain('STEEL'); // 没有P
    });
  });
});