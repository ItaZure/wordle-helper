"""
Wordle 游戏核心算法实现
包含数据结构定义和筛选算法
"""
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class LetterStatus(Enum):
    """字母状态枚举"""
    CORRECT = 'correct'   # 绿色 - 位置和字母都正确
    PRESENT = 'present'   # 黄色 - 字母存在但位置错误
    ABSENT = 'absent'     # 灰色 - 字母不存在


@dataclass
class LetterOccurrence:
    """字母出现的详细信息"""
    position: int
    status: LetterStatus


@dataclass
class GuessResult:
    """单次猜测的结果"""
    word: str
    letter_statuses: List[LetterStatus]
    
    def get_letter_details(self) -> Dict[str, List[LetterOccurrence]]:
        """获取按字母分组的详细信息"""
        details = {}
        for i, letter in enumerate(self.word):
            if letter not in details:
                details[letter] = []
            details[letter].append(LetterOccurrence(i, self.letter_statuses[i]))
        return details


@dataclass
class LetterCount:
    """字母数量约束"""
    exact: Optional[int] = None  # 精确数量
    min: Optional[int] = None    # 最少数量


class WordConstraints:
    """单词约束条件"""
    def __init__(self):
        self.correct_letters: Dict[int, str] = {}  # 位置 -> 正确字母
        self.present_letters: Set[str] = set()     # 存在但位置未定的字母
        self.absent_letters: Set[str] = set()      # 不存在的字母
        self.wrong_positions: Dict[str, Set[int]] = {}  # 字母 -> 错误位置集合
        self.letter_counts: Dict[str, LetterCount] = {}  # 字母 -> 数量约束


def create_guess_result(word: str, target: str) -> GuessResult:
    """
    根据猜测词和目标词创建猜测结果
    
    算法：
    1. 先标记所有正确位置（绿色）
    2. 再处理剩余字母的黄色/灰色
    """
    word = word.upper()
    target = target.upper()
    
    letter_statuses = [LetterStatus.ABSENT] * len(word)
    target_chars = list(target)
    
    # 第一遍：标记绿色（正确位置）
    for i in range(len(word)):
        if word[i] == target_chars[i]:
            letter_statuses[i] = LetterStatus.CORRECT
            target_chars[i] = None  # 标记已使用
    
    # 第二遍：标记黄色（存在但位置错误）
    for i in range(len(word)):
        if letter_statuses[i] == LetterStatus.ABSENT and word[i] in target_chars:
            letter_statuses[i] = LetterStatus.PRESENT
            # 找到并移除第一个匹配
            for j in range(len(target_chars)):
                if target_chars[j] == word[i]:
                    target_chars[j] = None
                    break
    
    return GuessResult(word, letter_statuses)


