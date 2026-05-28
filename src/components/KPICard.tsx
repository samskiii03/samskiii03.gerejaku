/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface KPICardProps {
  id?: string;
  title: string;
  value: string | number;
  description?: string;
  change?: string; // negative or positive change indicator e.g. "+5.2% bulan ini"
  isPositive?: boolean;
  icon: React.ReactNode;
  iconBgColor?: string; // Tailwind class e.g. 'bg-blue-100 text-blue-800'
}

export default function KPICard({
  id,
  title,
  value,
  description,
  change,
  isPositive = true,
  icon,
  iconBgColor = 'bg-slate-100 text-slate-700'
}: KPICardProps) {
  return (
    <div 
      id={id || `kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 tracking-tight">{title}</span>
        <div className={`p-2.5 rounded-lg ${iconBgColor} transition-all duration-300`}>
          {icon}
        </div>
      </div>
      
      <div className="mt-4">
        <div className="text-2xl font-bold font-sans tracking-tight text-slate-900">{value}</div>
        
        {(change || description) && (
          <div className="flex items-center mt-1.5 space-x-1.5 text-xs">
            {change && (
              <span className={`font-semibold shrink-0 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {change}
              </span>
            )}
            {description && (
              <span className="text-slate-400 truncate">{description}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
