import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface SizeInputProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: number;
}

export const SizeInput: React.FC<SizeInputProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder = '4.5cqw',
  step = 0.5
}) => {
  // Parse value on every render
  const parseValue = (val: string | undefined) => {
    if (!val) {
      // Try to parse placeholder to get a starting unit and number
      const match = placeholder.match(/^([\d.]+)([a-z%]+)$/);
      if (match) {
        return { num: parseFloat(match[1]), unit: match[2], isPlaceholder: true };
      }
      return { num: 0, unit: 'cqw', isPlaceholder: true };
    }
    const match = val.match(/^([\d.]+)([a-z%]+)$/);
    if (match) {
      return { num: parseFloat(match[1]), unit: match[2], isPlaceholder: false };
    }
    // Fallback
    const num = parseFloat(val);
    return { num: isNaN(num) ? 0 : num, unit: 'cqw', isPlaceholder: false };
  };

  const { num, unit, isPlaceholder } = parseValue(value);

  const update = (newNum: number, newUnit: string) => {
    // Round to 1 decimal
    const rounded = Math.round(newNum * 10) / 10;
    onChange(`${rounded}${newUnit}`);
  };

  const handleIncrement = () => update(num + step, unit);
  const handleDecrement = () => update(Math.max(0, num - step), unit);
  
  const toggleUnit = () => {
    const newUnit = unit === 'cqw' ? 'px' : 'cqw';
    // Convert value roughly
    // 1cqw ~ 16px (assuming 1600px width base for simplicity)
    let newNum = num;
    if (unit === 'cqw' && newUnit === 'px') newNum = num * 16; 
    if (unit === 'px' && newUnit === 'cqw') newNum = num / 16;
    
    update(newNum, newUnit);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black text-slate-500 uppercase">{label}</label>
        <button 
          onClick={toggleUnit}
          className="text-[8px] font-bold text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded hover:text-cyan-400 hover:bg-slate-800 transition-all uppercase tracking-wider"
          title="Alternar unidade (px/cqw)"
        >
          {unit}
        </button>
      </div>
      
      <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg p-1 group focus-within:border-cyan-500/50 transition-colors">
        <button 
          onClick={handleDecrement}
          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <Minus size={12} />
        </button>
        
        <input 
          type="text" 
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-center text-[10px] text-slate-200 outline-none font-mono min-w-0 placeholder:text-slate-700"
          placeholder={placeholder}
        />
        
        <button 
          onClick={handleIncrement}
          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
};
