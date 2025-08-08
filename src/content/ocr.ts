import Tesseract from 'tesseract.js';

interface OCRResult {
  letter: string;
  confidence: number;
}

export async function performOCR(imageDataUrl: string): Promise<OCRResult[]> {
  try {
    const result = await Tesseract.recognize(
      imageDataUrl,
      'eng',
      {
        logger: info => console.log('OCR进度:', info)
      }
    );
    
    // 提取识别到的文本和单词
    const pageData = result.data as any;
    const words = pageData.words || [];
    
    const letters: OCRResult[] = [];
    
    // 处理识别结果
    for (const word of words) {
      const cleanText = word.text.replace(/[^A-Z]/gi, '').toUpperCase();
      for (const char of cleanText) {
        if (/[A-Z]/.test(char)) {
          letters.push({
            letter: char,
            confidence: word.confidence
          });
        }
      }
    }
    
    return letters;
  } catch (error) {
    console.error('OCR失败:', error);
    return [];
  }
}

export async function processGameImage(imageDataUrl: string): Promise<{
  cells: Array<{ letter: string; color: string }>;
  wordLength: number;
  rows: number;
}> {
  // 创建临时canvas来分析图片
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageDataUrl;
  });
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  // 检测网格结构
  const gridInfo = detectGrid(ctx, img.width, img.height);
  const cells: Array<{ letter: string; color: string }> = [];
  
  // 处理每个格子
  for (let row = 0; row < gridInfo.rows; row++) {
    for (let col = 0; col < gridInfo.cols; col++) {
      const cellX = col * gridInfo.cellWidth + gridInfo.offsetX;
      const cellY = row * gridInfo.cellHeight + gridInfo.offsetY;
      
      // 提取单个格子的图像
      const cellCanvas = document.createElement('canvas');
      const cellCtx = cellCanvas.getContext('2d')!;
      cellCanvas.width = gridInfo.cellWidth;
      cellCanvas.height = gridInfo.cellHeight;
      cellCtx.drawImage(
        canvas,
        cellX, cellY, gridInfo.cellWidth, gridInfo.cellHeight,
        0, 0, gridInfo.cellWidth, gridInfo.cellHeight
      );
      
      // 分析格子颜色
      const cellImageData = cellCtx.getImageData(0, 0, gridInfo.cellWidth, gridInfo.cellHeight);
      const color = analyzeColor(cellImageData);
      
      // OCR识别字母
      let letter = '';
      if (color !== 'empty') {
        const cellDataUrl = cellCanvas.toDataURL('image/png');
        const ocrResults = await performOCR(cellDataUrl);
        if (ocrResults.length > 0) {
          letter = ocrResults[0].letter;
        }
      }
      
      cells.push({ letter, color });
    }
  }
  
  return {
    cells,
    wordLength: gridInfo.cols,
    rows: gridInfo.rows
  };
}

function detectGrid(_ctx: CanvasRenderingContext2D, width: number, height: number) {
  // 检测游戏网格的行列数
  // 默认假设是标准Wordle（5列6行）
  // 可以通过分析边缘检测来动态确定
  
  const aspectRatio = width / height;
  let cols = 5;
  let rows = 6;
  
  // 根据宽高比判断可能的网格大小
  if (aspectRatio > 1.2) {
    // 可能是更宽的网格（如6字母或更多）
    cols = Math.round(aspectRatio * 5);
  }
  
  return {
    cols,
    rows,
    cellWidth: width / cols,
    cellHeight: height / rows,
    offsetX: 0,
    offsetY: 0
  };
}

function analyzeColor(imageData: ImageData): string {
  const data = imageData.data;
  let r = 0, g = 0, b = 0;
  let pixelCount = 0;
  
  // 采样中心区域的像素
  const centerX = Math.floor(imageData.width / 2);
  const centerY = Math.floor(imageData.height / 2);
  const sampleSize = Math.min(20, Math.floor(imageData.width / 4));
  
  for (let y = centerY - sampleSize; y <= centerY + sampleSize; y++) {
    for (let x = centerX - sampleSize; x <= centerX + sampleSize; x++) {
      const idx = (y * imageData.width + x) * 4;
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      pixelCount++;
    }
  }
  
  r = Math.round(r / pixelCount);
  g = Math.round(g / pixelCount);
  b = Math.round(b / pixelCount);
  
  // 判断颜色类型
  // 绿色（正确）
  if (g > r && g > b && g > 140) {
    return 'correct';
  }
  
  // 黄色/橙色（存在）
  if (r > 180 && g > 150 && b < 100) {
    return 'present';
  }
  
  // 深灰色（不存在）
  if (r < 130 && g < 130 && b < 130 && r > 70) {
    return 'absent';
  }
  
  // 浅灰色或白色（空）
  return 'empty';
}