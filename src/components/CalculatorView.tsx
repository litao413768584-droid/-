import React, { useState, useMemo } from 'react';
import {
  ShipGlobalInput,
  TankInput,
  MeasurementType,
  TankMeta
} from '../types/vessel';
import { TANKS_META, VESSEL_INFO } from '../data/shipData';
import { calculateWholeShip } from '../utils/calculationEngine';
import { exportCalculationResultsExcel } from '../utils/excelHandler';
import { TankVisualizer } from './TankVisualizer';
import {
  Calculator,
  Download,
  RotateCcw,
  Sparkles,
  Thermometer,
  Compass,
  Scale,
  CheckCircle2,
  HelpCircle,
  FileText,
  ShieldCheck,
  Percent
} from 'lucide-react';

interface CalculatorViewProps {
  customTanks?: TankMeta[];
  customVesselName?: string;
  customCertNo?: string;
  initialGlobalInput?: ShipGlobalInput | null;
  initialTankInputs?: TankInput[] | null;
  onNavigateToPdfUpload?: () => void;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  customTanks,
  customVesselName,
  customCertNo,
  initialGlobalInput,
  initialTankInputs,
  onNavigateToPdfUpload,
}) => {
  const activeTanks = customTanks || TANKS_META;
  const currentVesselName = customVesselName || VESSEL_INFO.name;
  const currentCertNo = customCertNo || VESSEL_INFO.certificateNo;

  // Global Ship Condition
  const [globalInput, setGlobalInput] = useState<ShipGlobalInput>(() => {
    if (initialGlobalInput) return initialGlobalInput;
    return {
      draftAft: 3.50,
      draftForward: 2.46,
      trimOverride: 1.04,
      list: -0.30,
      temperature: 35.0,
      useSteelExpansion: true, // 默认开启钢膨修正
      cargoDensity: 850.0, // 货油密度，单位 kg/m³
      vcf: 1.0000, // 默认 VCF 体积修正系数 1.0000
      useAirBuoyancy: true, // 默认进行空气浮力修正
      airBuoyancyValue: 1.1, // 空气浮力扣减 1.1 kg/m³
    };
  });

  // Individual Tank Inputs
  const [tankInputs, setTankInputs] = useState<TankInput[]>(() => {
    if (initialTankInputs && initialTankInputs.length > 0) return initialTankInputs;
    return activeTanks.map(tank => ({
      tankId: tank.id,
      type: 'sounding' as MeasurementType,
      value: tank.id === 'P1' ? 3.523 : 3.500,
    }));
  });

  const [selectedTankId, setSelectedTankId] = useState<string>(activeTanks[0]?.id || 'P1');

  // Total 100% capacity for current vessel
  const totalCapacity100 = useMemo(() => {
    return activeTanks.reduce((acc, t) => acc + (t.capacity100 || 0), 0);
  }, [activeTanks]);

  // Compute live whole ship calculation
  const summary = useMemo(() => {
    return calculateWholeShip(globalInput, tankInputs, activeTanks, currentVesselName, currentCertNo);
  }, [globalInput, tankInputs, activeTanks, currentVesselName, currentCertNo]);

  // Derived Effective Trim
  const effectiveTrim = useMemo(() => {
    if (globalInput.trimOverride !== undefined && globalInput.trimOverride !== null) {
      return globalInput.trimOverride;
    }
    return globalInput.draftAft - globalInput.draftForward;
  }, [globalInput]);

  // Handler for tank value update
  const handleTankValueChange = (tankId: string, value: number) => {
    setTankInputs(prev =>
      prev.map(t => (t.tankId === tankId ? { ...t, value } : t))
    );
  };

  // Handler for tank measurement type toggle
  const handleTankTypeToggle = (tankId: string) => {
    setTankInputs(prev =>
      prev.map(t => {
        if (t.tankId !== tankId) return t;
        const meta = activeTanks.find(m => m.id === tankId);
        const refH = meta ? meta.refHeight : 8.960;
        const newType: MeasurementType = t.type === 'sounding' ? 'ullage' : 'sounding';
        const newDVal = parseFloat(Math.max(0, refH - t.value).toFixed(3));
        return {
          ...t,
          type: newType,
          value: newDVal,
        };
      })
    );
  };

  // Preset Load Scenarios
  const applyPreset = (preset: 'page8' | 'full' | 'ballast' | 'clear') => {
    if (preset === 'page8') {
      setGlobalInput({
        draftAft: 3.50,
        draftForward: 2.46,
        trimOverride: 1.04,
        list: -0.30,
        temperature: 35.0,
        useSteelExpansion: true,
        cargoDensity: 850.0,
        vcf: 1.0000,
        useAirBuoyancy: true,
        airBuoyancyValue: 1.1,
      });
      setTankInputs(prev =>
        prev.map(t => ({
          ...t,
          type: 'sounding',
          value: t.tankId === 'P1' ? 3.523 : 3.500,
        }))
      );
    } else if (preset === 'full') {
      setGlobalInput({
        draftAft: 4.80,
        draftForward: 4.50,
        trimOverride: 0.30,
        list: 0.0,
        temperature: 20.0,
        useSteelExpansion: true,
        cargoDensity: 850.0,
        vcf: 1.0000,
        useAirBuoyancy: true,
        airBuoyancyValue: 1.1,
      });
      setTankInputs(prev =>
        prev.map(t => {
          const meta = activeTanks.find(m => m.id === t.tankId);
          return {
            ...t,
            type: 'sounding',
            value: meta ? parseFloat((meta.refHeight * 0.95).toFixed(3)) : 7.50,
          };
        })
      );
    } else if (preset === 'ballast') {
      setGlobalInput({
        draftAft: 2.80,
        draftForward: 1.50,
        trimOverride: 1.30,
        list: 0.5,
        temperature: 25.0,
        useSteelExpansion: true,
        cargoDensity: 850.0,
        vcf: 1.0000,
        useAirBuoyancy: true,
        airBuoyancyValue: 1.1,
      });
      setTankInputs(prev =>
        prev.map(t => ({
          ...t,
          type: 'sounding',
          value: 0.500,
        }))
      );
    } else if (preset === 'clear') {
      setTankInputs(prev =>
        prev.map(t => ({
          ...t,
          value: 0.000,
        }))
      );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Current Vessel Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">{currentVesselName}</h1>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                {activeTanks.length}个舱室
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              证书编号: <strong className="text-slate-200 font-mono">{currentCertNo}</strong> | 计算引擎: 双线性插值 + 钢膨修正 + VCF
            </p>
          </div>
        </div>

        {onNavigateToPdfUpload && (
          <button
            onClick={onNavigateToPdfUpload}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-md"
          >
            <FileText className="w-4 h-4" />
            <span>上传其他船舶舱容表 PDF / 图片</span>
          </button>
        )}
      </div>

      {/* Top Banner / Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Cargo Volume Card */}
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-700/50 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Calculator className="w-32 h-32 text-blue-400" />
          </div>
          <div className="text-xs font-medium text-blue-300 flex items-center justify-between">
            <span>总货物实际容积 (Actual Volume)</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
              {activeTanks.length}舱合计
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {summary.totalVolume.toLocaleString('zh-CN', { minimumFractionDigits: 3 })}
            </span>
            <span className="text-sm font-semibold text-blue-300">m³</span>
          </div>
          <p className="text-xs text-slate-300 mt-2 flex items-center justify-between">
            <span>20°C容积: <strong className="font-mono text-white">{summary.tankResults.reduce((a, b) => a + b.volume20C, 0).toFixed(3)} m³</strong></span>
            <span>VCF: <strong className="font-mono text-cyan-200">{globalInput.vcf}</strong></span>
          </p>
        </div>

        {/* Total Cargo Weight Card */}
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 border border-emerald-700/50 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="text-xs font-medium text-emerald-300 flex items-center justify-between">
            <span>总货物重量 (Total Weight)</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-400/30 font-mono">
              真空: {summary.density} kg/m³
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {summary.totalWeight.toLocaleString('zh-CN', { minimumFractionDigits: 3 })}
            </span>
            <span className="text-sm font-semibold text-emerald-300">吨 (t)</span>
          </div>
          <p className="text-xs text-slate-300 mt-2 flex items-center justify-between">
            <span>
              空气视密度: <strong className="font-mono text-emerald-200">{summary.densityInAir} kg/m³</strong>
              {summary.useAirBuoyancy && <span className="text-[10px] text-amber-300 ml-1">(-{summary.airBuoyancyValue})</span>}
            </span>
            <span>充满率: <strong className="font-mono text-emerald-200">
              {totalCapacity100 > 0 ? ((summary.totalVolume / totalCapacity100) * 100).toFixed(1) : '0.0'}%
            </strong></span>
          </p>
        </div>

        {/* Trim & List Condition */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-blue-400" />
            <span>姿态修正 (Trim &amp; List)</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">纵倾 Trim:</span>
              <span className="font-mono font-bold text-base text-blue-300">
                {effectiveTrim >= 0 ? '+' : ''}{effectiveTrim.toFixed(2)} m
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">横倾 List:</span>
              <span className="font-mono font-bold text-base text-cyan-300">
                {globalInput.list >= 0 ? '+' : ''}{globalInput.list.toFixed(2)}° ({globalInput.list < 0 ? '左倾' : globalInput.list > 0 ? '右倾' : '正浮'})
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 truncate">
            艉吃水 {globalInput.draftAft}m - 艏吃水 {globalInput.draftForward}m
          </div>
        </div>

        {/* Temperature & Steel & VCF Condition */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span>温度与钢膨 (Temp &amp; Expansion)</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${globalInput.useSteelExpansion ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
              {globalInput.useSteelExpansion ? '钢膨:开启' : '钢膨:关闭'}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">舱壁温度 Temp:</span>
              <span className="font-mono font-bold text-base text-amber-300">
                {globalInput.temperature} °C
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">钢膨修正 K:</span>
              <span className="font-mono font-bold text-base text-emerald-300">
                {globalInput.useSteelExpansion ? (1 + (globalInput.temperature - 20) * 0.000036).toFixed(5) : '1.00000'}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 flex justify-between">
            <span>密度: {globalInput.cargoDensity} t/m³</span>
            <span>VCF: {globalInput.vcf}</span>
          </div>
        </div>

      </div>

      {/* Global Condition Input Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-400" />
              <span>航次测量条件与航姿参数输入</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              请输入吃水纵倾、横倾角、舱壁温度、钢膨开关、货油密度与 VCF 体积修正系数。
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">预设场景:</span>
            <button
              onClick={() => applyPreset('page8')}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Page 8 验算标准值
            </button>
            <button
              onClick={() => applyPreset('full')}
              className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors"
            >
              满载工况 (95%)
            </button>
            <button
              onClick={() => applyPreset('ballast')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              轻载/压载
            </button>
            <button
              onClick={() => applyPreset('clear')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              清空全舱
            </button>
          </div>
        </div>

        {/* Global Inputs Form Grid - Optimized sizing and responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-4">
          
          {/* Draft Aft */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>艉吃水 (Draft Aft)</span>
              <span className="text-[10px] text-slate-500 font-mono">m</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={globalInput.draftAft}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setGlobalInput(prev => ({
                  ...prev,
                  draftAft: val,
                  trimOverride: parseFloat((val - prev.draftForward).toFixed(2)),
                }));
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-blue-500 shadow-inner"
            />
          </div>

          {/* Draft Forward */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>艏吃水 (Draft Fwd)</span>
              <span className="text-[10px] text-slate-500 font-mono">m</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={globalInput.draftForward}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setGlobalInput(prev => ({
                  ...prev,
                  draftForward: val,
                  trimOverride: parseFloat((prev.draftAft - val).toFixed(2)),
                }));
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-blue-500 shadow-inner"
            />
          </div>

          {/* Effective Trim */}
          <div className="bg-blue-950/20 p-2.5 rounded-lg border border-blue-500/30">
            <label className="block text-[11px] font-semibold text-blue-300 mb-1 flex items-center justify-between">
              <span>纵倾 Trim</span>
              <span className="text-[10px] text-blue-400 font-mono">m</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={effectiveTrim}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setGlobalInput(prev => ({ ...prev, trimOverride: val }));
              }}
              className="w-full bg-blue-950/60 border border-blue-500/60 rounded-lg px-3 py-1.5 text-sm text-blue-200 font-mono font-bold focus:outline-none focus:border-blue-400 shadow-inner"
            />
          </div>

          {/* List Angle */}
          <div className="bg-cyan-950/20 p-2.5 rounded-lg border border-cyan-500/30">
            <label className="block text-[11px] font-semibold text-cyan-300 mb-1 flex items-center justify-between">
              <span>横倾 List</span>
              <span className="text-[10px] text-cyan-400 font-mono">°</span>
            </label>
            <input
              type="number"
              step="0.05"
              value={globalInput.list}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setGlobalInput(prev => ({ ...prev, list: val }));
              }}
              className="w-full bg-cyan-950/60 border border-cyan-500/60 rounded-lg px-3 py-1.5 text-sm text-cyan-200 font-mono font-bold focus:outline-none focus:border-cyan-400 shadow-inner"
            />
          </div>

          {/* Temperature */}
          <div className="bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/30">
            <label className="block text-[11px] font-semibold text-amber-300 mb-1 flex items-center justify-between">
              <span>舱壁温度 Temp</span>
              <span className="text-[10px] text-amber-400 font-mono">°C</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={globalInput.temperature}
              onChange={e => {
                const val = parseFloat(e.target.value) || 20.0;
                setGlobalInput(prev => ({ ...prev, temperature: val }));
              }}
              className="w-full bg-amber-950/60 border border-amber-500/60 rounded-lg px-3 py-1.5 text-sm text-amber-200 font-mono font-bold focus:outline-none focus:border-amber-400 shadow-inner"
            />
          </div>

          {/* Steel Expansion Checkbox */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>钢膨热胀冷缩</span>
              <span className="text-[10px] text-slate-500 cursor-help" title="根据舱壁温度进行舱体钢材热胀冷缩修正 (K=1+(t-20)*0.000036)">
                [?]
              </span>
            </label>
            <label className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-slate-500 transition-colors">
              <span className="text-xs font-semibold text-emerald-300">
                {globalInput.useSteelExpansion ? '已启用修正' : '未启用修正'}
              </span>
              <input
                type="checkbox"
                checked={globalInput.useSteelExpansion}
                onChange={e => setGlobalInput(prev => ({ ...prev, useSteelExpansion: e.target.checked }))}
                className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {/* Cargo Density (kg/m³) */}
          <div className="bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/30">
            <label className="block text-[11px] font-semibold text-emerald-300 mb-1 flex items-center justify-between">
              <span>货油密度 (真空)</span>
              <span className="text-[10px] text-emerald-400 font-mono">kg/m³</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={globalInput.cargoDensity}
              onChange={e => {
                const val = parseFloat(e.target.value) || 850.0;
                setGlobalInput(prev => ({ ...prev, cargoDensity: val }));
              }}
              className="w-full bg-emerald-950/60 border border-emerald-500/60 rounded-lg px-3 py-1.5 text-sm text-emerald-200 font-mono font-bold focus:outline-none focus:border-emerald-400 shadow-inner"
              placeholder="850.0"
            />
          </div>

          {/* VCF Input */}
          <div className="bg-purple-950/20 p-2.5 rounded-lg border border-purple-500/30">
            <label className="block text-[11px] font-semibold text-purple-300 mb-1 flex items-center justify-between">
              <span>VCF (体积修正)</span>
              <Percent className="w-3 h-3 text-purple-400" />
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.5"
              max="1.5"
              value={globalInput.vcf}
              onChange={e => {
                const val = parseFloat(e.target.value) || 1.0000;
                setGlobalInput(prev => ({ ...prev, vcf: val }));
              }}
              className="w-full bg-purple-950/60 border border-purple-500/60 rounded-lg px-3 py-1.5 text-sm text-purple-200 font-mono font-bold focus:outline-none focus:border-purple-400 shadow-inner"
              placeholder="1.0000"
            />
          </div>

          {/* 空气浮力修正 */}
          <div className="bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/30 col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-semibold text-amber-300 mb-1 flex items-center justify-between">
              <span>空气浮力扣减</span>
              <span className="text-[10px] text-amber-400 font-mono">kg/m³</span>
            </label>
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={globalInput.useAirBuoyancy ?? true}
                  onChange={e => setGlobalInput(prev => ({ ...prev, useAirBuoyancy: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-amber-500 bg-slate-950 w-3.5 h-3.5"
                />
                <span className="text-[11px] text-amber-200 font-medium">
                  {globalInput.useAirBuoyancy ? '扣减' : '不扣'}
                </span>
              </label>
              <input
                type="number"
                step="0.1"
                disabled={!globalInput.useAirBuoyancy}
                value={globalInput.airBuoyancyValue ?? 1.1}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setGlobalInput(prev => ({ ...prev, airBuoyancyValue: val }));
                }}
                className="w-full bg-amber-950/60 border border-amber-500/60 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono font-bold focus:outline-none disabled:opacity-40 shadow-inner"
                placeholder="1.1"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Tank Visualizer Diagram */}
      <TankVisualizer
        tankResults={summary.tankResults}
        trim={effectiveTrim}
        list={globalInput.list}
        selectedTankId={selectedTankId}
        onSelectTank={setSelectedTankId}
      />

      {/* Detailed Full Calculation Results Table with Direct Measurement Entry */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>全舱液位测量录入与计算结果汇总明细表 ({activeTanks.length}个舱)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              可直接在下表【类型】及【测量值】列录入各舱实高/空高数据 (m)，系统自动计算对应容积与重量。
            </p>
          </div>

          {/* Export Action Button in Summary Section */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCalculationResultsExcel(summary)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-emerald-900/40 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>导出计算结果 Excel 报表</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans min-w-[1100px]">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-[120px] min-w-[110px]">舱名</th>
                <th className="py-3 px-2 w-[85px] text-center">类型</th>
                <th className="py-3 px-2 w-[120px] text-right">测量值 (m)</th>
                <th className="py-3 px-2 w-[95px] text-right">纵倾修正 (mm)</th>
                <th className="py-3 px-2 w-[95px] text-right">横倾修正 (mm)</th>
                <th className="py-3 px-2 w-[100px] text-right">修正实高 (m)</th>
                <th className="py-3 px-2 w-[105px] text-right">20°C容量 (m³)</th>
                <th className="py-3 px-2 w-[95px] text-right">钢膨系数 K</th>
                <th className="py-3 px-2 w-[85px] text-right">VCF</th>
                <th className="py-3 px-3 w-[120px] text-right text-blue-300 font-bold">实际容积 (m³)</th>
                <th className="py-3 px-3 w-[120px] text-right text-emerald-300 font-bold">重量 (t)</th>
                <th className="py-3 px-2 w-[85px] text-right">充满率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {summary.tankResults.map(tank => (
                <tr
                  key={tank.tankId}
                  onClick={() => setSelectedTankId(tank.tankId)}
                  className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                    selectedTankId === tank.tankId ? 'bg-blue-950/30 border-l-2 border-l-blue-400' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-sans font-medium text-white">
                    {tank.tankName}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTankTypeToggle(tank.tankId);
                      }}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors shadow-sm ${
                        tank.type === 'sounding'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                      }`}
                      title="点击切换实高/空高"
                    >
                      {tank.type === 'sounding' ? '实高' : '空高'}
                    </button>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={tank.inputValue === 0 ? '' : tank.inputValue}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                        handleTankValueChange(tank.tankId, val);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="0.000"
                      className="w-24 bg-slate-950 border border-slate-700 hover:border-blue-500 focus:border-blue-400 rounded px-2 py-1 text-right text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-400 shadow-inner"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-300">
                    {tank.trimCorrection >= 0 ? `+${tank.trimCorrection}` : tank.trimCorrection}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-300">
                    {tank.listCorrection >= 0 ? `+${tank.listCorrection}` : tank.listCorrection}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-blue-300">
                    {tank.correctedSounding.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    {tank.volume20C.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-emerald-400">
                    {tank.tempFactor.toFixed(5)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-purple-300">
                    {tank.vcfFactor.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-300 text-sm bg-blue-500/5">
                    {tank.actualVolume.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-300 text-sm bg-emerald-500/5">
                    {tank.weightTon.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span
                      className={`font-semibold ${
                        tank.fillPercentage > 95
                          ? 'text-amber-400'
                          : tank.fillPercentage > 0
                          ? 'text-blue-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {tank.fillPercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* 各舱容积小计 Row */}
              <tr className="bg-slate-950/80 font-semibold border-t-2 border-slate-700 text-slate-300 text-xs">
                <td colSpan={9} className="py-2.5 px-3 text-right font-sans text-slate-300">
                  各舱容积与重量小计 (Tanks Subtotal):
                </td>
                <td className="py-2.5 px-3 text-right text-blue-200 font-mono text-sm bg-blue-500/5">
                  {summary.tanksTotalVolume.toFixed(3)} m³
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-200 font-mono text-sm bg-emerald-500/5">
                  {summary.tanksTotalWeight.toFixed(3)} t
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                  {totalCapacity100 > 0 ? ((summary.tanksTotalVolume / totalCapacity100) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>

              {/* 管线容积输入 Row (在 Grand Total 上面) */}
              <tr className="bg-purple-950/20 font-bold border-t border-purple-800/40 text-purple-200 text-xs">
                <td colSpan={9} className="py-2.5 px-3 text-right font-sans">
                  <div className="flex items-center justify-end gap-2 text-purple-300">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                    <span>管线容积输入 (Pipeline Volume Input):</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-right bg-purple-950/40 border border-purple-500/30">
                  <div className="flex items-center justify-end gap-1.5">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={globalInput.pipelineVolume || ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setGlobalInput(prev => ({ ...prev, pipelineVolume: val }));
                      }}
                      placeholder="0.000"
                      className="w-28 bg-slate-900 border border-purple-500/60 rounded px-2 py-1 text-right text-purple-100 font-mono font-bold text-xs focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-400 shadow-inner"
                    />
                    <span className="text-[11px] text-purple-300 font-mono font-semibold">m³</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-purple-200 text-sm font-mono font-bold bg-purple-950/40 border border-purple-500/30">
                  {summary.pipelineWeight.toFixed(3)} t
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] text-purple-300/80">
                  (按视密度换算)
                </td>
              </tr>

              {/* 全舱及管线 Grand Total Row */}
              <tr className="bg-slate-950 font-black border-t-2 border-slate-700 text-white text-xs">
                <td colSpan={9} className="py-3.5 px-3 text-right font-sans text-sm">
                  <span className="text-amber-300 font-black">全舱及管线总计 (Grand Total):</span>
                </td>
                <td className="py-3.5 px-3 text-right text-blue-300 text-base font-mono bg-blue-500/15">
                  {summary.totalVolume.toFixed(3)} m³
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-300 text-base font-mono bg-emerald-500/15">
                  {summary.totalWeight.toFixed(3)} t
                </td>
                <td className="py-3.5 px-2 text-right font-mono text-emerald-400">
                  {totalCapacity100 > 0 ? ((summary.totalVolume / totalCapacity100) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
