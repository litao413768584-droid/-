import React, { useState } from 'react';
import { downloadExcelTemplate, parseExcelFile, exportCalculationResultsExcel } from '../utils/excelHandler';
import { calculateWholeShip } from '../utils/calculationEngine';
import { ShipGlobalInput, TankInput, ShipCalcSummary, ExcelRowData } from '../types/vessel';
import { VESSEL_INFO } from '../data/shipData';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileCheck,
  RefreshCw,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface ExcelImportExportViewProps {
  onLoadIntoCalculator?: (globalInput: ShipGlobalInput, tankInputs: TankInput[]) => void;
}

export const ExcelImportExportView: React.FC<ExcelImportExportViewProps> = ({
  onLoadIntoCalculator,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<{
    globalInput: ShipGlobalInput;
    tankInputs: TankInput[];
    parsedRows: ExcelRowData[];
  } | null>(null);

  const [calcSummary, setCalcSummary] = useState<ShipCalcSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMessage('请上传 Excel 格式文件 (.xlsx 或 .xls)');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const parsed = await parseExcelFile(file);
      setParsedData(parsed);

      // Immediately run calculation
      const summary = calculateWholeShip(parsed.globalInput, parsed.tankInputs);
      setCalcSummary(summary);
    } catch (err: any) {
      setErrorMessage(err.message || '文件解析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Explanation Banner: How Excel Upload & Auto Parsing Works */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-xl p-6 text-white shadow-md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30 flex-shrink-0">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>怎样上传 XLSX 表格并实现自动解析数据？</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-normal px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                支持 .xlsx / .xls
              </span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              本系统内置了前端智能 SheetJS 引擎与东城油17 (V24030537) 官方数智化计算模型。您可以直接上传带有吃水、横倾、舱壁温度及各舱实高(空高)的 Excel 表格，系统将自动识别数据、执行双向双线性插值修正，并一键填入表格计算出每仓的实际货物容积！
            </p>

            {/* Step-by-step workflow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700/60">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center border border-blue-400/40 flex-shrink-0">
                  1
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">下载模板或准备文件</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    可下载下方标准模板或直接使用您的抄表 Excel 表格。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center border border-emerald-400/40 flex-shrink-0">
                  2
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">拖拽上传自动解析</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    拖入文件后，系统自动智能模糊匹配舱名与测量数值。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center border border-amber-400/40 flex-shrink-0">
                  3
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">自动计算与报告导出</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    根据 CRZH 检定规则计算容积，支持一键导出算大结果。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2">
              <button
                onClick={downloadExcelTemplate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>下载标准《东城油17_舱容测量录入表模板.xlsx》</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-400 bg-blue-950/40 scale-[1.01]'
            : 'border-slate-700 hover:border-blue-500 bg-slate-900/80 hover:bg-slate-900'
        }`}
      >
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
          className="hidden"
          id="excel-upload-input"
        />

        <label htmlFor="excel-upload-input" className="cursor-pointer flex flex-col items-center">
          <div className="p-4 bg-slate-800 rounded-full text-blue-400 mb-3 shadow-inner">
            {loading ? (
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-base font-bold text-white">
            {loading ? '正在解析 Excel 表格...' : '点击选择或将 Excel 表格拖拽到此处'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            支持标准格式的 .xlsx 文件。上传后将自动提取吃水/纵倾、横倾、温度及各舱实高/空高，并自动套用《东城油17》检定证书容量表计算容积。
          </p>
        </label>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Parsed Results Section */}
      {parsedData && calcSummary && (
        <div className="space-y-6">
          
          {/* Parsed Header summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Excel 数据解析与全舱自动计算完成！
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                成功识别 {parsedData.parsedRows.length} 个舱的数据与航次参数，各仓容积计算结果如下：
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onLoadIntoCalculator && (
                <button
                  onClick={() => onLoadIntoCalculator(parsedData.globalInput, parsedData.tankInputs)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>同步至交互计算器</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => exportCalculationResultsExcel(calcSummary)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>导出结果 Excel 报告</span>
              </button>
            </div>
          </div>

          {/* Global Parameters Extracted from Excel */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-white">
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>提取到的航向姿态与环境参数 (Extracted Parameters)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">艉吃水</span>
                <span className="font-mono font-bold text-blue-300 text-sm">{parsedData.globalInput.draftAft} m</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">艏吃水</span>
                <span className="font-mono font-bold text-blue-300 text-sm">{parsedData.globalInput.draftForward} m</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">计算纵倾 Trim</span>
                <span className="font-mono font-bold text-blue-200 text-sm">{calcSummary.trim} m</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">横倾 List</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">{calcSummary.list}°</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">舱壁温度 Temp</span>
                <span className="font-mono font-bold text-amber-300 text-sm">{calcSummary.temperature} °C</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">货油密度 Density</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">{calcSummary.density} t/m³</span>
              </div>
            </div>
          </div>

          {/* Calculated Output Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md overflow-hidden">
            <h4 className="text-sm font-bold text-white mb-3">
              自动算得每仓货物容积与重量明细 (Computed Tank Capacities)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">舱名</th>
                    <th className="py-3 px-2">类型</th>
                    <th className="py-3 px-2 text-right">解析录入值 (m)</th>
                    <th className="py-3 px-2 text-right">纵倾修正 (mm)</th>
                    <th className="py-3 px-2 text-right">横倾修正 (mm)</th>
                    <th className="py-3 px-2 text-right">修正后实高 (m)</th>
                    <th className="py-3 px-2 text-right">20°C容量 (m³)</th>
                    <th className="py-3 px-2 text-right">温度系数 K</th>
                    <th className="py-3 px-3 text-right text-blue-300 font-bold">实际容积 (m³)</th>
                    <th className="py-3 px-3 text-right text-emerald-300 font-bold">估算重量 (t)</th>
                    <th className="py-3 px-2 text-right">充满率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                  {calcSummary.tankResults.map(tank => (
                    <tr key={tank.tankId} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-sans font-medium text-white">
                        {tank.tankName}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-300">
                          {tank.type === 'sounding' ? '实高' : '空高'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-white">
                        {tank.inputValue.toFixed(3)}
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
                      <td className="py-2.5 px-3 text-right font-bold text-blue-300 text-sm bg-blue-500/10">
                        {tank.actualVolume.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-300 text-sm bg-emerald-500/10">
                        {tank.weightTon.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-blue-300">
                        {tank.fillPercentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-bold border-t-2 border-slate-700 text-white text-xs">
                    <td colSpan={8} className="py-3 px-3 text-right font-sans">
                      全舱自动计算合计 (Total):
                    </td>
                    <td className="py-3 px-3 text-right text-blue-300 text-base font-mono bg-blue-500/20">
                      {calcSummary.totalVolume.toFixed(3)} m³
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300 text-base font-mono bg-emerald-500/20">
                      {calcSummary.totalWeight.toFixed(3)} t
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      {((calcSummary.totalVolume / VESSEL_INFO.totalCapacity100) * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
