import React from 'react';
import { TankCalcResult } from '../types/vessel';

interface TankVisualizerProps {
  tankResults: TankCalcResult[];
  trim: number;
  list: number;
  vesselName?: string;
  selectedTankId?: string;
  onSelectTank?: (tankId: string) => void;
}

export const TankVisualizer: React.FC<TankVisualizerProps> = ({
  tankResults,
  trim,
  list,
  vesselName,
  selectedTankId,
  onSelectTank,
}) => {
  // Dynamically group tanks into Port (左), Starboard (右), and Others
  const portTanks = tankResults.filter(
    t => t.tankId.toLowerCase().startsWith('p') || t.tankName.includes('左') || t.tankName.toLowerCase().includes('port')
  );
  
  const stbdTanks = tankResults.filter(
    t => t.tankId.toLowerCase().startsWith('s') || t.tankName.includes('右') || t.tankName.toLowerCase().includes('starboard') || t.tankName.toLowerCase().includes('stbd')
  );

  const otherTanks = tankResults.filter(
    t => !portTanks.includes(t) && !stbdTanks.includes(t)
  );

  const displayTitle = vesselName ? `${vesselName} 计量舱与计量口平面分布示意图` : '计量舱与计量口平面分布示意图';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2 flex-wrap">
            <span>{displayTitle}</span>
            <span className="text-xs bg-slate-800 text-slate-300 font-normal px-2 py-0.5 rounded border border-slate-700">
              前 (Bow) ←--→ 后 (Aft) | 共 {tankResults.length} 舱
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            点击对应舱室可聚焦调整实高/空高参数。液位高度根据充满率实时渲染。
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500/80 inline-block border border-blue-400"></span>
            <span>已装载 Liquid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/80 inline-block border border-amber-400"></span>
            <span>高充满率 (&gt;95%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-800 inline-block border border-slate-700"></span>
            <span>空舱 (&lt;2%)</span>
          </div>
        </div>
      </div>

      {/* Ship Hull Graphic Diagram */}
      <div className="relative w-full overflow-x-auto pb-2">
        <div className="min-w-[700px] bg-slate-950/70 border border-slate-800 rounded-xl p-4 relative space-y-3">
          
          {/* Ship Bow/Aft Marker */}
          <div className="flex justify-between text-[11px] font-mono text-slate-400 px-2">
            <span>首部 BOW (左Port / 右Starboard)</span>
            <span>尾部 AFT (泵舱 Pump Room)</span>
          </div>

          {/* Port Side Tanks (左舷舱室 - 左右各一行等比例) */}
          <div>
            <div className="text-[10px] text-blue-300 font-semibold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                左舷舱室 (Port Side Tanks)
              </span>
              <span className="text-[9px] text-slate-500 font-mono">共 {portTanks.length} 舱</span>
            </div>
            <div
              className="grid gap-1.5 w-full"
              style={{ gridTemplateColumns: `repeat(${Math.max(portTanks.length, 1)}, minmax(0, 1fr))` }}
            >
              {portTanks.map((tank) => {
                const isSelected = selectedTankId === tank.tankId;
                const fillPct = tank.fillPercentage;
                const isHigh = fillPct > 95;
                const isEmpty = fillPct < 2;

                return (
                  <button
                    key={tank.tankId}
                    onClick={() => onSelectTank?.(tank.tankId)}
                    className={`relative flex flex-col justify-between p-1.5 sm:p-2 rounded-lg border transition-all text-left group min-h-[75px] overflow-hidden ${
                      isSelected
                        ? 'border-blue-400 ring-2 ring-blue-500/40 bg-slate-800'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/90'
                    }`}
                  >
                    {/* Liquid fill animation layer */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-b-lg transition-all duration-500 pointer-events-none opacity-40 ${
                        isHigh ? 'bg-amber-500' : isEmpty ? 'bg-slate-700' : 'bg-blue-500'
                      }`}
                      style={{ height: `${fillPct}%` }}
                    />

                    <div className="relative z-10 flex flex-col gap-0.5">
                      <div className="flex justify-between items-start gap-0.5">
                        <span className="font-semibold text-[10px] text-white group-hover:text-blue-300 truncate leading-tight">
                          {tank.tankName}
                        </span>
                        <span className="font-mono text-[8px] text-slate-400 shrink-0">
                          {tank.capacity100}m³
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 mt-1">
                      <div className="flex justify-between items-baseline gap-0.5">
                        <span className="font-mono text-[11px] font-bold text-blue-300 leading-none">
                          {tank.obsVolume.toFixed(2)}
                        </span>
                        <span className={`font-mono text-[9px] font-semibold ${isHigh ? 'text-amber-400' : 'text-slate-300'}`}>
                          {fillPct}%
                        </span>
                      </div>
                      <div className="text-[8px] text-slate-400 mt-0.5 truncate font-mono">
                        {tank.type === 'sounding' ? '实' : '空'}:{tank.inputValue}m
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle Divider Line / Deck Pipe */}
          <div className="border-t border-b border-dashed border-slate-700/60 my-2 py-1 flex items-center justify-between text-[10px] font-mono text-slate-400 px-3">
            <span>主甲板管线 Main Deck Pipeline #1 &amp; #2</span>
            <span>Trim: {trim >= 0 ? '+' : ''}{trim}m | List: {list >= 0 ? '+' : ''}{list}°</span>
          </div>

          {/* Starboard Side Tanks (右舷舱室 - 左右各一行等比例) */}
          <div>
            <div className="text-[10px] text-cyan-300 font-semibold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                右舷舱室 (Starboard Side Tanks)
              </span>
              <span className="text-[9px] text-slate-500 font-mono">共 {stbdTanks.length} 舱</span>
            </div>
            <div
              className="grid gap-1.5 w-full"
              style={{ gridTemplateColumns: `repeat(${Math.max(stbdTanks.length, 1)}, minmax(0, 1fr))` }}
            >
              {stbdTanks.map((tank) => {
                const isSelected = selectedTankId === tank.tankId;
                const fillPct = tank.fillPercentage;
                const isHigh = fillPct > 95;
                const isEmpty = fillPct < 2;

                return (
                  <button
                    key={tank.tankId}
                    onClick={() => onSelectTank?.(tank.tankId)}
                    className={`relative flex flex-col justify-between p-1.5 sm:p-2 rounded-lg border transition-all text-left group min-h-[75px] overflow-hidden ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-slate-800'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/90'
                    }`}
                  >
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-b-lg transition-all duration-500 pointer-events-none opacity-40 ${
                        isHigh ? 'bg-amber-500' : isEmpty ? 'bg-slate-700' : 'bg-cyan-500'
                      }`}
                      style={{ height: `${fillPct}%` }}
                    />

                    <div className="relative z-10 flex flex-col gap-0.5">
                      <div className="flex justify-between items-start gap-0.5">
                        <span className="font-semibold text-[10px] text-white group-hover:text-cyan-300 truncate leading-tight">
                          {tank.tankName}
                        </span>
                        <span className="font-mono text-[8px] text-slate-400 shrink-0">
                          {tank.capacity100}m³
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 mt-1">
                      <div className="flex justify-between items-baseline gap-0.5">
                        <span className="font-mono text-[11px] font-bold text-cyan-300 leading-none">
                          {tank.obsVolume.toFixed(2)}
                        </span>
                        <span className={`font-mono text-[9px] font-semibold ${isHigh ? 'text-amber-400' : 'text-slate-300'}`}>
                          {fillPct}%
                        </span>
                      </div>
                      <div className="text-[8px] text-slate-400 mt-0.5 truncate font-mono">
                        {tank.type === 'sounding' ? '实' : '空'}:{tank.inputValue}m
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other / Slop Tanks if any */}
          {otherTanks.length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] text-purple-300 font-semibold mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                其他舱室 / 污油舱 (Other / Slop Tanks)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {otherTanks.map((tank) => {
                  const isSelected = selectedTankId === tank.tankId;
                  const fillPct = tank.fillPercentage;
                  return (
                    <button
                      key={tank.tankId}
                      onClick={() => onSelectTank?.(tank.tankId)}
                      className={`relative flex flex-col justify-between p-2.5 rounded-lg border transition-all text-left group min-h-[85px] ${
                        isSelected
                          ? 'border-purple-400 ring-2 ring-purple-500/40 bg-slate-800'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-900/90'
                      }`}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-b-lg transition-all duration-500 pointer-events-none opacity-30 bg-purple-500"
                        style={{ height: `${fillPct}%` }}
                      />
                      <div className="relative z-10 flex justify-between items-start gap-1">
                        <span className="font-semibold text-xs text-purple-200 truncate">
                          {tank.tankName}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400 shrink-0">
                          {tank.capacity100}m³
                        </span>
                      </div>
                      <div className="relative z-10 mt-1.5 font-mono">
                        <div className="text-xs font-bold text-purple-300">
                          {tank.obsVolume.toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">m³</span>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                          修:{tank.correctedSounding}m
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
