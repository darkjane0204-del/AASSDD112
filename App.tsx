
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ImageUploader } from './components/ImageUploader';
import { ImageGrid } from './components/ImageGrid';
import { ComparisonSlider } from './components/ComparisonSlider';
import { GenerationMode, AppState, ModificationTask, ModificationResult } from './types';
import { generateVariant, parseInstructions } from './services/geminiService';
import { PERSPECTIVE_OPTIONS, SCENE_OPTIONS, INTENSITY_LEVELS } from './constants';

const INITIAL_TASK: ModificationTask = {
  originalImage: '',
  prompt: '',
  perspectiveAngle: '',
  sceneType: '',
  intensity: 50
};

enum AppStep {
  UPLOAD = 1,
  DESCRIBE = 2,
  GENERATE = 3
}

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [state, setState] = useState<AppState>({
    originalImage: null,
    results: [],
    isGenerating: false,
    history: [],
    error: null,
    currentTask: INITIAL_TASK
  });

  const [selectedResult, setSelectedResult] = useState<ModificationResult | null>(null);

  const handleUpload = (base64: string) => {
    setState(prev => ({ 
      ...prev, 
      originalImage: base64, 
      currentTask: { ...prev.currentTask, originalImage: base64 },
      results: []
    }));
    setStep(AppStep.DESCRIBE);
  };

  const parseApiError = (err: any): string => {
    const msg = err?.message || JSON.stringify(err);
    if (msg.includes('RPM') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return "【RPM Exceeded】当前 API 请求频率过高。系统已尝试使用 Flash 模型并包含自动重试机制。请降低运行频率，等待 1 分钟左右再试。";
    }
    if (msg.includes('TPM')) {
      return "【TPM Exceeded】单次处理的字符过多。请尝试缩短您的 Prompt 描述。";
    }
    if (msg.includes('RPD')) {
      return "【RPD Exceeded】单日请求配额已用完。请明天再试或更换 API Key。";
    }
    return `【生成异常】${msg}。建议稍后重试或简化指令。`;
  };

  const handleGenerate = async () => {
    if (!state.originalImage || !state.currentTask.prompt) return;

    setStep(AppStep.GENERATE);
    setState(prev => ({ ...prev, isGenerating: true, error: null, results: [] }));
    setSelectedResult(null);

    try {
      // First, use Flash Text model to parse/refine instructions
      const refinedPrompt = await parseInstructions(state.originalImage, state.currentTask.prompt);
      const taskWithRefinedPrompt = { ...state.currentTask, prompt: refinedPrompt };

      const modes = [
        GenerationMode.LOCAL_EDIT,
        GenerationMode.PERSPECTIVE,
        GenerationMode.SCENE_SWAP,
        GenerationMode.COMPREHENSIVE
      ];

      // Staggered execution with 750ms gap to avoid burst RPM triggers on Flash tier
      const results = await Promise.allSettled(modes.map(async (mode, index) => {
        await new Promise(r => setTimeout(r, index * 750)); 
        return generateVariant(taskWithRefinedPrompt, mode);
      }));
      
      const successfulResults: ModificationResult[] = [];
      let firstError: any = null;

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          successfulResults.push(res.value);
        } else {
          firstError = res.reason;
          console.error("Path failure:", res.reason);
        }
      });

      if (successfulResults.length === 0 && firstError) {
        throw firstError;
      }

      setState(prev => ({
        ...prev,
        results: successfulResults,
        isGenerating: false,
        history: [...successfulResults, ...prev.history]
      }));
    } catch (err: any) {
      console.error("Critical API Error:", err);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: parseApiError(err)
      }));
    }
  };

  const getTimestampFilename = (base: string) => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');
    return `${base}_${hh}${mm}${ss}`;
  };

  const handleDownloadImage = (url: string, filename: string) => {
    const stampedName = getTimestampFilename(filename.replace('.jpg', ''));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${stampedName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    state.results.forEach((res, index) => {
      setTimeout(() => {
        handleDownloadImage(res.url, `variant-${index + 1}`);
      }, index * 400);
    });
  };

  const handleBackToDescribe = () => {
    setSelectedResult(null);
    setStep(AppStep.DESCRIBE);
  };

  const handleRedo = () => {
    setState(prev => ({ ...prev, results: [], error: null }));
    handleGenerate();
  };

  const resetAll = () => {
    setState({
      originalImage: null,
      results: [],
      isGenerating: false,
      history: state.history,
      error: null,
      currentTask: INITIAL_TASK
    });
    setSelectedResult(null);
    setStep(AppStep.UPLOAD);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30 overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 glass border-b border-slate-800 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <i className="fas fa-bolt-lightning text-white"></i>
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase">Vision Artisan</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? 'bg-blue-600' : 'bg-slate-800'}`}>1</span>
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">上传 / Upload</span>
              <i className="fas fa-chevron-right text-[10px] text-slate-700"></i>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 2 ? 'bg-blue-600' : 'bg-slate-800'}`}>2</span>
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">描述 / Describe</span>
              <i className="fas fa-chevron-right text-[10px] text-slate-700"></i>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 3 ? 'bg-blue-600' : 'bg-slate-800'}`}>3</span>
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">生成 / Result</span>
            </div>
            {step > 1 && (
              <button onClick={resetAll} className="ml-4 text-xs text-slate-500 hover:text-white transition-colors">
                <i className="fas fa-undo mr-1"></i> 重置 / Reset
              </button>
            )}
          </div>
        </header>

        {/* Content Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          
          {step === AppStep.UPLOAD && (
            <div className="max-w-3xl mx-auto mt-12 text-center animate-fade-in">
              <h2 className="text-5xl font-black mb-6 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent leading-tight">
                第一步：上传您的图片<br/>
                <span className="text-2xl font-bold opacity-60">Step 1: Upload your image</span>
              </h2>
              <p className="text-slate-400 mb-12 text-lg">系统已为您切换至 Gemini Flash 模型以提升稳定性。</p>
              <div className="glass p-2 rounded-2xl shadow-2xl">
                <ImageUploader onUpload={handleUpload} />
              </div>
            </div>
          )}

          {step === AppStep.DESCRIBE && state.originalImage && (
            <div className="max-w-5xl mx-auto animate-fade-in">
              <h2 className="text-3xl font-black mb-8 flex items-center gap-3">
                第二步：输入修改描述
                <span className="text-slate-500 text-lg font-bold">Step 2: Describe your changes</span>
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="glass p-1 rounded-2xl overflow-hidden">
                    <img src={state.originalImage} className="w-full rounded-xl shadow-lg object-contain max-h-[400px]" alt="Original" />
                  </div>
                  <button onClick={() => setStep(AppStep.UPLOAD)} className="text-sm text-slate-400 hover:text-white flex items-center gap-2">
                    <i className="fas fa-arrow-left"></i> 重新上传图片 / Re-upload
                  </button>
                </div>

                <div className="space-y-8 glass p-8 rounded-2xl border-l-4 border-l-blue-600">
                  <section>
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400 block mb-3">修改指令 (支持中文/英文)</label>
                    <textarea
                      className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-base focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-600 font-medium"
                      placeholder="例如：把背景的枯树枝去掉，换成绿意盎然的春天森林..."
                      value={state.currentTask.prompt}
                      onChange={(e) => setState(prev => ({ ...prev, currentTask: { ...prev.currentTask, prompt: e.target.value }}))}
                    />
                  </section>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">视角调整</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-blue-500"
                        value={state.currentTask.perspectiveAngle}
                        onChange={(e) => setState(prev => ({ ...prev, currentTask: { ...prev.currentTask, perspectiveAngle: e.target.value }}))}
                      >
                        {PERSPECTIVE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">场景变换</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-blue-500"
                        value={state.currentTask.sceneType}
                        onChange={(e) => setState(prev => ({ ...prev, currentTask: { ...prev.currentTask, sceneType: e.target.value }}))}
                      >
                        {SCENE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!state.currentTask.prompt || state.isGenerating}
                    className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-xl transition-all ${
                      !state.currentTask.prompt || state.isGenerating ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 active:scale-95'
                    }`}
                  >
                    {state.isGenerating ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-wand-sparkles"></i>}
                    {state.isGenerating ? 'Gemini Flash 生成中...' : '开始生成变体 / Start Generation'}
                  </button>
                  <p className="text-[10px] text-center text-slate-500 italic">系统将先使用 Flash 语义模型解析指令，再生成 4 种写实路径图。</p>
                </div>
              </div>
            </div>
          )}

          {step === AppStep.GENERATE && (
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black">生成结果 <span className="text-slate-500 text-lg font-bold ml-2">Step 3: Variants</span></h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {state.isGenerating ? 'Flash 模型正在快速创作写实变体，请稍候...' : '已为您准备好 4 种路径的写实变体方案。'}
                  </p>
                </div>
                {!state.isGenerating && (
                  <div className="flex gap-2">
                    {state.results.length > 0 && (
                      <button 
                        onClick={handleDownloadAll}
                        className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-green-600/20"
                      >
                        <i className="fas fa-download"></i> 一键下载全部 / Download All
                      </button>
                    )}
                    <button 
                      onClick={handleBackToDescribe}
                      className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <i className="fas fa-edit"></i> 返回修改描述 / Edit Prompt
                    </button>
                    <button 
                      onClick={handleRedo}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      <i className="fas fa-rotate-right"></i> 重新生成 / Redo
                    </button>
                  </div>
                )}
              </div>

              {state.error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-5 rounded-xl flex items-start gap-4 animate-shake">
                  <i className="fas fa-circle-exclamation text-xl mt-1"></i>
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">系统诊断报告 / Diagnostic</p>
                    <p className="text-sm leading-relaxed">{state.error}</p>
                  </div>
                  <button onClick={handleBackToDescribe} className="bg-red-500/20 hover:bg-red-500/30 text-xs py-1 px-3 rounded-md transition-colors">修改 Prompt</button>
                </div>
              )}

              {selectedResult ? (
                <div className="space-y-6">
                  <button onClick={() => setSelectedResult(null)} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors">
                    <i className="fas fa-chevron-left"></i> 返回概览 / Back to Grid
                  </button>
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2">
                      <ComparisonSlider original={state.originalImage!} modified={selectedResult.url} />
                    </div>
                    <div className="space-y-6">
                      <div className="glass p-6 rounded-2xl border-l-4 border-l-blue-500">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">详情 / Details</h3>
                        <p className="text-xs text-slate-300 leading-relaxed italic mb-4 font-medium">"{state.currentTask.prompt}"</p>
                        <div className="space-y-4">
                           <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                             <span>模式 / Mode</span>
                             <span className="text-blue-400">{selectedResult.mode.replace('_', ' ')}</span>
                           </div>
                           <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                             <span>比例 / Ratio</span>
                             <span className="text-blue-400">16 : 9 (Real)</span>
                           </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDownloadImage(selectedResult.url, `variant-${selectedResult.mode}`)}
                        className="w-full bg-blue-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                      >
                        <i className="fas fa-download"></i> 下载这张图片
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <ImageGrid 
                  results={state.results} 
                  isLoading={state.isGenerating} 
                  onSelect={setSelectedResult}
                />
              )}
            </div>
          )}
        </div>
      </main>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default App;
