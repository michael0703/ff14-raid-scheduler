import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';

const IfritPractice = () => {
  const [ifrits, setIfrits] = useState([]);

  // 生成隨機等腰梯型位置
  const generateRandomTrapezoid = () => {
    const centerX = 35 + Math.random() * 30; // 35-65
    const topY = 15 + Math.random() * 15;  // 15-30
    const topWidth = 25 + Math.random() * 15; // 25-40
    const bottomWidth = 45 + Math.random() * 20; // 45-65
    const height = 35 + Math.random() * 20; // 35-55
    const bottomY = topY + height;

    return [
      { x: centerX - topWidth / 2, y: topY },    // 左上
      { x: centerX + topWidth / 2, y: topY },    // 右上
      { x: centerX - bottomWidth / 2, y: bottomY }, // 左下
      { x: centerX + bottomWidth / 2, y: bottomY }  // 右下
    ];
  };

  // 初始化
  useEffect(() => {
    const positions = generateRandomTrapezoid();
    setIfrits([
      { id: 1, position: positions[0] },
      { id: 2, position: positions[1] },
      { id: 3, position: positions[2] },
      { id: 4, position: positions[3] }
    ]);
  }, []);

  const reset = () => {
    const positions = generateRandomTrapezoid();
    setIfrits([
      { id: 1, position: positions[0] },
      { id: 2, position: positions[1] },
      { id: 3, position: positions[2] },
      { id: 4, position: positions[3] }
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-slate-600 hover:text-slate-900">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-xl font-black text-slate-800">火神衝練習</h1>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-xl font-medium hover:bg-slate-700"
            >
              <RotateCcw size={16} />
              重置
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-black text-slate-800 mb-4">模擬場地</h2>

          <div className="flex items-center gap-8">
            {/* 圓形場地 */}
            <div className="relative bg-slate-100 rounded-full aspect-square max-w-2xl mx-auto flex-1">
              {/* 空場地 */}
            </div>

            {/* 四個火神紅點 - 場地旁邊 */}
            <div className="flex flex-col gap-4">
              {ifrits.map((ifrit) => (
                <div
                  key={ifrit.id}
                  className="w-8 h-8 bg-red-500 rounded-full border-4 border-red-600"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default IfritPractice;
