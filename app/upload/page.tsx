'use client';

import { useState } from 'react';
import { uploadExamTemplate, getExamTemplate } from '@/utils/firebase/exam-service';

export default function UploadPage() {
  const [status, setStatus] = useState('');
  const [template, setTemplate] = useState<any>(null);
  const [examType, setExamType] = useState<'mcq' | 'short-answer'>('mcq');

  // 上传试卷模板
  const handleUpload = async () => {
    try {
      setStatus('开始上传试卷模板...');
      await uploadExamTemplate(examType);
      setStatus('试卷模板上传成功！');
      
      // 获取刚上传的模板
      const paperId = examType === 'mcq' ? 'mcq-001' : 'short-001';
      const data = await getExamTemplate(paperId);
      setTemplate(data);
    } catch (error) {
      setStatus(`试卷模板上传失败: ${error}`);
      console.error('上传错误:', error);
    }
  };

  return (
    <div className="flex flex-col p-4 space-y-8">
      <div className="border-b pb-6">
        <h1 className="text-2xl font-bold mb-4">试卷模板测试</h1>
        
        {/* 选择题目类型 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择题目类型
          </label>
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value as 'mcq' | 'short-answer')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            <option value="mcq">Multiple Choice Questions</option>
            <option value="short-answer">Short Answer Questions</option>
          </select>
        </div>

        <button 
          onClick={handleUpload}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          上传试卷模板
        </button>
      </div>

      {/* 状态显示 */}
      <div className={`p-4 rounded ${
        status.includes('成功') ? 'bg-green-50 text-green-700' : 
        status.includes('失败') ? 'bg-red-50 text-red-700' : 
        'bg-blue-50 text-blue-700'
      }`}>
        状态: {status}
      </div>

      {/* 显示模板 */}
      {template && (
        <div>
          <h2 className="text-xl font-semibold mb-2">上传的模板：</h2>
          <pre className="bg-gray-50 p-4 rounded overflow-auto">
            {JSON.stringify(template, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}