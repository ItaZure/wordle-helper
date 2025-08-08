// 区域选择器，会被注入到网页中执行
export function injectAreaSelector(screenshotDataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647;
      cursor: crosshair;
      background: rgba(0, 0, 0, 0.3);
    `;

    let startX = 0, startY = 0;
    let isSelecting = false;
    
    const selectionBox = document.createElement('div');
    selectionBox.style.cssText = `
      position: fixed;
      border: 2px solid #4CAF50;
      background: rgba(76, 175, 80, 0.1);
      z-index: 2147483647;
      pointer-events: none;
    `;
    
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 16px;
      z-index: 2147483647;
    `;
    hint.textContent = '请框选Wordle游戏区域 (ESC取消)';
    
    document.body.appendChild(overlay);
    document.body.appendChild(hint);

    const handleMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      isSelecting = true;
      selectionBox.style.left = startX + 'px';
      selectionBox.style.top = startY + 'px';
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
      document.body.appendChild(selectionBox);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isSelecting) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isSelecting) return;
      isSelecting = false;

      const endX = e.clientX;
      const endY = e.clientY;
      
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      if (width > 10 && height > 10) {
        // 创建canvas来裁剪图片
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const img = new Image();
        
        img.onload = () => {
          canvas.width = width;
          canvas.height = height;
          
          // 计算裁剪区域
          const scaleX = img.width / window.innerWidth;
          const scaleY = img.height / window.innerHeight;
          
          ctx.drawImage(
            img,
            left * scaleX,
            top * scaleY,
            width * scaleX,
            height * scaleY,
            0, 0, width, height
          );
          
          const croppedImageUrl = canvas.toDataURL('image/png');
          cleanup();
          resolve(croppedImageUrl);
        };
        
        img.src = screenshotDataUrl;
      } else {
        selectionBox.remove();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    };

    const cleanup = () => {
      overlay.removeEventListener('mousedown', handleMouseDown);
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
      selectionBox.remove();
      hint.remove();
    };

    overlay.addEventListener('mousedown', handleMouseDown);
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
  });
}