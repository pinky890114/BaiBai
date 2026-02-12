import React, { useState, useRef, useEffect } from 'react';
import { Commission, CommissionStatus, CommissionType } from '../types';
import { Plus, X, Link as LinkIcon, Upload, Trash2, Settings, Loader2 } from 'lucide-react';
import { uploadCommissionImage } from '../services/firebase';

interface AddCommissionFormProps {
  onAdd: (c: Commission) => Promise<void>;
  onCancel: () => void;
  availableTypes: CommissionType[];
  onManageTypes: () => void;
}

export const AddCommissionForm: React.FC<AddCommissionFormProps> = ({ onAdd, onCancel, availableTypes, onManageTypes }) => {
  const defaultType = availableTypes.length > 0 ? availableTypes[0] : null;
  
  const [formData, setFormData] = useState<Partial<Commission>>({
    clientName: '',
    contactInfo: '',
    title: '',
    description: '',
    type: defaultType?.name || '',
    price: defaultType?.price || 0,
    status: CommissionStatus.CONFIRMING,
    thumbnailUrl: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (availableTypes.length > 0 && (!formData.type || !availableTypes.some(t => t.name === formData.type))) {
        const first = availableTypes[0];
        setFormData(prev => ({ ...prev, type: first.name, price: first.price }));
    }
  }, [availableTypes, formData.type]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTypeName = e.target.value;
      const typeObj = availableTypes.find(t => t.name === newTypeName);
      setFormData(prev => ({ 
          ...prev, 
          type: newTypeName,
          price: typeObj ? typeObj.price : prev.price
      }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("圖片檔案過大 (超過 5MB)，請壓縮後再上傳。");
            return;
        }
        
        setSelectedFile(file);

        // Create local preview
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

        const newCommission: Commission = {
          id: `c-${Date.now()}`,
          artistId: '', 
          clientName: formData.clientName || '匿名委託人',
          contactInfo: formData.contactInfo || '',
          title: formData.title || '未命名委託',
          description: formData.description || '',
          type: formData.type || '其他',
          price: formData.price!,
          status: formData.status as CommissionStatus,
          dateAdded: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString().split('T')[0],
          thumbnailUrl: finalImageUrl || ''
        };
        
        await onAdd(newCommission);
    } catch (error) {
        console.error("Add commission error:", error);
        alert("新增失敗！請檢查網路連線。" + (error instanceof Error ? error.message : ""));
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border-2 border-pink-100 rounded-3xl p-8 mb-10 animate-in fade-in zoom-in-95 duration-200 shadow-xl shadow-pink-50/50 relative">
      {isSubmitting && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 rounded-3xl flex items-center justify-center flex-col gap-3">
              <Loader2 className="animate-spin text-[#ff5c8d]" size={40} />
              <span className="font-bold text-[#ff5c8d]">處理中...</span>
          </div>
      )}

      <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-stone-100">
        <h3 className="text-xl font-bold text-[#ff5c8d] flex items-center gap-3">
            <div className="bg-pink-100 p-2 rounded-xl text-[#ff5c8d]">
                <Plus size={24} /> 
            </div>
            新增委託單
        </h3>
        <button onClick={onCancel} className="bg-stone-100 p-2 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors">
            <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">委託人名稱 (ID)</label>
            <input 
              required
              type="text" 
              className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium transition-all"
              value={formData.clientName}
              onChange={e => setFormData({...formData, clientName: e.target.value})}
              placeholder="例如: ArtLover99"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">聯絡方式 (FB/IG/Line)</label>
            <input 
              required
              type="text" 
              className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium transition-all"
              value={formData.contactInfo}
              onChange={e => setFormData({...formData, contactInfo: e.target.value})}
              placeholder="例如: line:123456"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">委託項目標題</label>
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
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">委託類型</label>
            <div className="flex gap-2">
                <div className="relative flex-grow">
                    <select 
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium appearance-none cursor-pointer transition-all"
                    value={formData.type}
                    onChange={handleTypeChange}
                    >
                        {availableTypes.map(t => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                        ▼
                    </div>
                </div>
                <button 
                    type="button" 
                    onClick={onManageTypes}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-500 p-3 rounded-2xl border-2 border-stone-200 transition-colors"
                    title="編輯類型列表"
                >
                    <Settings size={20} />
                </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">價格 (NTD/USD)</label>
            <input 
              type="text" 
              className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium transition-all"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
            />
          </div>
           <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">初始狀態</label>
            <div className="relative">
                <select 
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium appearance-none cursor-pointer transition-all"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                {Object.values(CommissionStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    ▼
                </div>
            </div>
          </div>
          
          {/* Image Upload Section */}
          <div>
             <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">參考圖/縮圖 (上傳或連結)</label>
             
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
                        <span className="text-xs font-bold">點擊上傳圖片 (Max 5MB)</span>
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
        </div>
        
        <div className="md:col-span-2">
            <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">詳細需求描述</label>
            <textarea 
              className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none h-28 resize-none font-medium transition-all"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="請輸入委託的詳細內容..."
            />
        </div>

        <div className="md:col-span-2 pt-4 flex justify-end border-t border-stone-100 mt-2">
            <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-[#ffa9c2] hover:bg-[#ff94b3] text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-pink-200 hover:-translate-y-0.5 active:scale-95 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSubmitting ? '儲存中...' : '建立委託單'}
            </button>
        </div>
      </form>
    </div>
  );
};