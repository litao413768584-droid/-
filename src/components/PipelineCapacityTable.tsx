import React from 'react';
import { TANKS_META, VESSEL_INFO } from '../data/shipData';
import { VesselMetadata } from '../types/vessel';
import { CheckCircle2, ArrowDownRight, Layers } from 'lucide-react';

interface PipelineCapacityTableProps {
  vesselMeta?: VesselMetadata | null;
  onApplyPipelineVolume?: (volume: number, label: string) => void;
  isCompact?: boolean;
}

export const PipelineCapacityTable: React.FC<PipelineCapacityTableProps> = ({
  vesselMeta,
  onApplyPipelineVolume,
  isCompact = false,
}) => {
  const activeTanks = vesselMeta?.tanks || TANKS_META;
  const vesselName = vesselMeta?.name || VESSEL_INFO.name;
  const englishName = vesselMeta?.englishName || VESSEL_INFO.englishName;
  const certNo = vesselMeta?.certificateNo || VESSEL_INFO.certificateNo;
  const validPeriod = vesselMeta?.validPeriod || VESSEL_INFO.expiryDate;

  const onDeckNo1 = vesselMeta?.onDeckPipeNo1 ?? VESSEL_INFO.onDeckPipeNo1;
  const onDeckNo2 = vesselMeta?.onDeckPipeNo2 ?? VESSEL_INFO.onDeckPipeNo2;
  const pumpRoomNo1 = vesselMeta?.pumpRoomPipeNo1 ?? VESSEL_INFO.pumpRoomPipeNo1;
  const pumpRoomNo2 = vesselMeta?.pumpRoomPipeNo2 ?? VESSEL_INFO.pumpRoomPipeNo2;

  // Sums
  const tanksNo1Total = activeTanks.reduce((sum, t) => sum + (t.pipeLineNo1 || 0), 0);
  const tanksNo2Total = activeTanks.reduce((sum, t) => sum + (t.pipeLineNo2 || 0), 0);
  const tanksCombined = tanksNo1Total + tanksNo2Total;

  const onDeckCombined = onDeckNo1 + onDeckNo2;
  const pumpRoomCombined = pumpRoomNo1 + pumpRoomNo2;

  const grandNo1 = tanksNo1Total + onDeckNo1 + pumpRoomNo1;
  const grandNo2 = tanksNo2Total + onDeckNo2 + pumpRoomNo2;
  const grandTotalAll = grandNo1 + grandNo2;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-lg space-y-4">
      {/* Document Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded tracking-wider">
              CRZH
            </span>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              管线容量 <span className="text-xs text-slate-400 font-normal">Pipeline capacity</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            证书编号: <span className="font-mono text-slate-200">{certNo}</span> | 检定档案第12页
          </p>
        </div>

        <div className="text-right text-xs">
          <div className="font-bold text-blue-300">{vesselName} {englishName}</div>
          <div className="text-[10px] text-slate-400">单位(Unit): m³ | 有效期至: {validPeriod}</div>
        </div>
      </div>

      {/* Quick Action Buttons (If Callback Provided) */}
      {onApplyPipelineVolume && (
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-blue-400" />
            <span>一键应用证书管线容量至计算器:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onApplyPipelineVolume(parseFloat(grandNo1.toFixed(3)), '1# 管线全船容积')}
              className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-md text-xs font-mono font-semibold transition-colors flex items-center gap-1"
            >
              <span>1# 管线 (全船)</span>
              <strong className="text-white">{grandNo1.toFixed(3)} m³</strong>
            </button>

            <button
              type="button"
              onClick={() => onApplyPipelineVolume(parseFloat(grandNo2.toFixed(3)), '2# 管线全船容积')}
              className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-md text-xs font-mono font-semibold transition-colors flex items-center gap-1"
            >
              <span>2# 管线 (全船)</span>
              <strong className="text-white">{grandNo2.toFixed(3)} m³</strong>
            </button>

            <button
              type="button"
              onClick={() => onApplyPipelineVolume(parseFloat(grandTotalAll.toFixed(3)), '1#+2#管线全船总计')}
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-md text-xs font-mono font-semibold transition-colors flex items-center gap-1"
            >
              <span>全船管线合计</span>
              <strong className="text-white">{grandTotalAll.toFixed(3)} m³</strong>
            </button>

            <button
              type="button"
              onClick={() => onApplyPipelineVolume(parseFloat(tanksCombined.toFixed(3)), '舱内管线小计')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md text-xs font-mono font-semibold transition-colors flex items-center gap-1"
            >
              <span>仅舱内管线</span>
              <strong className="text-white">{tanksCombined.toFixed(3)} m³</strong>
            </button>
          </div>
        </div>
      )}

      {/* Official Certificate Style Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70">
        <table className="w-full text-xs text-left border-collapse font-mono">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
              <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-800 font-semibold font-sans">
                舱名 Tank Name
              </th>
              <th colSpan={2} className="py-1.5 px-3 text-center border-b border-r border-slate-800 font-semibold font-sans">
                管线编号 Pipe Line No
              </th>
              <th rowSpan={2} className="py-2.5 px-3 text-right font-semibold font-sans text-slate-300">
                舱内小计 Total
              </th>
            </tr>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[11px]">
              <th className="py-1.5 px-3 text-center border-r border-slate-800">No.1</th>
              <th className="py-1.5 px-3 text-center border-r border-slate-800">No.2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {activeTanks.map((tank) => {
              const no1 = tank.pipeLineNo1;
              const no2 = tank.pipeLineNo2;
              const tankSum = (no1 || 0) + (no2 || 0);

              return (
                <tr key={tank.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2 px-3 border-r border-slate-800 font-sans font-medium text-slate-200">
                    {tank.name}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-800 text-blue-300">
                    {no1 !== undefined && no1 > 0 ? no1.toFixed(3) : <span className="text-slate-600">---</span>}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-800 text-cyan-300">
                    {no2 !== undefined && no2 > 0 ? no2.toFixed(3) : <span className="text-slate-600">---</span>}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-300">
                    {tankSum > 0 ? tankSum.toFixed(3) : <span className="text-slate-600">---</span>}
                  </td>
                </tr>
              );
            })}

            {/* Subtotal Total Row */}
            <tr className="bg-slate-900/90 font-bold border-t-2 border-slate-800">
              <td className="py-2.5 px-3 border-r border-slate-800 font-sans text-white">
                总计 Total (舱内)
              </td>
              <td className="py-2.5 px-3 text-center border-r border-slate-800 text-blue-300">
                {tanksNo1Total.toFixed(3)}
              </td>
              <td className="py-2.5 px-3 text-center border-r border-slate-800 text-cyan-300">
                {tanksNo2Total.toFixed(3)}
              </td>
              <td className="py-2.5 px-3 text-right text-emerald-300">
                {tanksCombined.toFixed(3)}
              </td>
            </tr>

            {/* On Deck Row */}
            <tr className="hover:bg-slate-900/50">
              <td className="py-2 px-3 border-r border-slate-800 font-sans font-medium text-amber-200">
                甲板上部 On Deck
              </td>
              <td className="py-2 px-3 text-center border-r border-slate-800 text-blue-300">
                {onDeckNo1.toFixed(3)}
              </td>
              <td className="py-2 px-3 text-center border-r border-slate-800 text-cyan-300">
                {onDeckNo2.toFixed(3)}
              </td>
              <td className="py-2 px-3 text-right text-amber-300 font-semibold">
                {onDeckCombined.toFixed(3)}
              </td>
            </tr>

            {/* In Pump Room Row */}
            <tr className="hover:bg-slate-900/50 border-b border-slate-800">
              <td className="py-2 px-3 border-r border-slate-800 font-sans font-medium text-purple-200">
                泵舱 In Pump Room
              </td>
              <td className="py-2 px-3 text-center border-r border-slate-800 text-blue-300">
                {pumpRoomNo1.toFixed(3)}
              </td>
              <td className="py-2 px-3 text-center border-r border-slate-800 text-cyan-300">
                {pumpRoomNo2.toFixed(3)}
              </td>
              <td className="py-2 px-3 text-right text-purple-300 font-semibold">
                {pumpRoomCombined.toFixed(3)}
              </td>
            </tr>

            {/* Grand Total Row */}
            <tr className="bg-blue-950/60 font-extrabold border-t-2 border-blue-500/40 text-sm">
              <td className="py-3 px-3 border-r border-slate-800 font-sans text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>全船管线总合计 Grand Total</span>
              </td>
              <td className="py-3 px-3 text-center border-r border-slate-800 text-blue-200">
                {grandNo1.toFixed(3)}
              </td>
              <td className="py-3 px-3 text-center border-r border-slate-800 text-cyan-200">
                {grandNo2.toFixed(3)}
              </td>
              <td className="py-3 px-3 text-right text-amber-300 bg-amber-500/10">
                {grandTotalAll.toFixed(3)} m³
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 px-1">
        <span>* 注: 本表数据提取自国家船舶舱容积计量站 (CRZH) 检定证书第12页《管线容量》</span>
        <span className="font-mono">检定印章 014号</span>
      </div>
    </div>
  );
};
