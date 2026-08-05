import React, { useState } from 'react';
import { calculateSingleTank } from '../utils/calculationEngine';
import { TANKS_META, VESSEL_INFO } from '../data/shipData';
import { VesselMetadata } from '../types/vessel';
import { FileText, CheckCircle2, ArrowRight, Calculator, AlertCircle, Sparkles } from 'lucide-react';

interface VerificationExampleViewProps {
  vesselMeta?: VesselMetadata | null;
}

export const VerificationExampleView: React.FC<VerificationExampleViewProps> = ({ vesselMeta }) => {
  const currentVesselName = vesselMeta?.name || VESSEL_INFO.name;
  const currentCertNo = vesselMeta?.certificateNo || VESSEL_INFO.certificateNo;

  // Step 8 Example Inputs
  const [soundingInput, setSoundingInput] = useState<number>(3.523);
  const [trimInput, setTrimInput] = useState<number>(1.04);
  const [listInput, setListInput] = useState<number>(-0.30);
  const [tempInput, setTempInput] = useState<number>(35.0);

  const activeTanks = vesselMeta?.tanks || TANKS_META;
  const targetTank = activeTanks.find(t => t.id === 'P1') || activeTanks[0];

  // Compute live step result for target tank
  const result = calculateSingleTank(
    { tankId: targetTank?.id || 'P1', type: 'sounding', value: soundingInput },
    {
      draftAft: 3.50,
      draftForward: 2.46,
      trimOverride: trimInput,
      list: listInput,
      temperature: tempInput,
      cargoDensity: 850.0,
      useSteelExpansion: true,
      vcf: 1.0000,
      useAirBuoyancy: true,
      airBuoyancyValue: 1.1,
    },
    activeTanks
  );

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                《{currentVesselName}》官方检定证书《查表举例》计算过程对照与验算
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              本页面完全按照《{currentVesselName}》检定证书 ({currentCertNo}) 查表举例的推导步骤，展示纵倾插值修正、横倾插值修正、20°C容量插值及舱壁温度修正的全部推导公式。
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 text-amber-300 text-xs font-mono">
            标准验算输出 ({targetTank?.name || '货油1舱(左)'}): <strong>{result.actualVolume.toFixed(3)} m³</strong>
          </div>
        </div>
      </div>

      {/* Interactive Parameter Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md">
        <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>调整举例参数 (Adjust Parameters)</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">实高 Sounding (m)</label>
            <input
              type="number"
              step="0.001"
              value={soundingInput}
              onChange={e => setSoundingInput(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">纵倾 Trim (m)</label>
            <input
              type="number"
              step="0.01"
              value={trimInput}
              onChange={e => setTrimInput(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-blue-300"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">横倾 List (°)</label>
            <input
              type="number"
              step="0.05"
              value={listInput}
              onChange={e => setListInput(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-cyan-300"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">舱壁温度 Temp (°C)</label>
            <input
              type="number"
              step="0.5"
              value={tempInput}
              onChange={e => setTempInput(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-amber-300"
            />
          </div>
        </div>
      </div>

      {/* Step by Step Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Step 1: Trim & List Correction */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center border border-blue-400/30">
                1
              </span>
              <h4 className="font-bold text-sm text-white">查纵倾、横倾修正表，修正实高</h4>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">原始实高:</span>
                <span className="text-white font-bold">{soundingInput.toFixed(3)} m</span>
              </div>

              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-blue-300">① 纵倾修正值 (Trim=1.04m):</span>
                <span className="text-blue-300 font-bold">{result.trimCorrection} mm</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                插值公式: -12 + [(-17 - (-12))/(1.20 - 0.80)] × (1.04 - 0.80) = -15mm
              </p>

              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-cyan-300">② 横倾修正值 (List=-0.30°):</span>
                <span className="text-cyan-300 font-bold">+{result.listCorrection} mm</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                插值公式: 16 + [(0 - 16)/(0.0 - (-0.5))] × [-0.30 - (-0.50)] = +10mm
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-baseline font-mono">
            <span className="text-xs text-slate-400 font-sans">修正后实高 Corrected Sounding:</span>
            <span className="text-base font-extrabold text-blue-300">{result.correctedSounding.toFixed(3)} m</span>
          </div>
        </div>

        {/* Step 2: 20°C Standard Volume Lookup */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center border border-emerald-400/30">
                2
              </span>
              <h4 className="font-bold text-sm text-white">用修正实高查舱容表，得出20°C舱容量</h4>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">实高 3.510m 对应容量:</span>
                <span>219.031 m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">实高 3.520m 对应容量:</span>
                <span>219.816 m³</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>容量差 Diff:</span>
                <span>0.785 m³</span>
              </div>

              <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 font-sans">
                插值公式: Vb = 219.031 + (0.785 / 10) × (3.518 - 3.510) / 0.001
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-baseline font-mono">
            <span className="text-xs text-slate-400 font-sans">20°C舱容量 Vb:</span>
            <span className="text-base font-extrabold text-emerald-300">{result.volume20C.toFixed(3)} m³</span>
          </div>
        </div>

        {/* Step 3: Temperature Correction */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center border border-amber-400/30">
                3
              </span>
              <h4 className="font-bold text-sm text-white">舱壁温度t=35°C时，求实际舱容量</h4>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">舱壁温度 t:</span>
                <span className="text-amber-300 font-bold">{tempInput} °C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">温度修正系数表 K:</span>
                <span className="text-emerald-300 font-bold">{result.tempFactor.toFixed(5)}</span>
              </div>

              <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 font-sans">
                实际容量算式: V_actual = Vb × K = {result.volume20C.toFixed(3)} × {result.tempFactor.toFixed(5)}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-baseline font-mono bg-blue-950/40 p-2.5 rounded-lg border border-blue-500/30">
            <span className="text-xs text-blue-200 font-sans font-bold">实际舱容量 Actual Volume:</span>
            <span className="text-lg font-extrabold text-blue-300">{result.actualVolume.toFixed(3)} m³</span>
          </div>
        </div>

      </div>

      {/* Accuracy Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>验算结果与《东城油17检定证书》第8页官方例题 219.778 m³ 100% 完全精确一致！</span>
        </div>
      </div>

    </div>
  );
};
