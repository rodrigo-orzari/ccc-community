'use client';

import React from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  value: { min: number; max: number };
  onChange: (val: { min: number; max: number }) => void;
  step?: number;
  unit?: string;
}

export function RangeSlider({ min, max, value, onChange, step = 1, unit = '' }: RangeSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[10px] font-bold text-[#737373]">
        <span>
          Min <span className="ml-1 font-mono font-medium text-black dark:text-white">{unit}{value.min}{!unit && ' '}</span>
        </span>
        <span>
          Max <span className="ml-1 font-mono font-medium text-black dark:text-white">{unit}{value.max}{!unit && ' '}</span>
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        {/* Track */}
        <div className="absolute w-full h-1 bg-[#262626] rounded-full" />

        {/* Active Range Highlight */}
        <div
          className="absolute h-1 bg-white rounded-full pointer-events-none"
          style={{
            left: `${((value.min - min) / (max - min)) * 100}%`,
            right: `${100 - ((value.max - min) / (max - min)) * 100}%`
          }}
        />

        {/* Min Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value.min}
          onChange={(e) => {
            const val = Math.min(Number(e.target.value), value.max - step);
            onChange({ ...value, min: val });
          }}
          className="absolute w-full appearance-none bg-transparent pointer-events-none z-20 slider-input-min"
        />

        {/* Max Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value.max}
          onChange={(e) => {
            const val = Math.max(Number(e.target.value), value.min + step);
            onChange({ ...value, max: val });
          }}
          className="absolute w-full appearance-none bg-transparent pointer-events-none z-20 slider-input-max"
        />
      </div>
    </div>
  );
}
