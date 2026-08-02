'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Label } from 'recharts';
import type { PricingRecord, ProductType } from '@/types';
import { PROVIDERS } from '@/config';

interface ChartsViewProps {
  data: PricingRecord[];
  activeProductType: ProductType;
}

export default function ChartsView({ data, activeProductType }: ChartsViewProps) {
  // Bar Chart Data: Minimum price per provider in the current dataset
  const barChartData = useMemo(() => {
    const providerMinPrices: Record<string, number> = {};
    data.forEach(record => {
      const price = parseFloat(record.price_per_unit) || 0;
      if (price > 0) {
        if (!providerMinPrices[record.provider] || price < providerMinPrices[record.provider]) {
          providerMinPrices[record.provider] = price;
        }
      }
    });

    return Object.entries(providerMinPrices)
      .map(([provider, minPrice]) => {
        const pColor = PROVIDERS.find(p => p.id === provider.toLowerCase() || p.name === provider)?.color || '#6366f1';
        return {
          provider,
          minPrice,
          fill: pColor
        };
      })
      .sort((a, b) => a.minPrice - b.minPrice);
  }, [data]);

  // Scatter Plot Data: Memory
  const memoryScatterData = useMemo(() => {
    return data.filter(d => Number(d.price_per_unit) > 0 && Number(d.memory_gb) > 0).map(record => {
      const pColor = PROVIDERS.find(p => p.id === (record.provider || '').toLowerCase() || p.name === record.provider)?.color || '#6366f1';
      return {
        instance: record.instance_type,
        provider: record.provider,
        price: Number(record.price_per_unit),
        memory: Number(record.memory_gb),
        vcpus: Number(record.vcpus),
        fill: pColor
      };
    });
  }, [data]);

  // Scatter Plot Data: vCPU
  const vcpuScatterData = useMemo(() => {
    return data.filter(d => Number(d.price_per_unit) > 0 && Number(d.vcpus) > 0).map(record => {
      const pColor = PROVIDERS.find(p => p.id === (record.provider || '').toLowerCase() || p.name === record.provider)?.color || '#6366f1';
      return {
        instance: record.instance_type,
        provider: record.provider,
        price: Number(record.price_per_unit),
        memory: Number(record.memory_gb),
        vcpus: Number(record.vcpus),
        fill: pColor
      };
    });
  }, [data]);

  const CustomTooltipBar = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] p-3 rounded-lg shadow-lg">
          <p className="font-bold text-sm text-black dark:text-white">{payload[0].payload.provider}</p>
          <p className="text-xs text-[#737373] mt-1">Starting at: <span className="font-bold text-black dark:text-white">${payload[0].value.toFixed(4)}/hr</span></p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipScatter = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] p-3 rounded-lg shadow-lg">
          <p className="font-bold text-sm text-black dark:text-white mb-2">{data.instance}</p>
          <div className="flex flex-col gap-1 text-xs text-[#737373]">
            <p>Provider: <span className="font-bold text-black dark:text-white">{data.provider}</span></p>
            <p>Price: <span className="font-bold text-black dark:text-white">${data.price.toFixed(4)}/hr</span></p>
            <p>Memory: <span className="font-bold text-black dark:text-white">{data.memory} GB</span></p>
            <p>vCPU: <span className="font-bold text-black dark:text-white">{data.vcpus}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#737373] dark:text-[#525252] italic text-sm">
        No data available for charts. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#fafafa] dark:bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        
        {/* Bar Chart Section */}
        <div className="bg-white dark:bg-[#000000] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-black dark:text-white">Lowest Entry Price by Provider</h2>
            <p className="text-xs text-[#737373]">Comparing the cheapest available option from each provider for your current filters.</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#404040" opacity={0.2} />
                <XAxis dataKey="provider" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#737373' }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#737373' }} 
                  tickFormatter={(value) => `$${value}`}
                  dx={-10}
                />
                <RechartsTooltip content={<CustomTooltipBar />} cursor={{ fill: '#f5f5f5', opacity: 0.1 }} />
                <Bar dataKey="minPrice" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter Plot Section: Price vs Memory */}
        {activeProductType !== 'networking' && activeProductType !== 'data-analytics' && memoryScatterData.length > 0 && (
          <div className="bg-white dark:bg-[#000000] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-black dark:text-white">Price vs. Memory (Frontier of Efficiency)</h2>
              <p className="text-xs text-[#737373]">Instances in the bottom right offer the most memory for the lowest price.</p>
            </div>
            <div className="h-[400px] w-full pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 40, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" opacity={0.2} />
                  <XAxis 
                    type="number" 
                    dataKey="memory" 
                    name="Memory" 
                    unit="GB" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#737373' }}
                    dy={10}
                  >
                    <Label value="Memory (GB)" offset={-20} position="insideBottom" fill="#737373" fontSize={12} />
                  </XAxis>
                  <YAxis 
                    type="number" 
                    dataKey="price" 
                    name="Price" 
                    unit="$" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#737373' }}
                    tickFormatter={(value) => `$${value}`}
                    dx={-10}
                  >
                    <Label value="Hourly Price ($)" angle={-90} position="insideLeft" offset={-25} style={{ textAnchor: 'middle' }} fill="#737373" fontSize={12} />
                  </YAxis>
                  <ZAxis type="number" range={[60, 60]} />
                  <RechartsTooltip content={<CustomTooltipScatter />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Instances" data={memoryScatterData} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Scatter Plot Section: Price vs vCPU */}
        {activeProductType !== 'networking' && activeProductType !== 'data-analytics' && vcpuScatterData.length > 0 && (
          <div className="bg-white dark:bg-[#000000] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-black dark:text-white">Price vs. vCPU (Frontier of Efficiency)</h2>
              <p className="text-xs text-[#737373]">Instances in the bottom right offer the most compute power (vCPUs) for the lowest price.</p>
            </div>
            <div className="h-[400px] w-full pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 40, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" opacity={0.2} />
                  <XAxis 
                    type="number" 
                    dataKey="vcpus" 
                    name="vCPU" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#737373' }}
                    dy={10}
                  >
                    <Label value="vCPU Count" offset={-20} position="insideBottom" fill="#737373" fontSize={12} />
                  </XAxis>
                  <YAxis 
                    type="number" 
                    dataKey="price" 
                    name="Price" 
                    unit="$" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#737373' }}
                    tickFormatter={(value) => `$${value}`}
                    dx={-10}
                  >
                    <Label value="Hourly Price ($)" angle={-90} position="insideLeft" offset={-25} style={{ textAnchor: 'middle' }} fill="#737373" fontSize={12} />
                  </YAxis>
                  <ZAxis type="number" range={[60, 60]} />
                  <RechartsTooltip content={<CustomTooltipScatter />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Instances" data={vcpuScatterData} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
