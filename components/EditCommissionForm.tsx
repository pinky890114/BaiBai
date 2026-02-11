import React, { useState, useEffect, useRef } from 'react';
import { Commission, CommissionStatus, CommissionType } from '../types';
import { Save, X, Link as LinkIcon, Upload, Trash2, Settings, Loader2 } from 'lucide-react';
import { uploadCommissionImage } from '../services/firebase';

interface EditCommissionFormProps {
  commission: Commission;
  onSave: (updated: Commission) => void;
  onCancel: () => void;
  availableTypes: CommissionType[];
  onManageTypes: () => void;
}

export const EditCommissionForm: React.FC<EditCommissionFormProps> = ({ commission, onSave, onCancel, availableTypes, onManageTypes }) => {
  const [formData, setFormData] = useState<Commission>(commission);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(commission);
  }, [commission]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTypeName = e.target.value;
      setFormData(prev => ({ 
          ...prev, 
          type: newTypeName,
      }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert("圖片檔案過大 (超過 5MB)，請壓縮後再上傳。");
            return;
        }

        setSelectedFile(file);

        // Preview
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
    let finalImageUrl = formData.thumbnailUrl;

    if (selectedFile) {
        try {
            finalImageUrl = await uploadCommissionImage(selectedFile);
        } catch (error) {
            alert("圖片上傳失敗，請重試");
            setIsSubmitting(false);
            return;
        }
    }

    onSave({
        ...formData,
        thumbnailUrl: finalImageUrl || '',
        lastUpdated: new Date().toISOString().split('T')[0]
    });
    // Parent handles closing, so we don't strictly need to setIsSubmitting(false) here, but good practice.
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-stone-100 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 relative">
        
        {isSubmitting && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 rounded-3xl flex items-center justify-center flex-col gap-3">
                <Loader2 className="animate-spin text-[#ff5c8d]" size={40} />
                <span className="font-bold text-[#ff5c8d]">處理中...</span>
            </div>
        )}

        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-8 py-5 border-b-2 border-stone-100 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-stone-700 flex items-center gap-2">
             編輯委託單
             <span className="text-sm font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">#{commission.id}</span>
          </h3>
          <button onClick={onCancel} className="bg-stone-100 p-2 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors">
              <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">委託人名稱 (ID)</label>
              <input 
                required
                type="text" 
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none font-medium transition-all"
                value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})}
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
            
            {/* Image Upload Section */}
            <div>
               <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">參考圖/縮圖</label>
               
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
                        <span className="text-xs font-bold">上傳圖片 (Max 5MB)</span>
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
                            value={formData.thumbnailUrl || ''}
                            onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                            placeholder="或是貼上圖片連結..."
                        />
                        <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    </div>
                </div>
               )}
            </div>

            <div>
               <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">當前狀態</label>
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
          </div>
          
          <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-500 mb-2 ml-1">詳細需求描述</label>
              <textarea 
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 focus:ring-4 focus:ring-[#ffa9c2]/20 focus:border-[#ffa9c2] focus:outline-none h-32 resize-none font-medium transition-all"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
          </div>
          
          <div className="md:col-span-2 pt-6 flex justify-end gap-3 border-t border-stone-100">
               <button 
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2.5 rounded-full text-stone-500 font-bold hover:bg-stone-100 transition-all text-sm"
              >
                  取消
              </button>
              <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#ffa9c2] hover:bg-[#ff94b3] text-white font-bold py-2.5 px-8 rounded-full transition-all shadow-lg shadow-pink-200 hover:-translate-y-0.5 active:scale-95 text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                  <Save size={16} /> {isSubmitting ? '儲存中...' : '儲存變更'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};