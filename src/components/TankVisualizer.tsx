import React from 'react';
import { TankCalcResult } from '../types/vessel';

interface TankVisualizerProps {
  tankResults: TankCalcResult[];
  trim: number;
  list: number;
  selectedTankId?: string;
  onSelectTank?: (tankId: string) => void;
}

export const TankVisualizer: React.FC<TankVisualizerProps> = ({
  tankResults,
  trim,
  list,
  selectedTankId,
  onSelectTank,
}) => {
  // Helper to get tank result by ID
  const getTank = (id: string) => tankResults.find(t => t.tankId === id);

  // Group tanks into Port (左), Starboard (右), and SLOP
  const portTanks = ['P1', 'P2', 'P3', 'P4', 'P5'];
  const stbTanks = ['S1', 'S2', 'S3', 'S4', 'S5'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span>东城油17 计量舱与计量口平面分布示意图</span>
            <span className="text-xs bg-slate-800 text-slate-300 font-normal px-2 py-0.5 rounded border border-slate-700">
              前 (Bow) ←--→ 后 (Aft)
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
        <div className="min-w-[700px] bg-slate-950/70 border border-slate-800 rounded-xl p-4 relative">
          
          {/* Ship Bow/Aft Marker */}
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-2 px-2">
            <span>首部 BOW (左Port / 右Starboard)</span>
            <span>尾部 AFT (泵舱 Pump Room)</span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            
            {/* Port Side Tanks (P1 - P5, P.SLOP) */}
            <div className="col-span-6 grid grid-cols-6 gap-2">
              {portTanks.map((id, index) => {
                const tank = getTank(id);
                if (!tank) return null;

                const isSelected = selectedTankId === id;
                const fillPct = tank.fillPercentage;
                const isHigh = fillPct > 95;
                const isEmpty = fillPct < 2;

                return (
                  <button
                    key={id}
                    onClick={() => onSelectTank?.(id)}
                    className={`relative flex flex-col justify-between p-3 rounded-lg border transition-all text-left group min-h-[90px] ${
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

                    <div className="relative z-10 flex justify-between items-start">
                      <span className="font-semibold text-xs text-white group-hover:text-blue-300">
                        {tank.tankName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        H={tank.capacity100}m³
                      </span>
                    </div>

                    <div className="relative z-10 mt-2">
                      <div className="flex justify-between items-baseline">
                        <span className="font-mono text-sm font-bold text-blue-300">
                          {tank.actualVolume} <span className="text-[10px] text-slate-400 font-normal">m³</span>
                        </span>
                        <span className={`font-mono text-xs font-semibold ${isHigh ? 'text-amber-400' : 'text-slate-300'}`}>
                          {fillPct}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {tank.type === 'sounding' ? '实高' : '空高'}: {tank.inputValue}m (修:{tank.correctedSounding}m)
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* P.SLOP */}
              {(() => {
                const tank = getTank('P_SLOP');
                if (!tank) return null;
                const isSelected = selectedTankId === 'P_SLOP';
                return (
                  <button
                    onClick={() => onSelectTank?.('P_SLOP')}
                    className={`relative flex flex-col justify-between p-3 rounded-lg border transition-all text-left min-h-[90px] ${
                      isSelected
                        ? 'border-purple-400 ring-2 ring-purple-500/40 bg-slate-800'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/90'
                    }`}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-b-lg transition-all duration-500 pointer-events-none opacity-30 bg-purple-500"
                      style={{ height: `${tank.fillPercentage}%` }}
                    />
                    <div className="relative z-10 flex justify-between items-start">
                      <span className="font-semibold text-xs text-purple-200">
                        P.SLOP (左污)
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {tank.capacity100}m³
                      </span>
                    </div>
                    <div className="relative z-10 mt-2">
                      <div className="font-mono text-sm font-bold text-purple-300">
                        {tank.actualVolume} <span className="text-[10px] text-slate-400 font-normal">m³</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        修:{tank.correctedSounding}m
                      </div>
                    </div>
                  </button>
                );
              })()}
            </div>

            {/* Middle Divider Line / Deck Pipe */}
            <div className="col-span-6 border-t border-b border-dashed border-slate-700/60 my-1 py-1 flex items-center justify-between text-[10px] font-mono text-slate-500 px-3">
              <span>主甲板管线 Main Deck Pipeline #1 &amp; #2</span>
              <span>Trim: {trim >= 0 ? '+' : ''}{trim}m | List: {list >= 0 ? '+' : ''}{list}°</span>
            </div>

            {/* Starboard Side Tanks (S1 - S5, S.SLOP) */}
            <div className="col-span-6 grid grid-cols-6 gap-2">
              {stbTanks.map((id, index) => {
                const tank = getTank(id);
                if (!tank) return null;

                const isSelected = selectedTankId === id;
                const fillPct = tank.fillPercentage;
                const isHigh = fillPct > 95;
                const isEmpty = fillPct < 2;

                return (
                  <button
                    key={id}
                    onClick={() => onSelectTank?.(id)}
                    className={`relative flex flex-col justify-between p-3 rounded-lg border transition-all text-left group min-h-[90px] ${
                      isSelected
                        ? 'border-blue-400 ring-2 ring-blue-500/40 bg-slate-800'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/90'
                    }`}
                  >
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-b-lg transition-all duration-500 pointer-events-none opacity-40 ${
                        isHigh ? 'bg-amber-500' : isEmpty ? 'bg-slate-700' : 'bg-cyan-500'
                      }`}
                      style={{ height: `${fillPct}%` }}
                    />

                    <div className="relative z-10 flex justify-between items-start">
                      <span className="font-semibold text-xs text-white group-hover:text-cyan-300">
                        {tank.tankName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        H={tank.capacity100}m³
                      </span>
                    </div>

                    <div className="relative z-10 mt-2">
                      <div className="flex justify-between items-baseline">
                        <span className="font-mono text-sm font-bold text-cyan-300">
                          {tank.actualVolume} <span className="text-[10px] text-slate-400 font-normal">m³</span>
                        </span>
                        <span className={`font-mono text-xs font-semibold ${isHigh ? 'text-amber-400' : 'text-slate-300'}`}>
                          {fillPct}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {tank.type === 'sounding' ? '实高' : '空高'}: {tank.inputValue}m (修:{tank.correctedSounding}m)
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* S.SLOP */}
              {(() => {
                const tank = getTank('S_SLOP');
                if (!tank) return null;
                const isSelected = selectedTankId === 'S_SLOP';
                return (
                  <button
                    onClick={() => onSelectTank?.('S_SLOP')}
                    className={`relative flex flex-col justify-between p-3 rounded-lg border transition-all text-left min-h-[90px] ${
                      isSelected
                        ? 'border-purple-400 ring-2 ring-purple-500/40 bg-slate-800'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/90'
                    }`}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-b-lg transition-all duration-500 pointer-events-none opacity-30 bg-purple-500"
                      style={{ height: `${tank.fillPercentage}%` }}
                    />
                    <div className="relative z-10 flex justify-between items-start">
                      <span className="font-semibold text-xs text-purple-200">
                        S.SLOP (右污)
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {tank.capacity100}m³
                      </span>
                    </div>
                    <div className="relative z-10 mt-2">
                      <div className="font-mono text-sm font-bold text-purple-300">
                        {tank.actualVolume} <span className="text-[10px] text-slate-400 font-normal">m³</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        修:{tank.correctedSounding}m
                      </div>
                    </div>
                  </button>
                );
              })()}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
