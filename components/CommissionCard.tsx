import React, { useState } from 'react';
import { Commission, CommissionStatus } from '../types';
import { ProgressBar } from './ProgressBar';
import { STATUS_STEPS } from '../constants';
import { AdminTools } from './AdminTools';
import { 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  DollarSign, 
  Sparkles,
  Pencil,
  Image as ImageIcon
} from 'lucide-react';

interface CommissionCardProps {
  commission: Commission;
  isAdmin: boolean;
  onUpdateStatus: (id: string, newStatus: CommissionStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (commission: Commission) => void;
}

export const CommissionCard: React.FC<CommissionCardProps> = ({ 
  commission, 
  isAdmin, 
  onUpdateStatus,
  onDelete,
  onEdit
}) => {
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Updated Status Colors for Cute Theme (Pill badges)
  const getStatusColor = (status: CommissionStatus) => {
    switch(status) {
      case CommissionStatus.QUEUE: return 'bg-stone-100 text-stone-600 border-stone-200';
      case CommissionStatus.SKETCH: return 'bg-pink-50 text-pink-500 border-pink-200';
      case CommissionStatus.LINEART: return 'bg-rose-50 text-rose-500 border-rose-200';
      case CommissionStatus.COLOR: return 'bg-purple-50 text-purple-500 border-purple-200';
      case CommissionStatus.RENDER: return 'bg-fuchsia-50 text-fuchsia-500 border-fuchsia-200';
      case CommissionStatus.DONE: return 'bg-[#ffa9c2] text-white border-[#ffa9c2]';
      default: return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  const handleNextStep = () => {
    const currentIndex = STATUS_STEPS.indexOf(commission.status);
    if (currentIndex < STATUS_STEPS.length - 1) {
      onUpdateStatus(commission.id, STATUS_STEPS[currentIndex + 1]);
    }
  };

  const handlePrevStep = () => {
    const currentIndex = STATUS_STEPS.indexOf(commission.status);
    if (currentIndex > 0) {
      onUpdateStatus(commission.id, STATUS_STEPS[currentIndex - 1]);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDeleting) {
          onDelete(commission.id);
      } else {
          setIsDeleting(true);
          // Optional: Auto reset after 3 seconds if not confirmed
          setTimeout(() => setIsDeleting(false), 3000);
      }
  };

  return (
    <div className="bg-white border-2 border-stone-100 rounded-3xl p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group hover:-translate-y-1 flex flex-col md:flex-row gap-6">
      
      {/* Image Section */}
      <div className="flex-shrink-0">
         <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden border-2 border-stone-100 bg-stone-50 relative group/image">
            {commission.thumbnailUrl ? (
                <img 
                  src={commission.thumbnailUrl} 
                  alt={commission.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <ImageIcon size={32} />
                </div>
            )}
            {/* Status Overlay on Image for Mobile mainly, but nice everywhere */}
            <div className="absolute top-2 left-2">
                 <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border shadow-sm ${getStatusColor(commission.status)}`}>
                    {commission.status}
                  </span>
            </div>
         </div>
      </div>

      {/* Content Section */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {/* Client Name with dot */}
                  <p className="text-[#ff5c8d] text-sm font-bold tracking-wide flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c8d]"></span>
                    {commission.clientName}
                  </p>
              </div>
              <h3 className="text-xl font-bold text-stone-700 leading-tight">{commission.title}</h3>
            </div>
            
            {isAdmin && (
              <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => onEdit(commission)}
                    className="p-2.5 rounded-xl bg-stone-50 text-stone-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-105"
                    title="編輯"
                  >
                    <Pencil size={18} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => setShowAdminTools(!showAdminTools)}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${showAdminTools ? 'bg-pink-100 text-pink-500 rotate-12 scale-110' : 'bg-stone-50 text-stone-400 hover:text-pink-500 hover:bg-pink-50 hover:scale-110'}`}
                    title="AI 小幫手"
                  >
                    <Sparkles size={18} />
                  </button>
                  
                  <button 
                    type="button"
                    onClick={handleDeleteClick}
                    className={`p-2.5 rounded-xl transition-all duration-200 flex items-center gap-1 hover:scale-105 ${
                        isDeleting 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 w-auto px-4' 
                        : 'bg-stone-50 text-stone-400 hover:text-red-500 hover:bg-red-50 w-10'
                    }`}
                    title="刪除"
                  >
                    {isDeleting ? (
                        <span className="text-xs font-bold whitespace-nowrap">確定?</span>
                    ) : (
                        <Trash2 size={18} />
                    )}
                  </button>
              </div>
            )}
          </div>

          <p className="text-stone-500 text-sm leading-relaxed mb-4 font-medium line-clamp-2 hover:line-clamp-none transition-all">
            {commission.description}
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-stone-500 font-bold mb-4">
            <span className="flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-md border border-stone-100">
              <Calendar size={12} className="text-stone-400" /> {commission.dateAdded}
            </span>
            <span className="flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-md border border-stone-100">
              {typeof commission.price === 'number' && <DollarSign size={12} className="text-stone-400" />} 
              {commission.price}
            </span>
            <span className="bg-[#ffa9c2]/10 px-2.5 py-1 rounded-md border border-[#ffa9c2]/20 text-[#ff5c8d]">
                {commission.type}
            </span>
          </div>
        </div>

        <div className="mt-auto bg-stone-50/50 rounded-2xl p-4 border border-stone-100">
          <ProgressBar currentStatus={commission.status} />
          
          {isAdmin && (
            <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button"
                  onClick={handlePrevStep}
                  disabled={commission.status === CommissionStatus.QUEUE}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-stone-500 hover:text-stone-700 disabled:opacity-30 hover:bg-stone-100 rounded-full transition-all"
                >
                  <ChevronLeft size={14} /> 上一步
                </button>
                <button 
                  type="button"
                  onClick={handleNextStep}
                  disabled={commission.status === CommissionStatus.DONE}
                  className="flex items-center gap-1.5 px-5 py-1.5 text-xs font-bold bg-[#ffa9c2] hover:bg-[#ff94b3] text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-pink-200 hover:-translate-y-0.5"
                >
                  下一步 <ChevronRight size={14} />
                </button>
            </div>
          )}
        </div>
        
        {isAdmin && showAdminTools && (
           <AdminTools commission={commission} onClose={() => setShowAdminTools(false)} />
        )}
      </div>
    </div>
  );
};