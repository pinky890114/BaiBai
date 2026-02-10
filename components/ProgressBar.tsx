import React from 'react';
import { CommissionStatus } from '../types';
import { STATUS_STEPS } from '../constants';
import { Check } from 'lucide-react';

interface ProgressBarProps {
  currentStatus: CommissionStatus;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStatus }) => {
  const currentIndex = STATUS_STEPS.indexOf(currentStatus);
  const totalSteps = STATUS_STEPS.length;
  // Calculate width for the connecting line
  // We want the line to stop at the center of the current step circle
  const progressPercentage = (currentIndex / (totalSteps - 1)) * 100;

  return (
    <div className="w-full px-2 py-4">
      <div className="relative">
        
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-0 w-full h-1.5 bg-stone-100 rounded-full -translate-y-1/2" />
        
        {/* Active Progress Line */}
        <div 
            className="absolute top-1/2 left-0 h-1.5 bg-[#ffa9c2] rounded-full -translate-y-1/2 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
        />

        {/* Steps */}
        <div className="relative flex justify-between w-full">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={step} className="flex flex-col items-center group relative">
                
                {/* Circle Container */}
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 z-10
                    ${isCompleted ? 'bg-[#ffa9c2]' : 'bg-white border-2 border-stone-200'}
                `}>
                    {isCompleted ? (
                        <Check size={16} strokeWidth={4} />
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-stone-200" />
                    )}

                    {/* Halo Effect for Current Step */}
                    {isCurrent && (
                        <div className="absolute inset-0 bg-[#ffa9c2]/30 rounded-full animate-ping" />
                    )}
                    {isCurrent && (
                         <div className="absolute -inset-1.5 bg-[#ffa9c2]/20 rounded-full" />
                    )}
                </div>

                {/* Label */}
                <span className={`
                    absolute top-10 text-[10px] sm:text-xs font-bold whitespace-nowrap transition-colors duration-300
                    ${isCurrent ? 'text-[#ff5c8d]' : isCompleted ? 'text-stone-500' : 'text-stone-300'}
                `}>
                    {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Spacer for labels */}
      <div className="h-6"></div>
    </div>
  );
};