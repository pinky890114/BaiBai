import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Commission, CommissionStatus, CommissionType } from '../types';
import { Send, X, Link as LinkIcon, Upload, Trash2, Sparkles, CheckCircle, Calculator, Loader2 } from 'lucide-react';
import { uploadCommissionImage } from '../services/firebase';

interface ClientRequestFormProps {
  onSubmit: (c: Commission) => Promise<void>;
  onCancel: () => void;
  availableTypes: CommissionType[];
}

export const ClientRequestForm: React.FC<ClientRequestFormProps> = ({ onSubmit, onCancel, availableTypes }) => {
  const defaultTypeName = availableTypes.length > 0 ? availableTypes[0].name : '';
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  
  const [formData, setFormData] = useState<Partial<Commission>>({
    clientName: '',
    title: '',
    description: '',
    type: defaultTypeName,
    thumbnailUrl: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find price based on selected type
  const estimatedPrice = useMemo(() => {
    const typeObj = availableTypes.find(t => t.name === formData.type);
    return typeObj ? typeObj.price : 0;
  }, [formData.type, availableTypes]);

  useEffect(() => {
    if (availableTypes.length > 0 && (!formData.type || !availableTypes.some(t => t.name === formData.type))) {
        setFormData(prev => ({ ...prev, type: availableTypes[0].name }));
    }
  }, [availableTypes, formData.type]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert("圖片檔案過大 (超過 5MB)。請壓縮後再上傳。");
            return;
        }
        
        setSelectedFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, thumbnailUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    
    try {
        let finalImageUrl = formData.thumbnailUrl;

        // Upload image if file selected
        if (selectedFile) {
            finalImageUrl = await uploadCommissionImage(selectedFile);
        }

        const newId = `c-${Date.now().toString().slice(-6)}`; // Simple shorter ID
        setGeneratedId(newId);

        const newCommission: Commission = {
          id: newId,
          artistId: '',
          clientName: formData.clientName || '匿名',
          title: formData.title || '未命名委託',
          description: formData.description || '',
          type: formData.type || '其他',
          price: estimatedPrice, // Set the estimated price as initial price
          status: CommissionStatus.CONFIRMING,
          dateAdded: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString().split('T')[0],
          thumbnailUrl: finalImageUrl || ''
        };
        
        // Wait for the parent (cloud submission) to finish
        await onSubmit(newCommission);
        
        // Only if successful:
        setIsSubmitted(true);
        
    } catch (error) {
        console.error("Form submission error:", error);
        alert("❌ 委託送出失敗！請檢查您的網路連線，或稍後再試。\n\n錯誤原因: " + (error instanceof Error ? error.message : "未知錯誤"));
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
      return (
          <div className="bg-white border-2 border-[#ffa9c2] rounded-3xl p-10 max-w-lg mx-auto text-center shadow-xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-stone-700 mb-2">委託申請已送出！</h3>
              <p className="text-stone-500 mb-6">感謝您的委託，繪師將會盡快確認您的需求。</p>
              
              <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl p-6 mb-8">
                  <p className="text-xs font-bold text-stone-400 mb-2">您的追蹤 ID (請妥善保存)</p>
                  <p className="text-3xl font-black text-[#ff5c8d] tracking-wider select-all cursor-text">{generatedId}</p>
              </div>

              <div className="bg-pink-50 rounded-xl p-4 mb-8">
                  <p className="text-stone-500 text-sm font-bold">總金額</p>
                  <p className="text-2xl font-black text-[#ff5c8d]">
                    {typeof estimatedPrice === 'number' ? `NT$ ${estimatedPrice}` : estimatedPrice}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">* 實際金額可能會依複雜度調整</p>
              </div>

              <button 
                onClick={onCancel}
                className="bg-[#ffa9c2] hover:bg-[#ff94b3] text-white font-bold py-3 px-10 rounded-full transition-all shadow-lg shadow-pink-200 hover:-translate-y-1"
              >
                  返回首頁
              </button>
          </div>
      );
  }

  return (
    <div className="bg-white border-2 border-pink-100 rounded-3xl p-8 shadow-xl shadow-pink-50/50 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 relative">
      
      {isSubmitting && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 rounded-3xl flex items-center justify-center flex-col gap-3">
              <Loader2 className="animate-spin text-[#ff5c8d]" size={40} />
              <span className="font-bold text-[#ff5c8d]">處理中...</span>
          </div>
      )}

      <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-stone-100">
        <h3 className="text-xl font-bold text-[#ff5c8d] flex items-center gap-3">
            <div className="bg-pink-100 p-2 rounded-xl text-[#ff5c8d]">
                <Sparkles size={24} /> 
            </div>
            填寫委託單
        </h3>
        <button onClick={onCancel} className="bg-stone-100 p-2 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors">
            <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
        <div className="space-y-5 md:col-span-1">
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">您的暱稱 / 稱呼</label>
            <input 
              required
              type="text" 
              className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium transition-all"
              value={formData.clientName}
              onChange={e => setFormData({...formData, clientName: e.target.value})}
              placeholder="例如: 糰子"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">委託標題 (角色/主題)</label>
            <input 
              required
              type="text" 
              className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="例如: 原創角色立繪"
            />
          </div>
           <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">想要的委託項目</label>
            <div className="relative">
                <select 
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium appearance-none cursor-pointer transition-all"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as any})}
                >
                    {availableTypes.map(t => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({typeof t.price === 'number' ? `NT$ ${t.price}` : t.price})
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    ▼
                </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 md:col-span-1">
          {/* Image Upload Section */}
          <div>
             <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">參考圖片 (角色設定/構圖參考)</label>
             
             {formData.thumbnailUrl ? (
                 <div className="relative group w-full h-32 rounded-2xl overflow-hidden border-2 border-pink-100 bg-pink-50">
                    <img src={formData.thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                        type="button"
                        onClick={() => {
                            setFormData({...formData, thumbnailUrl: ''});
                            setSelectedFile(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                        <Trash2 size={16} />
                    </button>
                 </div>
             ) : (
                <div className="space-y-2">
                    {/* Upload Box */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-20 border-2 border-dashed border-pink-200 rounded-2xl flex flex-col items-center justify-center text-pink-300 hover:text-pink-400 hover:border-pink-300 hover:bg-pink-50 transition-all cursor-pointer gap-1"
                    >
                        <Upload size={20} />
                        <span className="text-xs font-bold">點擊上傳 (Max 5MB)</span>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                    </div>
                    
                    {/* URL Input Fallback */}
                    <div className="relative">
                        <input 
                            type="url" 
                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium transition-all placeholder:text-stone-400"
                            value={formData.thumbnailUrl}
                            onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                            placeholder="或是貼上圖片連結..."
                        />
                        <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    </div>
                </div>
             )}
          </div>

          {/* Price Estimate Display */}
          <div className="bg-stone-50 border-2 border-stone-200 rounded-2xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-2 text-stone-500 font-bold text-sm">
                 <Calculator size={18} /> 總金額
             </div>
             <div className="text-xl font-black text-[#ff5c8d]">
                 {typeof estimatedPrice === 'number' ? `NT$ ${estimatedPrice}` : estimatedPrice}
             </div>
          </div>
        </div>
        
        <div className="md:col-span-2">
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">詳細需求描述</label>
            <textarea 
              className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none h-32 resize-none font-medium transition-all"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="請描述您希望的動作、表情、氛圍，或是任何注意事項..."
            />
        </div>

        <div className="md:col-span-2 pt-4 flex justify-end border-t border-stone-100 mt-2">
            <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-[#ffa9c2] hover:bg-[#ff94b3] text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-pink-200 hover:-translate-y-0.5 active:scale-95 text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <Send size={18} /> {isSubmitting ? '處理中...' : '送出委託申請'}
            </button>
        </div>
      </form>
    </div>
  );
};