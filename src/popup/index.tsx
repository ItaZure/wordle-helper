import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('====================================');
console.log('Wordle Helper 扩展程序启动');
console.log('====================================');
console.log('React版本:', React.version);
console.log('当前URL:', window.location.href);
console.log('当前时间:', new Date().toLocaleString());

// 测试按钮 - 确保控制台工作
setTimeout(() => {
  console.log('⏰ 3秒后的测试日志 - 如果你看到这条消息，说明控制台正常工作');
}, 3000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);