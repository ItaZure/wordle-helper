import { GameState, CellState, LetterRecognitionResult } from '../types/game';
import { injectAreaSelector } from '../content/areaSelector';
import { letterRecognitionService } from './letterRecognition';
import { detectColorScheme, classifyColorWithScheme } from './colorSchemeDetector';

export class ImageRecognitionService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  async captureScreenArea(): Promise<string> {
    console.log('captureScreenArea被调用');
    return new Promise((resolve, reject) => {
      console.log('开始查询活动标签页...');
      // 向当前活动标签页注入截图选择功能
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log('查询结果:', tabs);
        if (!tabs[0]?.id) {
          reject(new Error('无法获取当前标签页'));
          return;
        }
        
        // 先截图
        chrome.tabs.captureVisibleTab(
          { format: 'png' },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            // 注入选择脚本到网页
            chrome.scripting.executeScript(
              {
                target: { tabId: tabs[0].id! },
                func: injectAreaSelector,
                args: [dataUrl]
              },
              (results) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                  return;
                }
                
                if (results && results[0]) {
                  if (results[0].result) {
                    resolve(results[0].result);
                  } else {
                    reject(new Error('用户取消选择'));
                  }
                }
              }
            );
          }
        );
      });
    });
  }


  async recognizeGameState(imageDataUrl: string): Promise<GameState> {
    console.log('开始识别游戏状态...');
    
    // 获取当前页面URL以检测配色方案
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0]?.url || '';
    const colorScheme = detectColorScheme(currentUrl);
    console.log(`检测到配色方案: ${colorScheme} (URL: ${currentUrl})`);
    
    // 在popup中进行OCR处理
    const result = await this.processGameImageInPopup(imageDataUrl);
    
    if (result) {
      console.log('OCR识别成功:', result);
      return result;
    }
    
    console.log('使用内置识别方案');
    // 备用方案：识别颜色和尝试识别字母
    const cells = await this.extractCellsFromImage(imageDataUrl);
    const cellStates = await this.analyzeCellStates(cells, colorScheme);
    
    // 尝试识别字母（使用改进的预处理）
    const letterResults = await this.recognizeLettersWithImprovedOCR(cells);
    
    // 使用检测到的列数
    const cols = (this as any).detectedCols || 5;
    console.log(`使用${cols}列构建游戏状态`);
    
    const rows: GameState['rows'] = [];
    let index = 0;
    
    for (let row = 0; row < 6; row++) {
      const rowCells: GameState['rows'][0] = [];
      for (let col = 0; col < cols; col++) {
        const letterResult = letterResults[index];
        console.log(`格子[${row},${col}] - 字母: ${letterResult?.letter || '?'}, 置信度: ${letterResult?.confidence || 0}%`);
        
        rowCells.push({
          letter: letterResult?.letter || '',
          state: cellStates[index] || 'empty'
        });
        index++;
      }
      rows.push(rowCells);
    }

    const currentRow = this.detectCurrentRow(rows);
    const isComplete = this.checkIfGameComplete(rows);

    return {
      rows,
      currentRow,
      isComplete,
      screenshotUrl: imageDataUrl
    };
  }
  
  private async processGameImageInPopup(imageDataUrl: string): Promise<GameState | null> {
    try {
      console.log('开始处理图像（改进的预处理 + 字母识别）...');
      
      // 获取当前页面URL以检测配色方案
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tabs[0]?.url || '';
      const colorScheme = detectColorScheme(currentUrl);
      
      // 在popup中进行图像处理
      const cells = await this.extractCellsFromImage(imageDataUrl);
      const cellStates = await this.analyzeCellStates(cells, colorScheme);
      
      // 使用改进的字母识别
      const letterResults = await this.recognizeLettersWithImprovedOCR(cells);
      
      // 使用检测到的列数
      const cols = (this as any).detectedCols || 5;
      console.log(`使用${cols}列构建游戏状态`);
      
      const rows: GameState['rows'] = [];
      let index = 0;
      
      for (let row = 0; row < 6; row++) {
        const rowCells: GameState['rows'][0] = [];
        for (let col = 0; col < cols; col++) {
          const letterResult = letterResults[index];
          console.log(`格子[${row},${col}] - 字母: ${letterResult?.letter || '?'}, 置信度: ${letterResult?.confidence || 0}%`);
          
          rowCells.push({
            letter: letterResult?.letter || '',
            state: cellStates[index] || 'empty'
          });
          index++;
        }
        rows.push(rowCells);
      }

      const currentRow = this.detectCurrentRow(rows);
      const isComplete = this.checkIfGameComplete(rows);

      return {
        rows,
        currentRow,
        isComplete,
        screenshotUrl: imageDataUrl
      };
    } catch (error) {
      console.error('处理失败:', error);
      return null; // 回退到备用方案
    }
  }

  // 使用改进的OCR识别所有格子中的字母
  private async recognizeLettersWithImprovedOCR(cells: ImageData[]): Promise<LetterRecognitionResult[]> {
    const results = [];
    
    for (const cell of cells) {
      try {
        // 使用改进的字母识别服务
        const result = letterRecognitionService.recognizeLetter(cell);
        results.push(result);
      } catch (error) {
        console.error('字母识别失败:', error);
        results.push({ letter: '', confidence: 0 });
      }
    }
    
    return results;
  }
  

  private async extractCellsFromImage(imageDataUrl: string): Promise<ImageData[]> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        
        // 动态检测列数（基于宽高比）
        const aspectRatio = img.width / img.height;
        let cols = 5; // 默认5列
        
        // Wordle的格子大致是正方形，所以宽高比可以帮助判断列数
        // 5列6行：宽高比约 0.83
        // 6列6行：宽高比约 1.0
        // 7列6行：宽高比约 1.17
        if (aspectRatio > 0.95) {
          cols = Math.round(aspectRatio * 6);
          // 限制在合理范围内
          cols = Math.min(Math.max(cols, 5), 11);
        }
        
        console.log(`图片宽高比: ${aspectRatio.toFixed(2)}, 检测到列数: ${cols}`);
        
        const cells: ImageData[] = [];
        const cellWidth = img.width / cols;
        const cellHeight = img.height / 6;
        
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < cols; col++) {
            const x = col * cellWidth;
            const y = row * cellHeight;
            const cellData = this.ctx.getImageData(x, y, cellWidth, cellHeight);
            cells.push(cellData);
          }
        }
        
        // 保存检测到的列数
        (this as any).detectedCols = cols;
        
        resolve(cells);
      };
      img.src = imageDataUrl;
    });
  }

  private async analyzeCellStates(cells: ImageData[], colorScheme: string = 'auto'): Promise<CellState[]> {
    return cells.map(cell => {
      const avgColor = this.getAverageColor(cell);
      // 使用新的配色方案感知的分类函数
      return classifyColorWithScheme(avgColor, colorScheme as any);
    });
  }

  private getAverageColor(imageData: ImageData): { r: number; g: number; b: number } {
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    let count = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    };
  }



  private detectCurrentRow(rows: GameState['rows']): number {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const hasEmpty = row.some(cell => cell.state === 'empty');
      const hasLetter = row.some(cell => cell.letter !== '');
      
      if (hasEmpty && !hasLetter) {
        return i;
      }
    }
    return -1;
  }

  private checkIfGameComplete(rows: GameState['rows']): boolean {
    for (const row of rows) {
      const allCorrect = row.every(cell => cell.state === 'correct');
      if (allCorrect) return true;
    }
    
    const lastRow = rows[5];
    const lastRowFilled = lastRow.every(cell => cell.state !== 'empty');
    return lastRowFilled;
  }
}

export const imageRecognitionService = new ImageRecognitionService();