def update_constraints(constraints: WordConstraints, guess: GuessResult) -> None:
    """
    根据新的猜测结果更新约束条件
    
    注意：这个函数会直接修改传入的constraints对象
    """
    letter_details = guess.get_letter_details()
    
    for letter, occurrences in letter_details.items():
        # 统计各种状态的数量
        correct_count = sum(1 for occ in occurrences if occ.status == LetterStatus.CORRECT)
        present_count = sum(1 for occ in occurrences if occ.status == LetterStatus.PRESENT)
        absent_count = sum(1 for occ in occurrences if occ.status == LetterStatus.ABSENT)
        
        # 1. 更新正确位置
        for occ in occurrences:
            if occ.status == LetterStatus.CORRECT:
                # 检查冲突
                if occ.position in constraints.correct_letters and \
                   constraints.correct_letters[occ.position] != letter:
                    raise ValueError(f"位置{occ.position}的字母冲突")
                constraints.correct_letters[occ.position] = letter
        
        # 2. 更新存在但位置未定的字母
        # 只有当字母没有任何确定位置时才加入present_letters
        if present_count > 0 and correct_count == 0:
            has_correct_position = any(
                constraints.correct_letters.get(i) == letter 
                for i in range(len(guess.word))
            )
            if not has_correct_position:
                constraints.present_letters.add(letter)
        
        # 3. 更新错误位置
        for occ in occurrences:
            if occ.status == LetterStatus.PRESENT:
                if letter not in constraints.wrong_positions:
                    constraints.wrong_positions[letter] = set()
                constraints.wrong_positions[letter].add(occ.position)
        
        # 4. 更新字母数量约束
        if absent_count > 0:
            # 有灰色 = 数量确定
            exact_count = correct_count + present_count
            
            # 检查与已有约束的冲突
            if letter in constraints.letter_counts:
                existing = constraints.letter_counts[letter]
                if existing.min and existing.min > exact_count:
                    raise ValueError(
                        f"约束冲突：{letter}之前至少{existing.min}个，"
                        f"现在恰好{exact_count}个"
                    )
            
            constraints.letter_counts[letter] = LetterCount(exact=exact_count)
            
            # 如果数量为0，加入absent_letters
            if exact_count == 0:
                constraints.absent_letters.add(letter)
        else:
            # 全是绿色或黄色 = 至少这么多
            min_count = correct_count + present_count
            
            if letter in constraints.letter_counts:
                existing = constraints.letter_counts[letter]
                if existing.exact is not None:
                    # 已知精确数量，验证是否一致
                    if existing.exact < min_count:
                        raise ValueError(
                            f"约束冲突：{letter}恰好{existing.exact}个，"
                            f"但现在至少需要{min_count}个"
                        )
                elif existing.min:
                    # 更新为更大的min值
                    constraints.letter_counts[letter] = LetterCount(
                        min=max(existing.min, min_count)
                    )
                else:
                    constraints.letter_counts[letter] = LetterCount(min=min_count)
            else:
                constraints.letter_counts[letter] = LetterCount(min=min_count)


def is_word_valid(word: str, constraints: WordConstraints) -> bool:
    """
    检查单词是否满足所有约束条件
    """
    word = word.upper()
    
    # 1. 检查正确位置的字母
    for position, letter in constraints.correct_letters.items():
        if position >= len(word) or word[position] != letter:
            return False
    
    # 2. 检查必须存在但位置未定的字母
    for letter in constraints.present_letters:
        if letter not in word:
            return False
    
    # 3. 检查不应存在的字母
    for letter in constraints.absent_letters:
        if letter in word:
            return False
    
    # 4. 检查错误位置约束
    for letter, wrong_positions in constraints.wrong_positions.items():
        for pos in wrong_positions:
            if pos < len(word) and word[pos] == letter:
                return False
    
    # 5. 检查字母数量约束
    for letter, count_constraint in constraints.letter_counts.items():
        actual_count = word.count(letter)
        
        if count_constraint.exact is not None and actual_count != count_constraint.exact:
            return False
        
        if count_constraint.min is not None and actual_count < count_constraint.min:
            return False
    
    return True


def filter_words(words: List[str], constraints: WordConstraints) -> List[str]:
    """
    根据约束条件筛选单词列表
    """
    return [word for word in words if is_word_valid(word, constraints)]


# 测试代码
if __name__ == "__main__":
    # 测试示例：目标词是 LEVEL
    target = "LEVEL"
    
    # 第一次猜测 SLEEP
    guess1 = create_guess_result("SLEEP", target)
    print(f"猜测: SLEEP")
    print(f"结果: {[s.value for s in guess1.letter_statuses]}")
    
    # 创建约束并更新
    constraints = WordConstraints()
    update_constraints(constraints, guess1)
    
    print(f"\n约束条件:")
    print(f"正确位置: {constraints.correct_letters}")
    print(f"存在但位置未定: {constraints.present_letters}")
    print(f"不存在: {constraints.absent_letters}")
    print(f"错误位置: {dict(constraints.wrong_positions)}")
    letter_counts_str = {
        k: f'exact={v.exact}' if v.exact else f'min={v.min}' 
        for k, v in constraints.letter_counts.items()
    }
    print(f"字母数量: {letter_counts_str}")
    
    # 测试筛选
    test_words = ["LEVEL", "LEVER", "LEAVE", "SPELL", "HELLO"]
    valid_words = filter_words(test_words, constraints)
    print(f"\n有效单词: {valid_words}")