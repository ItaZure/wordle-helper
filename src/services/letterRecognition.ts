import { LetterRecognitionResult, ColorStats, ProcessedLetterImage } from '../types/game';

// 基于预处理和OCR的字母识别
export class LetterRecognitionService {
  // 分析单个格子中的字母
  recognizeLetter(cellImageData: ImageData): LetterRecognitionResult {
    // 检查格子中是否有字母（通过对比度）
    const hasLetter = this.detectLetterPresence(cellImageData);
    if (!hasLetter) return { letter: '', confidence: 0 };
    
    // 使用OCR识别字母（带预处理）
    return this.recognizeLetterWithOCR(cellImageData);
  }

  // 使用OCR进行字母识别
  private recognizeLetterWithOCR(imageData: ImageData): LetterRecognitionResult {
    try {
      // 预处理图像以提高OCR准确度
      const processedData = this.preprocessForOCR(imageData);
      
      // 这里应该调用Tesseract.js，但在Chrome扩展环境中需要特殊处理
      // 暂时使用模板匹配作为后备方案
      return this.fallbackLetterRecognition(processedData);
    } catch (error) {
      console.error('OCR识别失败:', error);
      // 回退到简单的模板匹配
      return this.fallbackLetterRecognition(imageData);
    }
  }
  
  private detectLetterPresence(imageData: ImageData): boolean {
    const { width, height } = imageData;
    
    // 计算整个格子的颜色统计
    const colorStats = this.analyzeColorDistribution(imageData);
    
    // 判断是否有字母的多种策略
    
    // 策略1：颜色分布的标准差（有字母的格子颜色变化更大）
    if (colorStats.stdDev > 20) {
      return true;
    }
    
    // 策略2：检测是否有明显的双峰分布（背景色和文字色）
    if (colorStats.hasBimodal) {
      return true;
    }
    
    // 策略3：边缘检测（字母会产生更多边缘）
    const edgeCount = this.detectEdgePixels(imageData);
    const edgeRatio = edgeCount / (width * height);
    if (edgeRatio > 0.02) { // 2%的边缘像素
      return true;
    }
    
    // 策略4：对于深色背景（absent格子），特别检测亮色像素
    if (colorStats.avgBrightness < 130) {
      // 深色背景，检查是否有足够的亮色像素（可能是白色字母）
      if (colorStats.brightPixelRatio > 0.03) { // 3%的亮像素
        return true;
      }
    }
    
    // 策略5：对于中等亮度（可能是灰色absent），检查对比度
    if (colorStats.avgBrightness >= 70 && colorStats.avgBrightness <= 140) {
      // 灰色背景，如果有一定比例的特别亮或特别暗的像素，可能有字母
      if (colorStats.brightPixelRatio > 0.02 || colorStats.darkPixelRatio > 0.02) {
        return true;
      }
    }
    
    return false;
  }

  // 分析颜色分布
  private analyzeColorDistribution(imageData: ImageData): ColorStats {
    const { data } = imageData;
    const brightnesses: number[] = [];
    let sum = 0;
    let brightCount = 0;
    let darkCount = 0;
    
    // 收集所有像素的亮度值
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      brightnesses.push(brightness);
      sum += brightness;
      
      if (brightness > 200) brightCount++;
      if (brightness < 50) darkCount++;
    }
    
    const avg = sum / brightnesses.length;
    
    // 计算标准差
    let variance = 0;
    for (const b of brightnesses) {
      variance += Math.pow(b - avg, 2);
    }
    const stdDev = Math.sqrt(variance / brightnesses.length);
    
    // 检测双峰分布（简单版本：检查是否同时有很多亮像素和暗像素）
    const hasBimodal = (brightCount > brightnesses.length * 0.05 && 
                       darkCount > brightnesses.length * 0.05);
    
