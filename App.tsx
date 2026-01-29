import React, { useState, useEffect, useCallback } from 'react';
import { Account, AiInsight } from './types';
import { generateTOTP, getTimeRemaining, isValidBase32 } from './utils/totp';
import { getSecurityInsight } from './services/geminiService';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Copy, 
  Clock, 
  KeyRound, 
  Sparkles,
  AlertTriangle,
  Lock
} from 'lucide-react';

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('totp_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [codes, setCodes] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(30);
  
  // Form State
  const [issuerInput, setIssuerInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // AI State
  const [insight, setInsight] = useState<AiInsight | null>(null);

  // Update logic
  useEffect(() => {
    localStorage.setItem('totp_accounts', JSON.stringify(accounts));
  }, [accounts]);

  const updateCodes = useCallback(async () => {
    const newCodes: Record<string, string> = {};
    for (const acc of accounts) {
      newCodes[acc.id] = await generateTOTP(acc.secret);
    }
    setCodes(newCodes);
    setTimeLeft(getTimeRemaining());
  }, [accounts]);

  // Timer loop
  useEffect(() => {
    updateCodes(); // Initial call
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining());
      // Refresh code if a new period starts
      if (getTimeRemaining() === 30) {
        updateCodes();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [updateCodes]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const secretClean = secretInput.trim().replace(/\s/g, '').toUpperCase();

    if (!issuerInput.trim()) {
      setErrorMsg('请输入服务名称 (如 Google, GitHub)');
      return;
    }
    if (!secretClean || !isValidBase32(secretClean)) {
      setErrorMsg('Secret Key 格式无效 (应为 Base32 字符串)');
      return;
    }

    const newAccount: Account = {
      id: crypto.randomUUID(),
      issuer: issuerInput.trim(),
      accountName: 'User', // Simplified for this demo
      secret: secretClean,
      addedAt: Date.now()
    };

    setAccounts([...accounts, newAccount]);
    setIssuerInput('');
    setSecretInput('');
    setIsAdding(false);
    
    // Trigger AI Insight for the new account
    fetchInsight(newAccount.issuer);
  };

  const deleteAccount = (id: string) => {
    if (confirm('确定要删除这个 2FA 账户吗？')) {
      setAccounts(accounts.filter(a => a.id !== id));
      if (accounts.length === 1) setInsight(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const fetchInsight = async (serviceName: string) => {
    setInsight({ serviceName, content: '', isLoading: true });
    const text = await getSecurityInsight(serviceName);
    setInsight({ serviceName, content: text, isLoading: false });
  };

  // Format code with space (e.g., 123 456)
  const formatCode = (code: string) => {
    if (!code || code.length !== 6) return '--- ---';
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/40 via-gray-950 to-gray-950 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              SecureAuth AI
            </h1>
            <p className="text-sm text-gray-500">智能 2FA 验证码管理平台</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all ${isAdding ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'}`}
        >
          {isAdding ? <><Trash2 size={18} /><span>取消</span></> : <><Plus size={18} /><span>添加账户</span></>}
        </button>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Top: Account List */}
        <section className="lg:col-span-2 space-y-6">
          
          {/* Add Account Form */}
          {isAdding && (
            <div className="bg-gray-900/50 backdrop-blur-sm border border-indigo-500/30 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <KeyRound className="w-5 h-5 mr-2 text-indigo-400" />
                添加新密钥
              </h2>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">服务商 (Issuer)</label>
                  <input
                    type="text"
                    placeholder="例如: Google, Binance, GitHub"
                    value={issuerInput}
                    onChange={(e) => setIssuerInput(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">密钥 (Secret Key)</label>
                  <input
                    type="text"
                    placeholder="输入 Base32 格式密钥 (如: JBSWY3DPEHPK3PXP)"
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm transition-all"
                  />
                </div>
                
                {errorMsg && (
                  <div className="flex items-center text-red-400 text-sm bg-red-950/30 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center shadow-lg shadow-indigo-500/20"
                >
                  确认添加
                </button>
              </form>
            </div>
          )}

          {/* Accounts Grid */}
          <div className="space-y-4">
            {accounts.length === 0 && !isAdding ? (
              <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed">
                <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">暂无 2FA 账户</p>
                <p className="text-sm text-gray-600 mt-2">点击右上角"添加账户"开始使用</p>
              </div>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="group relative bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white tracking-tight">{acc.issuer}</h3>
                    <div className="flex items-center mt-1 space-x-3">
                       <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">TOTP</span>
                       <button 
                        onClick={() => fetchInsight(acc.issuer)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center hover:underline"
                       >
                         <Sparkles className="w-3 h-3 mr-1" />
                         AI 安全分析
                       </button>
                    </div>
                  </div>

                  {/* Code Display */}
                  <div className="flex items-center space-x-4 bg-black/20 p-3 rounded-xl border border-gray-800/50">
                     <div className="text-3xl font-mono font-bold tracking-wider text-emerald-400 tabular-nums">
                       {formatCode(codes[acc.id])}
                     </div>
                     <button 
                      onClick={() => copyToClipboard(codes[acc.id])}
                      className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      title="复制验证码"
                     >
                       <Copy className="w-5 h-5" />
                     </button>
                  </div>

                  {/* Countdown Visual (Mini) */}
                  <div className="absolute top-0 right-0 h-1 bg-gray-800 w-full rounded-t-2xl overflow-hidden sm:hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${(timeLeft / 30) * 100}%` }}
                    />
                  </div>

                  {/* Delete Action */}
                  <button 
                    onClick={() => deleteAccount(acc.id)}
                    className="absolute top-2 right-2 p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="移除账户"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Sidebar: Status & AI */}
        <aside className="space-y-6">
          
          {/* Global Timer */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
             <div className="relative w-32 h-32 flex items-center justify-center mb-4">
               {/* Background Circle */}
               <svg className="w-full h-full transform -rotate-90">
                 <circle
                   cx="64"
                   cy="64"
                   r="56"
                   stroke="currentColor"
                   strokeWidth="8"
                   fill="transparent"
                   className="text-gray-800"
                 />
                 <circle
                   cx="64"
                   cy="64"
                   r="56"
                   stroke="currentColor"
                   strokeWidth="8"
                   fill="transparent"
                   strokeDasharray={351.86}
                   strokeDashoffset={351.86 - (351.86 * timeLeft) / 30}
                   className={`transition-all duration-1000 ease-linear ${timeLeft < 5 ? 'text-red-500' : 'text-indigo-500'}`}
                 />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className={`text-3xl font-bold tabular-nums ${timeLeft < 5 ? 'text-red-500' : 'text-white'}`}>
                   {timeLeft}
                 </span>
                 <span className="text-xs text-gray-500 uppercase">Seconds</span>
               </div>
             </div>
             <p className="text-sm text-gray-400 flex items-center">
               <Clock className="w-4 h-4 mr-2" />
               验证码每30秒刷新
             </p>
          </div>

          {/* AI Insights Panel */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-gray-900 rounded-2xl p-6 border border-indigo-500/20 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
              Gemini 安全助手
            </h3>
            
            {!insight ? (
               <p className="text-sm text-gray-400 leading-relaxed">
                 点击任意账户旁的 "AI 安全分析" 按钮，让 Google Gemini 为您提供针对该服务的安全加固建议。
               </p>
            ) : (
              <div className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider bg-indigo-900/40 px-2 py-1 rounded">
                    {insight.serviceName}
                  </span>
                </div>
                {insight.isLoading ? (
                  <div className="space-y-2">
                     <div className="h-4 bg-gray-700/50 rounded w-3/4 animate-pulse"></div>
                     <div className="h-4 bg-gray-700/50 rounded w-full animate-pulse"></div>
                     <div className="h-4 bg-gray-700/50 rounded w-5/6 animate-pulse"></div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-indigo-500 pl-3">
                    {insight.content}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Usage Tip */}
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <h4 className="text-sm font-medium text-gray-300 mb-2">使用说明</h4>
            <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
              <li>此应用完全在本地运行，密钥不会上传。</li>
              <li>支持标准的 Base32 密钥 (A-Z, 2-7)。</li>
              <li>如果网站提供二维码，请寻找 "enter key manually" 选项获取密钥文本。</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default App;