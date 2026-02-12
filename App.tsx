import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Commission, CommissionStatus, ThemeMode, CommissionType } from './types';
import { DEFAULT_COMMISSION_TYPES } from './constants';
import { CommissionCard } from './components/CommissionCard';
import { AddCommissionForm } from './components/AddCommissionForm';
import { ClientRequestForm } from './components/ClientRequestForm';
import { EditCommissionForm } from './components/EditCommissionForm';
import { TypeManager } from './components/TypeManager';
import { 
  subscribeToCommissions, 
  subscribeToSettings, 
  addCommissionToCloud, 
  updateCommissionInCloud, 
  deleteCommissionFromCloud, 
  updateGlobalSettings,
  subscribeToConnectionStatus,
  ConnectionStatus
} from './services/firebase';
import { Search, Sparkles, Lock, Unlock, Palette, Key, X, ChevronRight, Home, PenTool, LayoutDashboard, Power, Ban, DollarSign, FileText, Cloud, CloudOff, Wifi, WifiOff, Facebook, Instagram } from 'lucide-react';

const ARTIST_NAME = '百百嵂';
const ADMIN_PASSWORD = 'X90058';

type Page = 'home' | 'tracking' | 'terms' | 'request';

const App: React.FC = () => {
  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>('home');

  // Data State
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionTypes, setCommissionTypes] = useState<CommissionType[]>([]);
  const [isCommissionsOpen, setIsCommissionsOpen] = useState(true);
  
  // View/Filter State
  const [viewMode, setViewMode] = useState<ThemeMode>('client'); // Default is client
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'All'>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [showTypeManager, setShowTypeManager] = useState(false);
  
  // Auth State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  
  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Initialize Data (Subscribe to Firebase)
  useEffect(() => {
    // 1. Subscribe to Commissions
    const unsubscribeCommissions = subscribeToCommissions((data) => {
      setCommissions(data);
    });

    // 2. Subscribe to Settings (Types & Open Status)
    const unsubscribeSettings = subscribeToSettings((settings) => {
      if (settings) {
        setIsCommissionsOpen(settings.isOpen);
        if (settings.types && settings.types.length > 0) {
            setCommissionTypes(settings.types);
        } else {
            setCommissionTypes(DEFAULT_COMMISSION_TYPES);
        }
      }
    });

    // 3. Subscribe to Connection Status
    const unsubscribeStatus = subscribeToConnectionStatus((status) => {
        setConnectionStatus(status);
    });

    return () => {
      unsubscribeCommissions();
      unsubscribeSettings();
      unsubscribeStatus();
    };
  }, []);

  // Auto-focus password input when modal opens
  useEffect(() => {
    if (showAuthModal && passwordInputRef.current) {
        setTimeout(() => passwordInputRef.current?.focus(), 100);
    }
  }, [showAuthModal]);

  // Handlers - Now async to allow error propagation
  const handleUpdateStatus = (id: string, newStatus: CommissionStatus) => {
    const commission = commissions.find(c => c.id === id);
    if (commission) {
        updateCommissionInCloud({
            ...commission,
            status: newStatus,
            lastUpdated: new Date().toISOString().split('T')[0]
        }).catch(err => {
            console.error("Status update failed:", err);
            alert("更新狀態失敗，請檢查網路連線");
        });
    }
  };

  const handleDelete = (id: string) => {
    deleteCommissionFromCloud(id).catch(err => {
        console.error("Delete failed:", err);
        alert("刪除失敗，請檢查網路連線");
    });
  };

  const handleAdd = async (newCommission: Commission) => {
    const commissionToAdd = {
        ...newCommission,
        artistId: ARTIST_NAME
    };
    // Let the error propagate to the form component
    await addCommissionToCloud(commissionToAdd);
    setIsAdding(false);
  };

  const handleClientRequestSubmit = async (newCommission: Commission) => {
     const commissionToAdd = {
        ...newCommission,
        artistId: ARTIST_NAME
    };
    // Let the error propagate to the form component
    await addCommissionToCloud(commissionToAdd);
  };

  const handleEdit = async (updatedCommission: Commission) => {
    await updateCommissionInCloud(updatedCommission);
    setEditingCommission(null);
  };

  const handleUpdateTypes = (newTypes: CommissionType[]) => {
      setCommissionTypes(newTypes);
      updateGlobalSettings({ types: newTypes });
  };

  const toggleCommissionStatus = () => {
      if (viewMode === 'admin') {
          const newState = !isCommissionsOpen;
          setIsCommissionsOpen(newState); // Optimistic UI update
          updateGlobalSettings({ isOpen: newState });
      }
  };

  const handleModeSwitchRequest = () => {
    if (viewMode === 'admin') {
        setViewMode('client');
    } else {
        setShowAuthModal(true);
        setPasswordInput('');
        setAuthError(false);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
        setViewMode('admin');
        setShowAuthModal(false);
        setPasswordInput('');
        setCurrentPage('tracking'); 
    } else {
        setAuthError(true);
        const input = passwordInputRef.current || document.getElementById('password-input');
        if (input) {
            input.classList.remove('animate-shake');
            void input.offsetWidth; 
            input.classList.add('animate-shake');
        }
    }
  };

  // Filter Logic
  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        c.clientName.toLowerCase().includes(term) || 
        c.title.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term);
      
      const matchesFilter = statusFilter === 'All' || c.status === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [commissions, searchTerm, statusFilter]);

  const shouldShowList = useMemo(() => {
    if (viewMode === 'admin') return true;
    return searchTerm.trim().length > 0;
  }, [viewMode, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthlyRevenue = commissions.reduce((sum, c) => {
        const cDate = new Date(c.dateAdded);
        if (!isNaN(cDate.getTime()) && 
            cDate.getFullYear() === currentYear && 
            cDate.getMonth() === currentMonth) {
            
            const p = Number(c.price);
            return sum + (isNaN(p) ? 0 : p);
        }
        return sum;
    }, 0);

    return {
        queue: commissions.filter(c => c.status === CommissionStatus.QUEUE).length,
        active: commissions.filter(c => c.status !== CommissionStatus.QUEUE && c.status !== CommissionStatus.DONE).length,
        done: commissions.filter(c => c.status === CommissionStatus.DONE).length,
        total: monthlyRevenue
    }
  }, [commissions]);

  // Render Status Badge
  const renderStatusBadge = () => {
      if (connectionStatus === 'connected') {
          return (
            <span className="flex items-center gap-1.5 text-green-600 text-[10px] font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100 shadow-sm animate-in fade-in">
                <Cloud size={12} className="text-green-500" /> 
                Cloud Synced
            </span>
          );
      } else if (connectionStatus === 'offline') {
          return (
            <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100 shadow-sm animate-in fade-in">
                <CloudOff size={12} /> 
                Offline
            </span>
          );
      } else {
          return (
            <span className="flex items-center gap-1.5 text-stone-400 text-[10px] font-bold bg-stone-100 px-3 py-1 rounded-full border border-stone-200 animate-pulse">
                <Wifi size={12} /> 
                Connecting...
            </span>
          );
      }
  };

  // --- Render Sections ---
  // (Rendering code remains largely same, just updated handler props)

  const renderHome = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#ffa9c2] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

        <div className="text-center mb-10 relative z-10">
            <div className="bg-white p-4 rounded-3xl shadow-xl shadow-pink-100 inline-block mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                 <Sparkles size={48} className="text-[#ff5c8d]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-stone-700 tracking-tight mb-4">
                百百嵂的委託小舖
            </h1>
            <p className="text-stone-400 text-lg font-medium flex items-center justify-center gap-2">
                歡迎光臨！請選擇您需要的服務 🎨
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl relative z-10 mb-10">
            <button 
                onClick={() => {
                    if (isCommissionsOpen) {
                        setAgreedToTerms(false);
                        setCurrentPage('terms');
                    }
                }}
                disabled={!isCommissionsOpen}
                className={`group rounded-[2.5rem] p-8 text-left transition-all duration-300 
                    ${isCommissionsOpen
                        ? 'bg-[#ffa9c2] hover:bg-[#ff94b3] text-white hover:-translate-y-2 hover:shadow-xl hover:shadow-pink-200 cursor-pointer' 
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed border-4 border-stone-100'
                    }`}
            >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform backdrop-blur-sm
                     ${isCommissionsOpen ? 'bg-white/20 text-white group-hover:scale-110' : 'bg-stone-300 text-stone-500'}
                `}>
                    {isCommissionsOpen ? <PenTool size={32} /> : <Ban size={32} />}
                </div>
                <h2 className="text-2xl font-bold mb-2">
                    {isCommissionsOpen ? '我要委託' : '暫停接單'}
                </h2>
                <p className={`font-medium ${isCommissionsOpen ? 'text-pink-100' : 'text-stone-400'}`}>
                    {isCommissionsOpen 
                        ? '喜歡我的畫風嗎？\n填寫表單送出您的委託需求！' 
                        : '目前排單已滿或休息中，\n請關注後續公告開啟時間。'
                    }
                </p>
            </button>
            
            <button 
                onClick={() => setCurrentPage('tracking')}
                className="group bg-white hover:bg-stone-50 border-4 border-stone-100 hover:border-pink-200 rounded-[2.5rem] p-8 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-pink-100"
            >
                <div className="bg-pink-50 w-16 h-16 rounded-2xl flex items-center justify-center text-[#ff5c8d] mb-6 group-hover:scale-110 transition-transform">
                    <Search size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-700 mb-2">委託進度查詢</h2>
                <p className="text-stone-400 font-medium">已經有委託了嗎？<br/>輸入 ID 查詢目前的繪製進度。</p>
            </button>
        </div>

        {/* Contact Section */}
        <div className="mt-4 flex flex-col items-center gap-4 relative z-10 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-3 w-full opacity-60">
                <div className="h-[2px] bg-stone-200 flex-grow rounded-full"></div>
                <span className="text-stone-400 font-bold text-xs tracking-widest uppercase">Contact Me</span>
                <div className="h-[2px] bg-stone-200 flex-grow rounded-full"></div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 w-full">
                {/* Facebook */}
                <a
                    href="https://www.facebook.com/bai.bai.lu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 bg-white border-2 border-[#ffa9c2] text-[#ff5c8d] px-6 py-3 rounded-full font-bold shadow-lg shadow-pink-100 hover:-translate-y-1 hover:shadow-xl hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white hover:shadow-blue-200 transition-all active:scale-95 flex-grow justify-center md:flex-grow-0"
                >
                    <Facebook size={20} className="group-hover:text-white transition-colors" />
                    Facebook
                </a>

                {/* Instagram */}
                <a
                    href="https://www.instagram.com/palette0114?fbclid=IwY2xjawP6bWpleHRuA2FlbQIxMABicmlkETFMaVR2dUZqSHhudFpvZUc3c3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHvTMq2bNc6VDwYCkcfcJ_cVYoOF_BoXbBlOym9QBb5cDXus8W8p0ZKInAHOo_aem_AT8T_rppUmgtczb8Z_vxHg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 bg-white border-2 border-[#ffa9c2] text-[#ff5c8d] px-6 py-3 rounded-full font-bold shadow-lg shadow-pink-100 hover:-translate-y-1 hover:shadow-xl hover:border-transparent hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:text-white hover:shadow-pink-300 transition-all active:scale-95 flex-grow justify-center md:flex-grow-0"
                >
                    <Instagram size={20} className="group-hover:text-white transition-colors" />
                    Instagram
                </a>
            </div>
        </div>
        
        <div className="mt-12 flex flex-col items-center gap-4 relative z-10">
            <div className="text-stone-300 text-sm font-bold flex items-center gap-2">
                © 2026 CommissionTrack 
                {renderStatusBadge()}
            </div>
            
            <button 
                onClick={handleModeSwitchRequest}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'admin' ? 'bg-stone-200 text-stone-600 hover:bg-stone-300' : 'text-stone-300 hover:text-stone-400 hover:bg-pink-50'}`}
                title={viewMode === 'client' ? "管理員登入" : "登出管理模式"}
            >
                {viewMode === 'admin' ? <Unlock size={16} /> : <Lock size={16} />}
            </button>
        </div>
    </div>
  );

  const renderTerms = () => (
      <div className="min-h-screen pt-8 pb-10 px-4">
          <div className="max-w-3xl mx-auto mb-6">
              <button 
                onClick={() => setCurrentPage('home')}
                className="flex items-center gap-2 text-stone-400 hover:text-stone-600 font-bold bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all"
              >
                  <Home size={18} /> 返回首頁
              </button>
          </div>
          <div className="bg-white border-2 border-pink-100 rounded-3xl p-8 shadow-xl shadow-pink-50/50 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-stone-100">
                <h3 className="text-xl font-bold text-[#ff5c8d] flex items-center gap-3">
                    <div className="bg-pink-100 p-2 rounded-xl text-[#ff5c8d]">
                        <FileText size={24} /> 
                    </div>
                    委託須知
                </h3>
              </div>

              <div className="prose prose-stone max-w-none text-stone-600 prose-li:my-1 prose-h4:mb-2 prose-h4:text-stone-700">
                  <h4>加價項目：</h4>
                  <ul>
                      <li>複雜設+200-1000</li>
                      <li>急單價格*2（兩週或當月排滿之插單）</li>
                      <li>買斷不公開價格*2.5</li>
                  </ul>

                  <h4>不接角色：</h4>
                   <ul>
                        <li>轟燈矢、相澤消太、佐助、酷拉皮卡、徐智修….夢向</li>
                        <li>沖神以外之沖田總悟及神樂夢向</li>
                    </ul>
              </div>

               <div className="mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-stone-100">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={() => setAgreedToTerms(!agreedToTerms)}
                            className="w-5 h-5 accent-pink-500"
                        />
                        <span className="text-sm font-bold text-stone-600">我已閱讀並同意以上委託規則</span>
                    </label>
                    <button 
                        onClick={() => setCurrentPage('request')}
                        disabled={!agreedToTerms}
                        className="bg-[#ffa9c2] hover:bg-[#ff94b3] text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-pink-200 hover:-translate-y-0.5 active:scale-95 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ffa9c2] disabled:hover:-translate-y-0"
                    >
                        我已閱讀並同意，下一步 <ChevronRight size={18} />
                    </button>
                </div>
          </div>
      </div>
  );

  const renderRequest = () => (
      <div className="min-h-screen pt-8 pb-10 px-4">
          <div className="max-w-3xl mx-auto mb-6">
              <button 
                onClick={() => setCurrentPage('terms')}
                className="flex items-center gap-2 text-stone-400 hover:text-stone-600 font-bold bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all"
              >
                  <ChevronRight className="transform rotate-180" size={18} /> 返回委託須知
              </button>
          </div>
          <ClientRequestForm 
            availableTypes={commissionTypes}
            onSubmit={handleClientRequestSubmit}
            onCancel={() => setCurrentPage('home')}
          />
      </div>
  );

  const renderTracking = () => (
    <div className="min-h-screen flex flex-col relative">
      <div className="pt-8 px-6 max-w-5xl mx-auto w-full">
         <div className="flex items-center justify-between mb-8 text-[#ff5c8d] opacity-90">
            <div className="flex items-center gap-3">
                 <button
                    onClick={() => setCurrentPage('home')}
                    className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                  >
                    <div className="bg-white p-2 rounded-full shadow-sm text-stone-400 group-hover:text-[#ff5c8d] transition-colors">
                        <Home size={20} />
                    </div>
                    <h1 className="text-xl font-bold tracking-wide">返回首頁</h1>
                  </button>
            </div>
            
            {viewMode === 'admin' && (
                <div className="flex items-center gap-3">
                     <button
                        onClick={toggleCommissionStatus}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                            ${isCommissionsOpen 
                                ? 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200' 
                                : 'bg-stone-200 text-stone-500 border-stone-300 hover:bg-stone-300'
                            }`}
                     >
                        <Power size={14} />
                        {isCommissionsOpen ? '接單中' : '暫停中'}
                     </button>

                    <span className="text-sm font-bold bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm text-stone-600 animate-in fade-in flex items-center gap-2">
                        <LayoutDashboard size={14}/> 管理員模式
                    </span>
                </div>
            )}
        </div>

        <div className="mb-10 text-center sm:text-left sm:flex justify-between items-end animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="mb-8 sm:mb-0">
                <h2 className="text-3xl font-bold text-[#ff5c8d] mb-3 tracking-tight">
                    {viewMode === 'client' 
                        ? '委託進度查詢 ✨' 
                        : `歡迎回來，${ARTIST_NAME}！🎨`
                    }
                </h2>
                <p className="text-stone-500 max-w-lg font-medium leading-relaxed">
                    {viewMode === 'client' 
                        ? '請輸入您的委託 ID 或名稱，查看目前的繪製進度。' 
                        : '今天也要元氣滿滿的畫圖！這裡可以管理排單和進度喔。'}
                </p>
            </div>
            <div className="flex gap-3 justify-center sm:justify-end text-sm flex-wrap">
                {viewMode === 'admin' && (
                    <div className="bg-[#fff0f5] border-2 border-[#ffa9c2] px-4 py-3 rounded-2xl text-center min-w-[80px] shadow-sm transform hover:-translate-y-1 transition-transform">
                        <div className="text-2xl font-bold text-[#ff5c8d] flex items-center justify-center gap-1">
                            <span className="text-lg">$</span>
                            {stats.total.toLocaleString()}
                        </div>
                        <div className="text-xs text-[#ff5c8d]/70 font-bold">預估本月收益</div>
                    </div>
                )}
                <div className="bg-white border-2 border-stone-200 px-4 py-3 rounded-2xl text-center min-w-[80px] shadow-sm transform hover:-translate-y-1 transition-transform">
                    <div className="text-2xl font-bold text-stone-600">{stats.queue}</div>
                    <div className="text-xs text-stone-400 font-bold">排單中</div>
                </div>
                <div className="bg-white border-2 border-pink-100 px-4 py-3 rounded-2xl text-center min-w-[80px] shadow-sm transform hover:-translate-y-1 transition-transform">
                    <div className="text-2xl font-bold text-[#ff5c8d]">{stats.active}</div>
                    <div className="text-xs text-pink-400 font-bold">繪製中</div>
                </div>
                <div className="bg-white border-2 border-[#ffa9c2]/20 px-4 py-3 rounded-2xl text-center min-w-[80px] shadow-sm transform hover:-translate-y-1 transition-transform">
                    <div className="text-2xl font-bold text-[#ffa9c2]">{stats.done}</div>
                    <div className="text-xs text-[#ffa9c2]/70 font-bold">已完成</div>
                </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-10 sticky top-6 z-40 bg-[#fffafb]/90 p-4 -mx-4 md:mx-0 rounded-3xl border-2 border-white shadow-lg shadow-pink-100/50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
            <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400" size={20} />
            <input 
                type="text" 
                placeholder={viewMode === 'client' ? "輸入您的名稱 (ID) 查詢進度..." : "搜尋委託..."}
                className="w-full bg-white border-2 border-stone-200 text-stone-700 pl-12 pr-6 py-3 rounded-full focus:ring-4 focus:ring-[#ffa9c2]/10 focus:border-[#ffa9c2] focus:outline-none transition-all placeholder:text-stone-400 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar px-1">
            <select 
                className="bg-white border-2 border-stone-200 text-stone-600 px-6 py-3 rounded-full focus:ring-4 focus:ring-[#ffa9c2]/10 focus:border-[#ffa9c2] focus:outline-none font-bold cursor-pointer hover:border-stone-300"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
            >
                <option value="All">所有狀態</option>
                {Object.values(CommissionStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
            
            {viewMode === 'admin' && (
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 bg-[#ffa9c2] hover:bg-[#ff94b3] text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg shadow-pink-200 hover:shadow-xl hover:-translate-y-0.5 whitespace-nowrap active:scale-95"
                >
                    <Palette size={20} /> 新增委託
                </button>
            )}
            </div>
        </div>

        {viewMode === 'admin' && isAdding && (
            <AddCommissionForm 
                onAdd={handleAdd} 
                onCancel={() => setIsAdding(false)} 
                availableTypes={commissionTypes}
                onManageTypes={() => setShowTypeManager(true)}
            />
        )}

        {viewMode === 'admin' && editingCommission && (
            <EditCommissionForm 
                commission={editingCommission} 
                onSave={handleEdit} 
                onCancel={() => setEditingCommission(null)} 
                availableTypes={commissionTypes}
                onManageTypes={() => setShowTypeManager(true)}
            />
        )}

        <div className="space-y-6 pb-20">
            {!shouldShowList ? (
                <div className="text-center py-20 opacity-70">
                    <div className="mx-auto w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-5 animate-[pulse_3s_ease-in-out_infinite]">
                        <Search className="text-pink-200" size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-stone-500">輸入委託人名稱開始查詢</h3>
                    <p className="text-stone-400 mt-2 font-medium text-sm">請在上方搜尋欄輸入您的 ID 以查看進度</p>
                </div>
            ) : filteredCommissions.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-stone-200">
                    <div className="mx-auto w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                        <Search className="text-stone-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-stone-600">找不到相關委託捏...</h3>
                    <p className="text-stone-400 mt-2 font-medium">
                        {viewMode === 'admin' ? "目前沒有符合條件的委託" : "試試看別的關鍵字？"}
                    </p>
                </div>
            ) : (
                filteredCommissions.map(commission => (
                    <CommissionCard 
                        key={commission.id}
                        commission={commission}
                        isAdmin={viewMode === 'admin'}
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDelete}
                        onEdit={(c) => setEditingCommission(c)}
                    />
                ))
            )}
        </div>
      </div>

      <footer className="py-8 border-t border-stone-200 text-center mt-auto">
        <p className="text-stone-400 text-sm font-medium mb-4">
            © 2026 CommissionTrack
        </p>
        <div className="flex justify-center">
            <button 
                onClick={handleModeSwitchRequest}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'admin' ? 'bg-stone-200 text-stone-600 hover:bg-stone-300' : 'text-stone-300 hover:text-stone-400 hover:bg-stone-100'}`}
                title={viewMode === 'client' ? "管理員登入" : "登出管理模式"}
            >
                {viewMode === 'admin' ? <Unlock size={16} /> : <Lock size={16} />}
            </button>
        </div>
      </footer>
    </div>
  );

  return (
    <div className="bg-[#fffafb] min-h-screen text-stone-600 font-sans selection:bg-pink-100 selection:text-pink-600">
      {currentPage === 'home' && renderHome()}
      {currentPage === 'tracking' && renderTracking()}
      {currentPage === 'terms' && renderTerms()}
      {currentPage === 'request' && renderRequest()}

      {showAuthModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-pink-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-stone-700 flex items-center gap-2">
                        <Key className="text-[#ff5c8d]" size={20} />
                        管理員登入
                    </h3>
                    <button onClick={() => setShowAuthModal(false)} className="text-stone-400 hover:text-stone-600">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleAuthSubmit}>
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-stone-400 mb-2 ml-1">請輸入密碼</label>
                        <input 
                            ref={passwordInputRef}
                            id="password-input"
                            type="password" 
                            className={`w-full bg-stone-50 border-2 rounded-xl px-4 py-3 text-stone-700 focus:outline-none transition-all font-bold tracking-widest
                                ${authError 
                                    ? 'border-red-300 focus:border-red-500 bg-red-50 text-red-500 placeholder-red-300' 
                                    : 'border-stone-200 focus:border-[#ffa9c2] focus:ring-4 focus:ring-[#ffa9c2]/20'
                                }`}
                            value={passwordInput}
                            onChange={(e) => {
                                setPasswordInput(e.target.value);
                                setAuthError(false);
                            }}
                            placeholder="••••••"
                        />
                        {authError && (
                            <p className="text-red-500 text-xs font-bold mt-2 ml-1 animate-in slide-in-from-left-2">密碼錯誤，請再試一次。</p>
                        )}
                    </div>
                    <button 
                        type="submit"
                        className="w-full bg-[#ffa9c2] hover:bg-[#ff94b3] text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-pink-200 hover:-translate-y-0.5 active:scale-95"
                    >
                        確認登入
                    </button>
                </form>
            </div>
        </div>
      )}

      {showTypeManager && (
          <TypeManager 
            types={commissionTypes}
            onUpdateTypes={handleUpdateTypes}
            onClose={() => setShowTypeManager(false)}
          />
      )}
    </div>
  );
};

export default App;