    return {
      avgBrightness: avg,
      stdDev: stdDev,
      hasBimodal: hasBimodal,
      brightPixelRatio: brightCount / brightnesses.length,
      darkPixelRatio: darkCount / brightnesses.length
    };
  }

  // 边缘检测
  private detectEdgePixels(imageData: ImageData): number {
    const { width, height, data } = imageData;
    let edgeCount = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // 检查水平和垂直方向的梯度
        const rightIdx = idx + 4;
        const bottomIdx = idx + width * 4;
        
        const right = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        const bottom = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
        
        const gradX = Math.abs(center - right);
        const gradY = Math.abs(center - bottom);
        
        // 如果梯度足够大，认为是边缘
        if (gradX > 20 || gradY > 20) {
          edgeCount++;
        }
      }
    }
    
    return edgeCount;
  }
  
  // 预处理图像以提高OCR准确度
  private preprocessForOCR(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const outputData = output.data;
    
    // 使用Otsu's方法找阈值
    // 1. 计算直方图
    const histogram = new Array(256).fill(0);
    let totalPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[brightness]++;
      totalPixels++;
    }
    
    // 2. Otsu's方法找最佳阈值
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;
    
    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      
      wF = totalPixels - wB;
      if (wF === 0) break;
      
      sumB += t * histogram[t];
      
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      
      const variance = wB * wF * (mB - mF) * (mB - mF);
      
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }
    
    // 3. 改进的检测方法：分析原始图像的边缘和中心亮度
    const edgeSize = Math.floor(Math.min(width, height) * 0.15);
    let edgeBrightSum = 0, edgeCount = 0;
    let centerBrightSum = 0, centerCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        const isEdge = x < edgeSize || x >= width - edgeSize || 
                      y < edgeSize || y >= height - edgeSize;
        
        if (isEdge) {
          edgeBrightSum += brightness;
          edgeCount++;
        } else {
          centerBrightSum += brightness;
          centerCount++;
        }
      }
    }
    
    const edgeAvgBright = edgeBrightSum / edgeCount;
    const centerAvgBright = centerBrightSum / centerCount;
    
    // 判断是否需要反转
    // 如果中心比边缘亮10以上，说明文字是白色的，背景是深色的，需要反转成黑字白背景
    let needInvert = false;
    
    if (centerAvgBright > edgeAvgBright + 10) {
      // 白字深背景：需要反转成黑字白背景
      needInvert = true;
    } else if (edgeAvgBright > centerAvgBright + 10) {
      // 黑字浅背景：已经是正确格式
      needInvert = false;
    } else {
      // 对比度不明显，使用默认判断
      const avgBrightness = (edgeBrightSum + centerBrightSum) / (edgeCount + centerCount);
      needInvert = avgBrightness < 128;
    }
    
    // 4. 生成最终的白底黑字图像（OCR标准格式）
    for (let i = 0, j = 0; i < outputData.length; i += 4, j++) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      let pixelValue;
      
      if (needInvert) {
        // 需要反转（深色背景 → 白底黑字）
        pixelValue = brightness > threshold ? 0 : 255;
      } else {
        // 不需要反转（已经是白底黑字）
        pixelValue = brightness > threshold ? 255 : 0;
      }
      
      outputData[i] = pixelValue;
      outputData[i + 1] = pixelValue;
      outputData[i + 2] = pixelValue;
      outputData[i + 3] = 255;
    }
    
    // 5. 可选：对细笔画进行轻微膨胀（特别是T、I、L等）
    const blackPixelCount = this.countBlackPixels(output);
    const blackPixelRatio = blackPixelCount / (width * height);
    
    if (blackPixelRatio < 0.05 && blackPixelRatio > 0.01) {
      // 检测到细笔画，进行轻微膨胀处理
      return this.applyDilation(output);
    }
    
    return output;
  }

  // 统计黑色像素数量
  private countBlackPixels(imageData: ImageData): number {
    const data = imageData.data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 0) count++; // 黑色像素
    }
    return count;
  }

  // 膨胀操作（用于细笔画）
  private applyDilation(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const outputData = output.data;
    
    // 复制原始数据
    for (let i = 0; i < data.length; i++) {
      outputData[i] = data[i];
    }
    
    // 3x3膨胀
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // 如果周围有黑色像素，当前像素也变黑
        if (data[idx - width * 4] === 0 ||     // 上
            data[idx + width * 4] === 0 ||     // 下
            data[idx - 4] === 0 ||             // 左
            data[idx + 4] === 0) {             // 右
          outputData[idx] = 0;
          outputData[idx + 1] = 0;
          outputData[idx + 2] = 0;
          outputData[idx + 3] = 255;
        }
      }
    }
    
    return output;
  }
  
  // 简单的后备字母识别（模板匹配）
  private fallbackLetterRecognition(imageData: ImageData): LetterRecognitionResult {
    const letterImage = this.extractLetterRegion(imageData);
    const features = this.extractLetterFeatures(letterImage);
    const result = this.matchLetterTemplate(features);
    return result;
  }

  // 提取字母区域（去除背景）
  private extractLetterRegion(imageData: ImageData): ProcessedLetterImage {
    const { width, height, data } = imageData;
    const binaryImage = new Uint8ClampedArray(width * height);
    
    // 先找到背景色（边缘的主要颜色）
    let bgBrightness = 0;
    let bgCount = 0;
    const edgeWidth = Math.floor(width * 0.1);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 只采样边缘
        if (x < edgeWidth || x >= width - edgeWidth || 
            y < edgeWidth || y >= height - edgeWidth) {
          const idx = (y * width + x) * 4;
          bgBrightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          bgCount++;
        }
      }
    }
    
    const avgBg = bgCount > 0 ? bgBrightness / bgCount : 128;
    
    // 动态阈值：背景亮度的中点
    const threshold = avgBg > 128 ? avgBg - 40 : avgBg + 40;
    
    // 转换为二值图像，根据背景是深色还是浅色决定反转
    const invertColors = avgBg < 128;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (invertColors) {
        // 深色背景，浅色文字
        binaryImage[i / 4] = brightness > threshold ? 1 : 0;
      } else {
        // 浅色背景，深色文字
        binaryImage[i / 4] = brightness < threshold ? 1 : 0;
      }
    }
    
    // 找到字母的边界
    let minX = width, maxX = 0;
    let minY = height, maxY = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binaryImage[y * width + x] === 1) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // 如果没有找到字母区域
    if (minX > maxX || minY > maxY) {
      return { data: binaryImage, width, height, bounds: null };
    }
    
    return {
      data: binaryImage,
      width,
      height,
      bounds: { minX, maxX, minY, maxY }
    };
  }

  // 提取字母特征
  private extractLetterFeatures(letterImage: ProcessedLetterImage): {
    density: number;
    aspectRatio: number;
    width: number;
    height: number;
  } {
    const { data, width, bounds } = letterImage;
    
    if (!bounds) {
      return { 
        density: 0,
        aspectRatio: 1,
        width: 0,
        height: 0
      };
    }
    
    const { minX, maxX, minY, maxY } = bounds;
    const letterWidth = maxX - minX + 1;
    const letterHeight = maxY - minY + 1;
    
    // 密度特征
    let blackPixels = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (data[y * width + x] === 1) blackPixels++;
      }
    }
    const density = blackPixels / (letterWidth * letterHeight);
    
    // 宽高比
    const aspectRatio = letterWidth / letterHeight;
    
    return {
      density,
      aspectRatio,
      width: letterWidth,
      height: letterHeight
    };
  }
  
  // 模板匹配识别字母
  private matchLetterTemplate(features: {
    density: number;
    aspectRatio: number;
    width: number;
    height: number;
  }): LetterRecognitionResult {
    // 简化的字母特征模板（基于Wordle字体特征）
    const templates: Record<string, { density: number; aspectRatio: number }> = {
      'A': { density: 0.35, aspectRatio: 0.7 },
      'B': { density: 0.45, aspectRatio: 0.6 },
      'C': { density: 0.30, aspectRatio: 0.7 },
      'D': { density: 0.40, aspectRatio: 0.7 },
      'E': { density: 0.35, aspectRatio: 0.6 },
      'F': { density: 0.30, aspectRatio: 0.6 },
      'G': { density: 0.35, aspectRatio: 0.7 },
      'H': { density: 0.35, aspectRatio: 0.7 },
      'I': { density: 0.25, aspectRatio: 0.3 },
      'J': { density: 0.25, aspectRatio: 0.5 },
      'K': { density: 0.35, aspectRatio: 0.7 },
      'L': { density: 0.25, aspectRatio: 0.6 },
      'M': { density: 0.40, aspectRatio: 0.8 },
      'N': { density: 0.35, aspectRatio: 0.7 },
      'O': { density: 0.35, aspectRatio: 0.8 },
      'P': { density: 0.35, aspectRatio: 0.6 },
      'Q': { density: 0.40, aspectRatio: 0.8 },
      'R': { density: 0.40, aspectRatio: 0.7 },
      'S': { density: 0.35, aspectRatio: 0.6 },
      'T': { density: 0.25, aspectRatio: 0.7 },
      'U': { density: 0.30, aspectRatio: 0.7 },
      'V': { density: 0.30, aspectRatio: 0.8 },
      'W': { density: 0.40, aspectRatio: 0.9 },
      'X': { density: 0.30, aspectRatio: 0.7 },
      'Y': { density: 0.25, aspectRatio: 0.7 },
      'Z': { density: 0.30, aspectRatio: 0.7 }
    };
    
    let bestMatch = '';
    let bestScore = 0;
    
    // 基于密度和宽高比的简单匹配
    for (const [letter, template] of Object.entries(templates)) {
      const densityDiff = Math.abs(features.density - template.density);
      const aspectDiff = Math.abs(features.aspectRatio - template.aspectRatio);
      
      // 计算相似度得分
      const score = Math.max(0, 1 - densityDiff * 2 - aspectDiff);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = letter;
      }
    }
    
    // 如果特征太弱，返回空
    if (features.density < 0.1 || bestScore < 0.3) {
      return { letter: '', confidence: 0 };
    }
    
    return {
      letter: bestMatch,
      confidence: Math.round(bestScore * 100)
    };
  }
}

export const letterRecognitionService = new LetterRecognitionService();