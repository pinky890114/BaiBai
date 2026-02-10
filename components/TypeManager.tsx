import React, { useState } from 'react';
import { X, Plus, Trash2, Settings, DollarSign } from 'lucide-react';
import { CommissionType } from '../types';

interface TypeManagerProps {
  types: CommissionType[];
  onUpdateTypes: (newTypes: CommissionType[]) => void;
  onClose: () => void;
}

export const TypeManager: React.FC<TypeManagerProps> = ({ types, onUpdateTypes, onClose }) => {
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePrice, setNewTypePrice] = useState<string>('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTypeName.trim() && !types.some(t => t.name === newTypeName.trim())) {
      // Check if price is a number
      const parsedPrice = Number(newTypePrice);
      const finalPrice = isNaN(parsedPrice) && newTypePrice !== '' ? newTypePrice : (parsedPrice || 0);

      onUpdateTypes([
        ...types, 
        { name: newTypeName.trim(), price: finalPrice }
      ]);
      setNewTypeName('');
      setNewTypePrice('');
    }
  };

  const handleDelete = (typeNameToDelete: string) => {
    if (confirm(`確定要刪除「${typeNameToDelete}」這個類型嗎？`)) {
        onUpdateTypes(types.filter(t => t.name !== typeNameToDelete));
    }
  };

  const handlePriceUpdate = (typeName: string, newValue: string) => {
      const parsed = Number(newValue);
      const finalValue = isNaN(parsed) && newValue !== '' ? newValue : parsed;

      onUpdateTypes(types.map(t => 
        t.name === typeName ? { ...t, price: finalValue } : t
      ));
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-pink-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-stone-700 flex items-center gap-2">
            <div className="bg-pink-100 p-2 rounded-lg text-[#ff5c8d]">
                <Settings size={20} />
            </div>
            管理委託項目與價格
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Add New */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-6 items-end">
          <div className="flex-grow space-y-1">
              <label className="text-xs font-bold text-stone-400 ml-1">項目名稱</label>
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="例如: 全身立繪"
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#ffa9c2]/50 focus:border-[#ffa9c2] focus:outline-none"
              />
          </div>
          <div className="w-28 space-y-1">
              <label className="text-xs font-bold text-stone-400 ml-1">預設價格</label>
              <input
                type="text"
                value={newTypePrice}
                onChange={(e) => setNewTypePrice(e.target.value)}
                placeholder="$$$ 或 自帶價"
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#ffa9c2]/50 focus:border-[#ffa9c2] focus:outline-none text-right"
              />
          </div>
          <button 
            type="submit"
            disabled={!newTypeName.trim()}
            className="bg-[#ffa9c2] hover:bg-[#ff94b3] text-white p-2.5 rounded-xl disabled:opacity-50 transition-colors h-[42px] mb-[1px]"
          >
            <Plus size={20} />
          </button>
        </form>

        {/* List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {types.map((type) => (
            <div key={type.name} className="flex justify-between items-center bg-stone-50 px-4 py-3 rounded-xl border border-stone-100 group hover:border-pink-200 transition-colors">
              <span className="font-bold text-stone-600 text-sm">{type.name}</span>
              
              <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-stone-200">
                      {typeof type.price === 'number' && <DollarSign size={12} className="text-stone-400"/>}
                      <input 
                        type="text"
                        className="w-20 text-right text-sm font-bold text-stone-600 focus:outline-none bg-transparent"
                        value={type.price}
                        onChange={(e) => handlePriceUpdate(type.name, e.target.value)}
                      />
                  </div>
                  <button
                    onClick={() => handleDelete(type.name)}
                    className="text-stone-300 hover:text-red-400 p-1 rounded-md hover:bg-red-50 transition-all"
                    title="刪除"
                  >
                    <Trash2 size={16} />
                  </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center">
            <button 
                onClick={onClose}
                className="text-stone-400 text-xs font-bold hover:text-stone-600 underline decoration-2 decoration-stone-200 underline-offset-4"
            >
                完成編輯
            </button>
        </div>
      </div>
    </div>
  );
};