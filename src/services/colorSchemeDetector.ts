// 颜色方案检测器
export type ColorScheme = 'wordle2.io' | 'lessgames.com' | 'auto';

export interface ColorDefinition {
  r: number;
  g: number;
  b: number;
}

export interface SchemeColors {
  empty: ColorDefinition;
  absent: ColorDefinition;
  present: ColorDefinition;
  correct: ColorDefinition;
  tolerance: number;
}

// 定义不同网站的配色方案
export const COLOR_SCHEMES: Record<ColorScheme, SchemeColors | { tolerance: number }> = {
  'wordle2.io': {
    // wordle2.io配色
    empty: { r: 250, g: 251, b: 255 },      // #fafbff
    absent: { r: 155, g: 164, b: 187 },     // #9ba4bb
    present: { r: 236, g: 188, b: 67 },     // #ecbc43
    correct: { r: 122, g: 172, b: 80 },     // #7aac50
    tolerance: 30  // 颜色容差
  },
  'lessgames.com': {
    // lessgames.com/wordless配色
    empty: { r: 43, g: 46, b: 47 },         // #2b2e2f
    absent: { r: 109, g: 118, b: 124 },     // #6d767c
    present: { r: 211, g: 187, b: 51 },     // #d3bb33
    correct: { r: 96, g: 170, b: 51 },      // #60aa33
    tolerance: 30
  },
  'auto': {
    // 自动检测模式，使用通用算法
    tolerance: 40
  }
};

// 根据URL检测应该使用哪种配色方案
export function detectColorScheme(url: string): ColorScheme {
  const hostname = new URL(url).hostname.toLowerCase();
  
  if (hostname.includes('wordle2.io')) {
    return 'wordle2.io';
  }
  
  if (hostname.includes('lessgames.com')) {
    // 检查是否是wordless页面
    if (url.includes('wordless')) {
      return 'lessgames.com';
    }
  }
  
  // 其他网站使用自动检测
  return 'auto';
}

// 计算两个颜色之间的欧氏距离
export function colorDistance(c1: ColorDefinition, c2: ColorDefinition): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

// 根据配色方案分类颜色
export function classifyColorWithScheme(
  color: ColorDefinition,
  scheme: ColorScheme
): 'empty' | 'absent' | 'present' | 'correct' {
  const { r, g, b } = color;
  
  // 如果选择了特定的配色方案
  if (scheme !== 'auto' && COLOR_SCHEMES[scheme]) {
    const colors = COLOR_SCHEMES[scheme] as SchemeColors;
    const tolerance = colors.tolerance || 30;
    
    // 计算与每种状态颜色的距离
    const distances = {
      empty: colorDistance(color, colors.empty),
      absent: colorDistance(color, colors.absent),
      present: colorDistance(color, colors.present),
      correct: colorDistance(color, colors.correct)
    };
    
    // 找出最接近的颜色
    let minDistance = Infinity;
    let bestMatch: 'empty' | 'absent' | 'present' | 'correct' = 'empty';
    
    for (const [state, distance] of Object.entries(distances)) {
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = state as typeof bestMatch;
      }
    }
    
    // 如果最小距离在容差范围内，返回匹配的状态
    if (minDistance <= tolerance) {
      return bestMatch;
    }
    
    // 如果没有好的匹配，根据亮度做基本判断
    const brightness = (r + g + b) / 3;
    if (brightness > 200) return 'empty';
    if (brightness < 100) return 'absent';
    return 'empty';
  }
  
  // 自动检测模式 - 使用通用算法
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  // 绿色 - correct
  if (g > r && g > b && g > 100 && delta > 30) {
    if (r < g * 0.85 && b < g * 0.85) {
      return 'correct';
    }
  }
  
  // 黄色 - present
  if (r > 150 && g > 100 && delta > 30) {
    if (b < r * 0.7 && b < g * 0.7) {
      return 'present';
    }
  }
  
  // 灰色系
  if (delta < 40) {
    if (max > 210) return 'empty';
    if (max < 120) return 'absent';
    return 'absent';
  }
  
  return 'absent';
}