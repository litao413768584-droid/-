import React from 'react';
import { Ship, Calculator, ShieldCheck, FileText, Anchor, UploadCloud } from 'lucide-react';
import { VESSEL_INFO } from '../data/shipData';
import { VesselMetadata } from '../types/vessel';

interface HeaderProps {
  activeTab: 'calculator' | 'pdf' | 'example' | 'certificate';
  setActiveTab: (tab: 'calculator' | 'pdf' | 'example' | 'certificate') => void;
  vesselMeta?: VesselMetadata | null;
  currentVesselName?: string;
  currentCertNo?: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, vesselMeta, currentVesselName, currentCertNo }) => {
  const name = vesselMeta?.name || currentVesselName || VESSEL_INFO.name;
  const englishName = vesselMeta?.englishName || VESSEL_INFO.englishName;
  const certNo = vesselMeta?.certificateNo || currentCertNo || VESSEL_INFO.certificateNo;
  const authority = vesselMeta?.issuingAuthority || VESSEL_INFO.institution;
  const validPeriod = vesselMeta?.validPeriod || VESSEL_INFO.expiryDate;
  const totalCap = vesselMeta
    ? vesselMeta.tanks.reduce((sum, t) => sum + (t.capacity100 || 0), 0).toFixed(3)
    : VESSEL_INFO.totalCapacity100;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* Logo & Vessel Info */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white flex items-center justify-center">
              <Ship className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  {name}
                  <span className="text-xs bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30">
                    {englishName}
                  </span>
                </h1>
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  检定证书 ({certNo})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>总舱容: <strong className="text-slate-200">{totalCap} m³</strong></span>
                <span>•</span>
                <span>计量站: {authority}</span>
                <span>•</span>
                <span>有效期至: {validPeriod}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions / Status */}
          <div className="flex items-center gap-2 self-start md:self-auto text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <Anchor className="w-4 h-4 text-blue-400" />
            <span>钢膨修正 + VCF 支持</span>
            <span className="text-slate-600">|</span>
            <span>双线性双向插值</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-2 border-t border-slate-800 text-sm font-medium">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>舱容快速计算器</span>
          </button>

          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'pdf'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-purple-400" />
            <span>舱容表 PDF / 图纸全自动生成</span>
            <span className="ml-1 px-1.5 py-0.2 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
              任意舱数
            </span>
          </button>

          <button
            onClick={() => setActiveTab('example')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'example'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>证书Page 8验算举例</span>
          </button>

          <button
            onClick={() => setActiveTab('certificate')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'certificate'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>检定证书原件数字档案</span>
          </button>
        </div>
      </div>
    </header>
  );
};

