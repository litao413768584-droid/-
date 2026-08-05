import React, { useState } from 'react';
import { TANKS_META, VESSEL_INFO } from '../data/shipData';
import { VesselMetadata } from '../types/vessel';
import { ShieldCheck, Anchor, Info, FileSpreadsheet, Layers, Search } from 'lucide-react';

interface CertificateViewerProps {
  vesselMeta?: VesselMetadata | null;
}

export const CertificateViewer: React.FC<CertificateViewerProps> = ({ vesselMeta }) => {
  const activeTanks = vesselMeta?.tanks || TANKS_META;
  const currentVesselName = vesselMeta?.name || VESSEL_INFO.name;
  const currentCertNo = vesselMeta?.certificateNo || VESSEL_INFO.certificateNo;
  const currentAuthority = vesselMeta?.issuingAuthority || VESSEL_INFO.institution;

  const [selectedTank, setSelectedTank] = useState<string>(activeTanks[0]?.id || 'P1');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const currentTankMeta = activeTanks.find(t => t.id === selectedTank) || activeTanks[0];

  return (
    <div className="space-y-6 pb-12 text-white">
      
      {/* Certificate Cover & Metadata */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              国家法定计量检定证书数字档案 (CRZH)
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {currentVesselName} 舱容积检定证书档案
            </h2>
            <p className="text-xs text-slate-400">
              证书编号: <strong className="text-slate-200 font-mono">{currentCertNo}</strong> | 计量机构: <strong className="text-slate-200">{currentAuthority}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">舱室总数</span>
              <span className="font-mono font-bold text-slate-200">{activeTanks.length} 个计量舱</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">检定规范</span>
              <span className="font-mono font-bold text-slate-200">JJG702-2005</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">证书状态</span>
              <span className="font-mono font-bold text-emerald-400">在用 / 现行有效</span>
            </div>
          </div>
        </div>

        {/* Vessel Specifications Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-xs">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2">
              <Anchor className="w-4 h-4 text-blue-400" />
              <span>计量机构与规范依据</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              <strong>计量机构:</strong> {VESSEL_INFO.institution}<br />
              <strong>检定规程:</strong> 《JJG702-2005 船舶液货计量舱容量》<br />
              <strong>不确定度:</strong> 容量表中划线部分 Urel = 0.40% (k=2)，其他部分 Urel = 0.25% (k=2)
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>全舱容量汇总 (100% / 98% / 95%)</span>
            </h4>
            <div className="space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">100% 满舱容量:</span>
                <span className="font-bold text-white">{VESSEL_INFO.totalCapacity100} m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">98% 安全容量:</span>
                <span className="font-bold text-blue-300">{VESSEL_INFO.totalCapacity98} m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">95% 限制容量:</span>
                <span className="font-bold text-amber-300">{VESSEL_INFO.totalCapacity95} m³</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>使用说明 (Specifications)</span>
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              1. 本舱容表所示容量为标准温度 20°C 时的容量。<br />
              2. 实高查表时，实高应加上纵倾、横倾修正值；空高查表时，空高应减去纵倾、横倾修正值。<br />
              3. 舱容表所示容量不包括管线的容量。
            </p>
          </div>
        </div>
      </div>

      {/* Tank Calibration Details Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">
            12 个计量舱检定数据明细表
          </h3>

          {/* Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">选择舱室:</span>
            <select
              value={selectedTank}
              onChange={e => setSelectedTank(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              {TANKS_META.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} (H={t.refHeight}m)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Tank Meta Detail Card */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] font-sans block">舱名 (Tank Name)</span>
            <span className="font-bold text-blue-300 text-sm">{currentTankMeta.name}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] font-sans block">基准高度 H</span>
            <span className="font-bold text-white text-sm">{currentTankMeta.refHeight} m</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] font-sans block">空高零基准点 h</span>
            <span className="font-bold text-cyan-300 text-sm">{currentTankMeta.zeroUllageRef} mm</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] font-sans block">100% 满舱容量</span>
            <span className="font-bold text-emerald-300 text-sm">{currentTankMeta.capacity100} m³</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] font-sans block">98% 安全容量</span>
            <span className="font-bold text-amber-300 text-sm">{currentTankMeta.capacity98} m³</span>
          </div>
        </div>

        {/* Pipe Capacity Info */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs mb-6">
          <h4 className="font-bold text-white mb-2 flex items-center gap-2">
            <span>管线容量明细 Pipeline Capacity (m³)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-300 font-mono">
            <div>1# 管线 (No.1): <strong>{currentTankMeta.pipeLineNo1 || '---'} m³</strong></div>
            <div>2# 管线 (No.2): <strong>{currentTankMeta.pipeLineNo2 || '---'} m³</strong></div>
            <div>甲板上部 On Deck: <strong>No.1 (3.479m³) / No.2 (3.694m³)</strong></div>
            <div>泵舱 In Pump Room: <strong>No.1 (0.677m³) / No.2 (0.550m³)</strong></div>
          </div>
        </div>

      </div>

    </div>
  );
};
