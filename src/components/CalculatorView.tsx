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
  Compass,
  Scale,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Calendar,
  Fuel,
  Info
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

  // Global Ship Condition (Draft & Trim only)
  const [globalInput, setGlobalInput] = useState<ShipGlobalInput>(() => {
    if (initialGlobalInput) return initialGlobalInput;
    return {
      draftAft: 3.50,
      draftForward: 2.46,
      trimOverride: 1.04,
      list: -0.30,
      oilType: '柴油',
      dateStr: new Date().toISOString().slice(0, 10),
      useSteelExpansion: true, // 默认算钢膨
      syncWithFirstTank: true, // 默认全部和第一个舱一样
      useAirBuoyancy: true, // 默认扣除空气浮力
      airBuoyancyValue: 0.0011, // 0.0011 t/m³ (1.1 kg/m³)
      pipelineVolume: 0,
      bottomRobVolume: 0,
    };
  });

  // Individual Tank Inputs with default parameters
  const [tankInputs, setTankInputs] = useState<TankInput[]>(() => {
    if (initialTankInputs && initialTankInputs.length > 0) return initialTankInputs;
    return activeTanks.map((tank, idx) => ({
      tankId: tank.id,
      type: 'sounding' as MeasurementType,
      value: tank.id === 'P1' ? 3.523 : 3.500,
      density20C: 0.8500,
      temperature: 20.0,
      vcf: 1.0000,
      waterSounding: 0.000,
      waterVolume: 0.000,
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

  // Handler for tank measurement value or param updates
  const handleTankValueChange = (tankId: string, field: keyof TankInput, value: any) => {
    setTankInputs(prev =>
      prev.map((t, idx) => {
        if (globalInput.syncWithFirstTank && idx > 0 && (field === 'density20C' || field === 'temperature' || field === 'vcf')) {
          // If synced with first tank, updating first tank propagates to all
          return t;
        }
        if (t.tankId === tankId) {
          const updated = { ...t, [field]: value };
          // If first tank is modified and sync is ON, propagate density/temp/vcf to all
          if (idx === 0 && globalInput.syncWithFirstTank && (field === 'density20C' || field === 'temperature' || field === 'vcf')) {
            setTimeout(() => {
              setTankInputs(current =>
                current.map(item => ({
                  ...item,
                  [field]: value,
                }))
              );
            }, 0);
          }
          return updated;
        }
        return t;
      })
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
      setGlobalInput(prev => ({
        ...prev,
        draftAft: 3.50,
        draftForward: 2.46,
        trimOverride: 1.04,
        list: -0.30,
        oilType: '柴油',
        useSteelExpansion: true,
        syncWithFirstTank: true,
      }));
      setTankInputs(prev =>
        prev.map(t => ({
          ...t,
          type: 'sounding',
          value: t.tankId === 'P1' ? 3.523 : 3.500,
          density20C: 0.8500,
          temperature: 35.0,
          vcf: 1.0000,
          waterSounding: 0.000,
          waterVolume: 0.000,
        }))
      );
    } else if (preset === 'full') {
      setGlobalInput(prev => ({
        ...prev,
        draftAft: 4.80,
        draftForward: 4.50,
        trimOverride: 0.30,
        list: 0.0,
        useSteelExpansion: true,
      }));
      setTankInputs(prev =>
        prev.map(t => {
          const meta = activeTanks.find(m => m.id === t.tankId);
          return {
            ...t,
            type: 'sounding',
            value: meta ? parseFloat((meta.refHeight * 0.95).toFixed(3)) : 7.50,
            density20C: 0.8500,
            temperature: 20.0,
            vcf: 1.0000,
            waterSounding: 0.000,
            waterVolume: 0.000,
          };
        })
      );
    } else if (preset === 'ballast') {
      setGlobalInput(prev => ({
        ...prev,
        draftAft: 2.80,
        draftForward: 1.50,
        trimOverride: 1.30,
        list: 0.5,
      }));
      setTankInputs(prev =>
        prev.map(t => ({
          ...t,
          type: 'sounding',
          value: 0.500,
          waterSounding: 0.000,
          waterVolume: 0.000,
        }))
      );
    } else if (preset === 'clear') {
      setTankInputs(prev =>
        prev.map(t => ({
          ...t,
          value: 0.000,
          waterSounding: 0.000,
          waterVolume: 0.000,
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
              证书编号: <strong className="text-slate-200 font-mono">{currentCertNo}</strong> | 检定计算规范: 燃油舱计量 + 钢膨修正 + VCF + 空气浮力扣减
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
        
        {/* Total Cargo Volume (OBS. VOL) */}
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-700/50 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Calculator className="w-32 h-32 text-blue-400" />
          </div>
          <div className="text-xs font-medium text-blue-300 flex items-center justify-between">
            <span>总观测体积 (OBS. VOL)</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
              {activeTanks.length}舱合计
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {summary.totalObsVolume.toLocaleString('zh-CN', { minimumFractionDigits: 3 })}
            </span>
            <span className="text-sm font-semibold text-blue-300">m³</span>
          </div>
          <p className="text-xs text-slate-300 mt-2 flex items-center justify-between">
            <span>净总体积 G.O.V: <strong className="font-mono text-white">{summary.totalVolume.toFixed(3)} m³</strong></span>
            <span>扣水: <strong className="font-mono text-cyan-200">{(summary.totalObsVolume - summary.totalGovVolume).toFixed(3)} m³</strong></span>
          </p>
        </div>

        {/* Standard Volume (G.S.V) */}
        <div className="bg-gradient-to-br from-purple-900 to-slate-900 border border-purple-700/50 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="text-xs font-medium text-purple-300 flex items-center justify-between">
            <span>总标准体积 (G.S.V)</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded border border-purple-400/30 font-mono">
              VCF修正后
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {summary.totalGsv.toLocaleString('zh-CN', { minimumFractionDigits: 3 })}
            </span>
            <span className="text-sm font-semibold text-purple-300">m³</span>
          </div>
          <p className="text-xs text-slate-300 mt-2 flex items-center justify-between">
            <span>钢膨修正: <strong className="font-mono text-emerald-300">{summary.useSteelExpansion ? '已启用' : '未启用'}</strong></span>
            <span>充满率: <strong className="font-mono text-purple-200">
              {totalCapacity100 > 0 ? ((summary.totalVolume / totalCapacity100) * 100).toFixed(1) : '0.0'}%
            </strong></span>
          </p>
        </div>

        {/* Total Cargo Weight Card */}
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 border border-emerald-700/50 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="text-xs font-medium text-emerald-300 flex items-center justify-between">
            <span>净油总重量 (Net Weight)</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-400/30 font-mono">
              空气视密度/WCF
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {summary.totalWeight.toLocaleString('zh-CN', { minimumFractionDigits: 3 })}
            </span>
            <span className="text-sm font-semibold text-emerald-300">吨 (t)</span>
          </div>
          <p className="text-xs text-slate-300 mt-2 flex items-center justify-between">
            <span>油品: <strong className="font-mono text-emerald-200">{summary.oilType}</strong></span>
            <span>扣浮力: <strong className="font-mono text-amber-300">0.0011 t/m³</strong></span>
          </p>
        </div>

        {/* Trim & List Condition */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-blue-400" />
            <span>船舶姿态 (Trim &amp; List)</span>
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

      </div>

      {/* Simplified Global Trim & Draft Input Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-400" />
              <span>航次吃水与纵横倾姿态参数输入</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              录入艉吃水、艏吃水与横倾角，系统自动对各舱室计算双向双线性插值修正。温度、密度、钢膨与VCF等参数已整合至下方的计量汇总明细表中。
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

        {/* Global Trim Form Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          
          {/* Draft Aft */}
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
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
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
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
          <div className="bg-blue-950/20 p-3 rounded-lg border border-blue-500/30">
            <label className="block text-xs font-semibold text-blue-300 mb-1 flex items-center justify-between">
              <span>纵倾 Trim (艉吃水-艏吃水)</span>
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
          <div className="bg-cyan-950/20 p-3 rounded-lg border border-cyan-500/30">
            <label className="block text-xs font-semibold text-cyan-300 mb-1 flex items-center justify-between">
              <span>横倾 List (负值左倾/正值右倾)</span>
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

      {/* NEW Calculation Results Summary Table ("燃油舱计量" Sheet Style) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-xl overflow-hidden">
        
        {/* Table Header Controls (Matching Excel Header in Photo) */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>燃油舱计量汇总表</span>
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                    标准航次汇总
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  对应验算表格结构：各舱分别录入或同步密度/温度/VCF，支持选择是否计算钢膨修正及扣除空气浮力。
                </p>
              </div>
            </div>

            {/* Excel Export Button */}
            <button
              onClick={() => exportCalculationResultsExcel(summary)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-emerald-900/40 active:scale-95 flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>导出燃油舱计量 Excel 报表</span>
            </button>
          </div>

          {/* Interactive Controls Bar - Matches Top Row of Excel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 mt-4 pt-3.5 border-t border-slate-800/80">
            
            {/* 油品名称 */}
            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex-shrink-0">油品名称:</span>
              <input
                type="text"
                value={globalInput.oilType || '柴油'}
                onChange={e => setGlobalInput(prev => ({ ...prev, oilType: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                placeholder="柴油 / 原油"
              />
            </div>

            {/* 纵倾 Readonly */}
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 font-mono text-xs">
              <span className="text-slate-300 font-semibold font-sans">纵倾:</span>
              <span className="font-bold text-blue-300">
                {effectiveTrim >= 0 ? '+' : ''}{effectiveTrim.toFixed(2)} 米
              </span>
            </div>

            {/* 是否算钢膨 (Checkbox explicitly requested by user) */}
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">是否算钢膨:</span>
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-950 px-2.5 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                <input
                  type="checkbox"
                  checked={globalInput.useSteelExpansion}
                  onChange={e => setGlobalInput(prev => ({ ...prev, useSteelExpansion: e.target.checked }))}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 w-4 h-4 cursor-pointer"
                />
                <span className={`text-xs font-bold ${globalInput.useSteelExpansion ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {globalInput.useSteelExpansion ? '是 (启用)' : '否 (关闭)'}
                </span>
              </label>
            </div>

            {/* 体积/密度修正系数联动配置 (Checkbox explicitly requested by user: 全部和第一个舱一样 还是 每个舱不同) */}
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 col-span-1 sm:col-span-2 md:col-span-1">
              <span className="text-xs font-semibold text-slate-300">密度/VCF配置:</span>
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-950 px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                <input
                  type="checkbox"
                  checked={globalInput.syncWithFirstTank}
                  onChange={e => setGlobalInput(prev => ({ ...prev, syncWithFirstTank: e.target.checked }))}
                  className="rounded border-slate-700 text-purple-500 focus:ring-purple-500 bg-slate-900 w-4 h-4 cursor-pointer"
                />
                <span className={`text-xs font-bold ${globalInput.syncWithFirstTank ? 'text-purple-300' : 'text-amber-300'}`}>
                  {globalInput.syncWithFirstTank ? '全部同首舱' : '各舱独立'}
                </span>
              </label>
            </div>

            {/* 计量日期 */}
            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-300 flex-shrink-0">日期:</span>
              <input
                type="date"
                value={globalInput.dateStr || ''}
                onChange={e => setGlobalInput(prev => ({ ...prev, dateStr: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-400"
              />
            </div>

          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans min-w-[1360px]">
            <thead>
              <tr className="bg-slate-950 text-slate-300 border-b-2 border-slate-800 font-bold text-[11px] uppercase tracking-wider align-bottom">
                <th className="py-2.5 px-2.5 w-[110px] min-w-[100px] leading-tight">
                  舱号<br /><span className="text-[9px] font-normal text-slate-400">(Tank Name)</span>
                </th>
                <th className="py-2.5 px-1.5 w-[55px] text-center leading-tight">类型</th>
                <th className="py-2.5 px-1.5 w-[75px] text-right leading-tight">测量值<br /><span className="text-[9px] font-normal text-slate-400">(m)</span></th>
                <th className="py-2.5 px-1.5 w-[85px] text-right text-blue-300 leading-tight">纵/横倾<br />修正后 (m)</th>
                <th className="py-2.5 px-1.5 w-[85px] text-right text-emerald-300 leading-tight">
                  20°C标密<br />
                  <span className="text-[9px] font-normal text-slate-400">(t/m³ 或 kg/L)</span>
                </th>
                <th className="py-2.5 px-1.5 w-[65px] text-right text-amber-300 leading-tight">温度<br /><span className="text-[9px] font-normal text-slate-400">(°C)</span></th>
                <th className="py-2.5 px-1.5 w-[90px] text-right leading-tight">观测体积<br /><span className="text-[9px] font-normal text-slate-400">OBS.VOL (m³)</span></th>
                <th className="py-2.5 px-1.5 w-[70px] text-right text-cyan-300 leading-tight">水高<br /><span className="text-[9px] font-normal text-cyan-400">(m)</span></th>
                <th className="py-2.5 px-1.5 w-[85px] text-right text-cyan-200 leading-tight">明水/扣水<br /><span className="text-[9px] font-normal text-slate-400">水体积 (m³)</span></th>
                <th className="py-2.5 px-1.5 w-[90px] text-right text-blue-200 font-bold leading-tight">实际体积<br /><span className="text-[9px] font-normal text-blue-300 font-mono">G.O.V (m³)</span></th>
                <th className="py-2.5 px-1.5 w-[85px] text-right text-emerald-400 leading-tight">钢材膨胀系数<br /><span className="text-[9px] font-normal text-slate-400">TK EXP.</span></th>
                <th className="py-2.5 px-1.5 w-[90px] text-right text-amber-200 leading-tight">重量修正系数<br /><span className="text-[9px] font-normal text-slate-400">WCF</span></th>
                <th className="py-2.5 px-1.5 w-[80px] text-right text-purple-300 leading-tight">体积修正系数<br /><span className="text-[9px] font-normal text-slate-400">VCF20</span></th>
                <th className="py-2.5 px-1.5 w-[90px] text-right text-purple-200 font-bold leading-tight">总标准体积<br /><span className="text-[9px] font-normal text-purple-300 font-mono">G.S.V (m³)</span></th>
                <th className="py-2.5 px-2.5 w-[115px] text-right text-emerald-300 font-black text-xs bg-emerald-950/20 leading-tight">
                  净油重量 (吨)<br />
                  <span className={`text-[9px] font-normal ${globalInput.useSteelExpansion ? 'text-emerald-400' : 'text-amber-400 font-bold'}`}>
                    {globalInput.useSteelExpansion ? '(钢膨修正后)' : '(未经钢膨修正)'}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {summary.tankResults.map((tank, idx) => {
                const isFirst = idx === 0;
                const isDisabledSync = !isFirst && globalInput.syncWithFirstTank;

                return (
                  <tr
                    key={tank.tankId}
                    onClick={() => setSelectedTankId(tank.tankId)}
                    className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      selectedTankId === tank.tankId ? 'bg-blue-950/30 border-l-2 border-l-blue-400' : ''
                    }`}
                  >
                    {/* 舱号 */}
                    <td className="py-2.5 px-2.5 font-sans font-medium text-white flex items-center justify-between break-words whitespace-normal leading-tight">
                      <span className="break-words">{tank.tankName}</span>
                      {isFirst && globalInput.syncWithFirstTank && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded border border-purple-500/30 font-mono ml-1 shrink-0">
                          首舱基准
                        </span>
                      )}
                    </td>

                    {/* 类型 */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTankTypeToggle(tank.tankId);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-colors shadow-sm ${
                          tank.type === 'sounding'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                        }`}
                        title="点击切换实高/空高"
                      >
                        {tank.type === 'sounding' ? '实高' : '空高'}
                      </button>
                    </td>

                    {/* 测量值 (m) */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={tank.inputValue === 0 ? '' : tank.inputValue}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          handleTankValueChange(tank.tankId, 'value', val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0.000"
                        className="w-16 bg-slate-950 border border-slate-700 hover:border-blue-500 focus:border-blue-400 rounded px-1.5 py-1 text-right text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-400 shadow-inner"
                      />
                    </td>

                    {/* 纵/横倾修正后 (m) */}
                    <td className="py-2.5 px-2 text-right font-bold text-blue-300">
                      {tank.correctedSounding.toFixed(3)}
                    </td>

                    {/* 20°C标密 (t/m³) */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.5"
                        max="1.5"
                        disabled={isDisabledSync}
                        value={tank.density20C || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleTankValueChange(tank.tankId, 'density20C', val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0.8500"
                        className={`w-18 bg-slate-950 border rounded px-1.5 py-1 text-right text-xs font-mono font-bold focus:outline-none shadow-inner ${
                          isDisabledSync
                            ? 'border-slate-800 text-slate-500 opacity-70 cursor-not-allowed'
                            : 'border-emerald-700 hover:border-emerald-500 text-emerald-300 focus:border-emerald-400'
                        }`}
                      />
                    </td>

                    {/* 温度 (°C) */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.1"
                        disabled={isDisabledSync}
                        value={tank.temperature ?? 20.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 20.0;
                          handleTankValueChange(tank.tankId, 'temperature', val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-14 bg-slate-950 border rounded px-1.5 py-1 text-right text-xs font-mono font-bold focus:outline-none shadow-inner ${
                          isDisabledSync
                            ? 'border-slate-800 text-slate-500 opacity-70 cursor-not-allowed'
                            : 'border-amber-700 hover:border-amber-500 text-amber-300 focus:border-amber-400'
                        }`}
                      />
                    </td>

                    {/* 观测体积 OBS. VOL. (m³) */}
                    <td className="py-2.5 px-2 text-right text-slate-200 font-semibold">
                      {tank.obsVolume.toFixed(3)}
                    </td>

                    {/* 水高 (m) 输入 */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={tank.waterSounding === 0 ? '' : tank.waterSounding}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          handleTankValueChange(tank.tankId, 'waterSounding', val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0.000"
                        className="w-16 bg-slate-950 border border-cyan-700/60 hover:border-cyan-500 focus:border-cyan-400 rounded px-1 py-1 text-right text-xs text-cyan-200 font-mono font-bold focus:outline-none shadow-inner"
                        title="录入测得的水高(m)，依据舱容表自动算得明水体积"
                      />
                    </td>

                    {/* 明水/扣水 (m³) */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={tank.waterVolume === 0 ? '' : tank.waterVolume}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          handleTankValueChange(tank.tankId, 'waterVolume', val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0.000"
                        className={`w-16 bg-slate-950 border rounded px-1 py-1 text-right text-xs font-mono focus:outline-none shadow-inner ${
                          tank.waterSounding > 0
                            ? 'border-cyan-500/80 text-cyan-300 font-bold'
                            : 'border-slate-800 text-slate-300 hover:border-slate-600 focus:border-blue-400'
                        }`}
                        title={tank.waterSounding > 0 ? '根据水高及舱容表自动算出，亦可覆盖' : '直接输入明水体积(m³)'}
                      />
                    </td>

                    {/* 实际体积 G.O.V (m³) */}
                    <td className="py-2.5 px-2 text-right font-bold text-blue-200 bg-blue-500/5">
                      {tank.govVolume.toFixed(3)}
                    </td>

                    {/* 钢材膨胀系数 TK EXP. CORP */}
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-emerald-400">
                      {summary.useSteelExpansion ? tank.tempFactor.toFixed(5) : 'NIL'}
                    </td>

                    {/* 重量修正系数 WCF */}
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-amber-300">
                      {tank.wcfFactor.toFixed(4)}
                    </td>

                    {/* 体积修正系数 VCF */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.5"
                        max="1.5"
                        disabled={isDisabledSync}
                        value={tank.vcfFactor || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1.0000;
                          handleTankValueChange(tank.tankId, 'vcf', val);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="1.0000"
                        className={`w-18 bg-slate-950 border rounded px-1.5 py-1 text-right text-xs font-mono font-bold focus:outline-none shadow-inner ${
                          isDisabledSync
                            ? 'border-slate-800 text-slate-500 opacity-70 cursor-not-allowed'
                            : 'border-purple-700 hover:border-purple-500 text-purple-300 focus:border-purple-400'
                        }`}
                      />
                    </td>

                    {/* 总标准体积 G.S.V (m³) */}
                    <td className="py-2.5 px-2 text-right font-bold text-purple-200 bg-purple-500/5">
                      {tank.gsvVolume.toFixed(3)}
                    </td>

                    {/* 净油重量 钢膨修正后 (吨) */}
                    <td className="py-2.5 px-3 text-right font-extrabold text-emerald-300 text-sm bg-emerald-500/10">
                      {tank.weightTon.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer Rows Matching Bottom of "燃油舱计量" Sheet */}
            <tfoot>
              {/* 各舱小计 Row */}
              <tr className="bg-slate-950 font-bold border-t-2 border-slate-700 text-slate-200 text-xs">
                <td colSpan={6} className="py-3 px-3 text-right font-sans text-slate-300">
                  各舱小计 (Tanks Subtotal):
                </td>
                <td className="py-3 px-2 text-right text-slate-200 font-mono">
                  {summary.totalObsVolume.toFixed(3)}
                </td>
                <td className="py-3 px-2 text-right text-slate-500 font-mono">
                  -
                </td>
                <td className="py-3 px-2 text-right text-slate-400 font-mono">
                  {(summary.totalObsVolume - summary.totalGovVolume).toFixed(3)}
                </td>
                <td className="py-3 px-2 text-right text-blue-200 font-mono text-sm bg-blue-500/10">
                  {summary.totalGovVolume.toFixed(3)}
                </td>
                <td colSpan={3} className="py-3 px-2 text-right text-slate-400 font-sans font-normal text-[11px]">
                  小计:
                </td>
                <td className="py-3 px-2 text-right text-purple-200 font-mono text-sm bg-purple-500/10">
                  {summary.totalGsvVolume.toFixed(3)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-300 font-mono text-base font-extrabold bg-emerald-500/15">
                  {summary.tanksTotalWeight.toFixed(3)}
                </td>
              </tr>

              {/* 管线 (Pipeline Volume Input) */}
              <tr className="bg-slate-950/60 font-semibold border-t border-slate-800 text-purple-200 text-xs">
                <td className="py-2.5 px-2.5 font-sans font-medium text-purple-200 break-words whitespace-normal leading-tight">
                  管线 (Pipeline)
                </td>
                <td className="py-2.5 px-1.5 text-center text-slate-500">-</td>
                <td className="py-2.5 px-1.5 text-right text-slate-500">-</td>
                <td className="py-2.5 px-1.5 text-right text-slate-500">-</td>
                {/* 标密 */}
                <td className="py-2 px-1.5 text-right">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.5"
                    max="1.5"
                    value={globalInput.pipelineDensity ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 0;
                      setGlobalInput(prev => ({ ...prev, pipelineDensity: val }));
                    }}
                    placeholder={summary.pipelineDensity.toFixed(4)}
                    className="w-18 bg-slate-950 border border-emerald-700 hover:border-emerald-500 text-emerald-300 focus:border-emerald-400 rounded px-1 py-1 text-right text-xs font-mono font-bold focus:outline-none shadow-inner"
                    title="管线20°C标密 (t/m³)，留空跟随首舱"
                  />
                </td>
                {/* 温度 */}
                <td className="py-2 px-1.5 text-right">
                  <input
                    type="number"
                    step="0.1"
                    value={globalInput.pipelineTemp ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 20.0;
                      setGlobalInput(prev => ({ ...prev, pipelineTemp: val }));
                    }}
                    placeholder={summary.pipelineTemp.toFixed(1)}
                    className="w-14 bg-slate-950 border border-amber-700 hover:border-amber-500 text-amber-300 focus:border-amber-400 rounded px-1 py-1 text-right text-xs font-mono font-bold focus:outline-none shadow-inner"
                    title="管线温度 (°C)，留空跟随首舱"
                  />
                </td>
                {/* 观测体积 */}
                <td className="py-2.5 px-1.5 text-right font-mono text-slate-300">
                  {summary.pipelineVolume.toFixed(3)}
                </td>
                <td className="py-2.5 px-1.5 text-right text-slate-500">-</td>
                <td className="py-2.5 px-1.5 text-right text-slate-500">-</td>
                {/* 实际体积 G.O.V */}
                <td className="py-2 px-1.5 text-right">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={globalInput.pipelineVolume === undefined || globalInput.pipelineVolume === 0 ? '' : globalInput.pipelineVolume}
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                      setGlobalInput(prev => ({ ...prev, pipelineVolume: val }));
                    }}
                    placeholder="0.000"
                    className="w-18 bg-slate-900 border border-blue-500/50 rounded px-1 py-1 text-right text-blue-100 font-mono font-bold text-xs focus:outline-none focus:border-blue-300 shadow-inner"
                    title="管线容积/实际体积 (m³)"
                  />
                </td>
                {/* 钢材膨胀系数 */}
                <td className="py-2.5 px-1.5 text-right font-mono text-emerald-400">
                  {summary.useSteelExpansion ? summary.pipelineTempFactor.toFixed(5) : 'NIL'}
                </td>
                {/* 重量修正系数 WCF */}
                <td className="py-2.5 px-1.5 text-right font-mono text-amber-300">
                  {summary.pipelineWcf.toFixed(4)}
                </td>
                {/* 体积修正系数 VCF */}
                <td className="py-2 px-1.5 text-right">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.5"
                    max="1.5"
                    value={globalInput.pipelineVcf ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 1.0000;
                      setGlobalInput(prev => ({ ...prev, pipelineVcf: val }));
                    }}
                    placeholder={summary.pipelineVcf.toFixed(4)}
                    className="w-18 bg-slate-950 border border-purple-700 hover:border-purple-500 text-purple-300 focus:border-purple-400 rounded px-1 py-1 text-right text-xs font-mono font-bold focus:outline-none shadow-inner"
                    title="管线VCF，留空跟随首舱"
                  />
                </td>
                {/* 总标准体积 G.S.V */}
                <td className="py-2.5 px-1.5 text-right font-mono font-bold text-purple-300">
                  {summary.pipelineGsv.toFixed(3)}
                </td>
                {/* 净油重量 */}
                <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-300 bg-emerald-500/10">
                  {summary.pipelineWeight.toFixed(3)}
                </td>
              </tr>

              {/* 底油 (ROB Volume Input) */}
              <tr className="bg-slate-950/60 font-semibold border-t border-slate-800 text-amber-200 text-xs">
                <td className="py-2.5 px-2.5 font-sans font-medium text-amber-200 break-words whitespace-normal leading-tight">
                  底油 (ROB)
                </td>
                <td className="py-2.5 px-1.5 text-center text-slate-500">-</td>
                <td className="py-2.5 px-1.5 text-right text-slate-500">-</td>
                <td className="py-2.5 px-1.5 text-right text-slate-500">-</td>
                {/* 标密 */}
                <td className="py-2 px-1.5 text-right">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.5"
                    max="1.5"
                    value={globalInput.bottomRobDensity ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 0;
                      setGlobalInput(prev => ({ ...prev, bottomRobDensity: val }));
                    }}
                    placeholder={summary.bottomRobDensity.toFixed(4)}
                    className="w-18 bg-slate-950 border border-emerald-700 hover:border-emerald-500 text-emerald-300 focus:border-emerald-400 rounded px-1 py-1 text-right text-xs font-mono font-bold focus:outline-none shadow-inner"
                    title="底油20°C标密 (t/m³)，留空跟随首舱"
                  />
                </td>
                {/* 温度 */}
                <td className="py-2 px-1.5 text-right">
                  <input
                    type="number"
                    step="0.1"
                    value={globalInput.bottomRobTemp ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 20.0;
                      setGlobalInput(prev => ({ ...prev, bottomRobTemp: val }));
                    }}
                    placeholder={summary.bottomRobTemp.toFixed(1)}
                    className="w-14 bg-slate-950 border border-amber-700 hover:border-amber-500 text-amber-300 focus:border-amber-400 rounded px-1 py-1 text-right text-xs font-mono font-bold focus:outline-none shadow-inner"
                    title="底油温度 (°C)，留空跟随首舱"
                  />
                </td>
                {/* 观测体积 */}
                <td className="py-2.5 px-1.5 text-right font-mono text-slate-300">
                  {summary.bottomRobVolume.toFixed(3)}
                </td>
                <td className="py-2.5 px-1.5 text-right text-slate-500">-</td>
                <td className="py-2.5 px-1.5 text-right text-slate-500">-</td>
                {/* 实际体积 G.O.V */}
                <td className="py-2 px-1.5 text-right">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={globalInput.bottomRobVolume === undefined || globalInput.bottomRobVolume === 0 ? '' : globalInput.bottomRobVolume}
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                      setGlobalInput(prev => ({ ...prev, bottomRobVolume: val }));
                    }}
                    placeholder="0.000"
                    className="w-18 bg-slate-900 border border-amber-500/50 rounded px-1 py-1 text-right text-amber-100 font-mono font-bold text-xs focus:outline-none focus:border-amber-300 shadow-inner"
                    title="底油容积/实际体积 (m³)"
                  />
                </td>
                {/* 钢材膨胀系数 */}
                <td className="py-2.5 px-1.5 text-right font-mono text-emerald-400">
                  {summary.useSteelExpansion ? summary.bottomRobTempFactor.toFixed(5) : 'NIL'}
                </td>
                {/* 重量修正系数 WCF */}
                <td className="py-2.5 px-1.5 text-right font-mono text-amber-300">
                  {summary.bottomRobWcf.toFixed(4)}
                </td>
                {/* 体积修正系数 VCF */}
                <td className="py-2 px-1.5 text-right">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.5"
                    max="1.5"
                    value={globalInput.bottomRobVcf ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 1.0000;
                      setGlobalInput(prev => ({ ...prev, bottomRobVcf: val }));
                    }}
                    placeholder={summary.bottomRobVcf.toFixed(4)}
                    className="w-18 bg-slate-950 border border-purple-700 hover:border-purple-500 text-purple-300 focus:border-purple-400 rounded px-1 py-1 text-right text-xs font-mono font-bold focus:outline-none shadow-inner"
                    title="底油VCF，留空跟随首舱"
                  />
                </td>
                {/* 总标准体积 G.S.V */}
                <td className="py-2.5 px-1.5 text-right font-mono font-bold text-purple-300">
                  {summary.bottomRobGsv.toFixed(3)}
                </td>
                {/* 净油重量 */}
                <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-300 bg-emerald-500/10">
                  {summary.bottomRobWeight.toFixed(3)}
                </td>
              </tr>

              {/* 全舱及管线底油 Grand Total Row */}
              <tr className="bg-slate-950 font-black border-t-2 border-slate-700 text-white text-xs">
                <td colSpan={6} className="py-3.5 px-3 text-right font-sans text-sm">
                  <span className="text-amber-300 font-black">总量 (Grand Total):</span>
                </td>
                <td className="py-3.5 px-2 text-right text-blue-300 text-sm font-mono bg-blue-500/10">
                  {summary.totalObsVolume.toFixed(3)}
                </td>
                <td className="py-3.5 px-2 text-right text-slate-500 font-mono text-sm">
                  -
                </td>
                <td className="py-3.5 px-2 text-right text-slate-400 font-mono text-sm">
                  {(summary.totalObsVolume - summary.totalGovVolume).toFixed(3)}
                </td>
                <td className="py-3.5 px-2 text-right text-blue-200 text-base font-mono font-black bg-blue-500/20">
                  {summary.totalVolume.toFixed(3)}
                </td>
                <td colSpan={3} className="py-3.5 px-2 text-right text-amber-300 text-xs font-sans">
                  全舱总体积/总净重:
                </td>
                <td className="py-3.5 px-2 text-right text-purple-200 text-base font-mono font-black bg-purple-500/20">
                  {summary.totalGsv.toFixed(3)}
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-300 text-lg font-mono font-black bg-emerald-500/25">
                  {summary.totalWeight.toFixed(3)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Notes & Formulas Card matching photo */}
        <div className="mt-5 bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
            <Info className="w-4 h-4" />
            <span>舱容计算注释与换算规则 (Notes &amp; Calculation Rules):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
            <p>1. <strong>姿态方向</strong>: 艉倾为“+”，艏倾为“-”；左倾为“-”，右倾为“+”。系统按《检定证书》表双向双线性插值进行纵倾与横倾修正。</p>
            <p>2. <strong>密度与WCF</strong>: 标密输入20°C真空密度 (t/m³ 或 kg/L)。重量修正系数 WCF = 20°C标密 - 扣除空气浮力 (0.0011 t/m³)。</p>
            <p>3. <strong>体积计算 (G.O.V &amp; G.S.V)</strong>: 实际体积 G.O.V = 观测体积 OBS.VOL - 明水扣除。总标准体积 G.S.V = G.O.V × 体积修正系数 VCF。</p>
            <p>4. <strong>净油重量 (t)</strong>: 当勾选【是否算钢膨: 是】时，净油重量 = G.S.V × WCF × 钢材热膨胀系数 TK EXP. CORP [1+(t-20)×0.000036]。</p>
          </div>
        </div>

      </div>

    </div>
  );
};
