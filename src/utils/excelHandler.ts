import * as XLSX from 'xlsx';
import { TANKS_META, VESSEL_INFO } from '../data/shipData';
import { ShipGlobalInput, TankInput, ShipCalcSummary, ExcelRowData } from '../types/vessel';

/**
 * Generate and download a standard template Excel file
 */
export function downloadExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Global Parameters
  const globalData = [
    ['船舶名称 Vessel', VESSEL_INFO.name, '证书编号 Cert No.', VESSEL_INFO.certificateNo],
    ['艉吃水 Draft Aft (m)', 3.50, '艏吃水 Draft Forward (m)', 2.46],
    ['纵倾 Trim (m)', '=B2-D2', '横倾 List (°)', -0.30],
    ['舱壁温度 Temp (°C)', 35.0, '货油密度 Vacuum Density (kg/m³)', 850.0],
    ['VCF (体积修正)', 1.0000, '空气浮力扣减 Air Buoyancy (kg/m³)', 1.1],
    ['', '', '', ''], // blank line
    ['舱名 (Tank Name)', '舱代码 (Code)', '测量类型 (Type)', '测量数值 (Value in m)'],
  ];

  TANKS_META.forEach(tank => {
    globalData.push([
      tank.name,
      tank.code,
      '实高', // default to 实高 (Sounding)
      3.500, // sample default sounding
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(globalData);

  // Column widths
  ws['!cols'] = [
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '舱容录入表 (Cargo Entry)');

  // Sheet 2: Help & Examples
  const helpData = [
    ['东城油17 舱容自动计算与Excel导入填写说明'],
    ['1. 测量类型: 请填 "实高" (Sounding) 或 "空高" (Ullage)'],
    ['2. 测量数值: 请填米(m)为单位的浮点数，如 3.523'],
    ['3. 纵倾 Trim: 艉吃水(m) - 艏吃水(m)，例如 3.50 - 2.46 = 1.04m'],
    ['4. 横倾 List: 负数表示左倾，正数表示右倾，例如 -0.30 表示左倾0.30°'],
    ['5. 温度 Temp: 摄氏度°C，默认标准温度为 20°C'],
    ['6. 上传后系统将根据检定证书 CRZH V24030537 进行双向双线性插值修正与自动计算'],
  ];

  const helpWs = XLSX.utils.aoa_to_sheet(helpData);
  helpWs['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, helpWs, '填写说明 (Help)');

  XLSX.writeFile(wb, `${VESSEL_INFO.name}_舱容测量录入表模板.xlsx`);
}

/**
 * Fuzzy matcher for tank name/code
 */
export function matchTankId(rawText: string): string | null {
  if (!rawText) return null;
  const clean = String(rawText).trim().toUpperCase().replace(/\s+/g, '');

  for (const tank of TANKS_META) {
    if (tank.id.toUpperCase() === clean) return tank.id;
    if (tank.code.toUpperCase() === clean) return tank.id;
    if (tank.name.toUpperCase().replace(/\s+/g, '').includes(clean)) return tank.id;
    if (clean.includes(tank.code.toUpperCase())) return tank.id;
  }

  // Common Chinese aliases
  if (clean.includes('左1') || clean.includes('1P') || clean.includes('P1')) return 'P1';
  if (clean.includes('右1') || clean.includes('1S') || clean.includes('S1')) return 'S1';
  if (clean.includes('左2') || clean.includes('2P') || clean.includes('P2')) return 'P2';
  if (clean.includes('右2') || clean.includes('2S') || clean.includes('S2')) return 'S2';
  if (clean.includes('左3') || clean.includes('3P') || clean.includes('P3')) return 'P3';
  if (clean.includes('右3') || clean.includes('3S') || clean.includes('S3')) return 'S3';
  if (clean.includes('左4') || clean.includes('4P') || clean.includes('P4')) return 'P4';
  if (clean.includes('右4') || clean.includes('4S') || clean.includes('S4')) return 'S4';
  if (clean.includes('左5') || clean.includes('5P') || clean.includes('P5')) return 'P5';
  if (clean.includes('右5') || clean.includes('5S') || clean.includes('S5')) return 'S5';
  if (clean.includes('左污') || clean.includes('PSLOP') || clean.includes('P.SLOP')) return 'P_SLOP';
  if (clean.includes('右污') || clean.includes('SSLOP') || clean.includes('S.SLOP')) return 'S_SLOP';

  return null;
}

/**
 * Parse uploaded Excel file
 */
export async function parseExcelFile(file: File): Promise<{
  globalInput: ShipGlobalInput;
  tankInputs: TankInput[];
  parsedRows: ExcelRowData[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        let draftAft = 0;
        let draftFwd = 0;
        let trimOverride: number | null = null;
        let list = 0;
        let temp = 20.0;
        let density = 0.85;

        const tankInputsMap: Map<string, TankInput> = new Map();
        const parsedRows: ExcelRowData[] = [];

        // Traverse rows to extract key-values and table rows
        rows.forEach((row, rowIndex) => {
          if (!row || row.length === 0) return;

          const rowStr = row.map(c => String(c ?? '')).join(' ');

          // Extract global parameters
          if (rowStr.includes('艉吃水') || rowStr.includes('Draft Aft')) {
            row.forEach((cell, idx) => {
              const val = parseFloat(String(cell));
              if (!isNaN(val) && val > 0 && val < 20) draftAft = val;
            });
          }

          if (rowStr.includes('艏吃水') || rowStr.includes('Draft Forward')) {
            row.forEach((cell, idx) => {
              const val = parseFloat(String(cell));
              if (!isNaN(val) && val > 0 && val < 20) draftFwd = val;
            });
          }

          if (rowStr.includes('纵倾') || rowStr.includes('Trim')) {
            row.forEach((cell) => {
              const val = parseFloat(String(cell));
              if (!isNaN(val) && val >= -10 && val <= 10) trimOverride = val;
            });
          }

          if (rowStr.includes('横倾') || rowStr.includes('List')) {
            row.forEach((cell) => {
              const val = parseFloat(String(cell));
              if (!isNaN(val) && val >= -10 && val <= 10) list = val;
            });
          }

          if (rowStr.includes('温度') || rowStr.includes('Temp')) {
            row.forEach((cell) => {
              const val = parseFloat(String(cell));
              if (!isNaN(val) && val >= -20 && val <= 150) temp = val;
            });
          }

          if (rowStr.includes('密度') || rowStr.includes('Density')) {
            row.forEach((cell) => {
              const val = parseFloat(String(cell));
              if (!isNaN(val) && val > 0.5 && val < 2.0) density = val;
            });
          }

          // Check if this row is a tank row
          const matchedId = matchTankId(row[0]) || matchTankId(row[1]);
          if (matchedId) {
            const meta = TANKS_META.find(t => t.id === matchedId);
            let typeStr = String(row[2] || row[1] || '实高').trim();
            const isUllage = typeStr.includes('空高') || typeStr.toLowerCase().includes('ullage');
            const type: 'sounding' | 'ullage' = isUllage ? 'ullage' : 'sounding';

            let val = 0;
            for (let c = row.length - 1; c >= 2; c--) {
              const parsedVal = parseFloat(String(row[c]));
              if (!isNaN(parsedVal) && parsedVal >= 0 && parsedVal <= 15) {
                val = parsedVal;
                break;
              }
            }

            tankInputsMap.set(matchedId, {
              tankId: matchedId,
              type,
              value: val,
            });

            parsedRows.push({
              rowNum: rowIndex + 1,
              tankName: meta ? meta.name : matchedId,
              type: isUllage ? '空高' : '实高',
              inputValue: val,
              status: 'ok',
            });
          }
        });

        const globalInput: ShipGlobalInput = {
          draftAft,
          draftForward: draftFwd,
          trimOverride,
          list,
          oilType: '柴油',
          dateStr: new Date().toISOString().slice(0, 10),
          useSteelExpansion: true,
          syncWithFirstTank: true,
          useAirBuoyancy: true,
          airBuoyancyValue: 0.0011,
        };

        const tankInputs: TankInput[] = TANKS_META.map(t => {
          const item = tankInputsMap.get(t.id);
          return {
            tankId: t.id,
            type: item?.type || 'sounding',
            value: item?.value || 0,
            density20C: density > 0 && density < 2 ? density : 0.8500,
            temperature: temp,
            vcf: 1.0000,
            waterVolume: 0.000,
          };
        });

        resolve({ globalInput, tankInputs, parsedRows });
      } catch (err: any) {
        reject(new Error('Excel文件解析失败，请检查文件格式: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('读取Excel文件失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export full calculation results into styled Excel workbook matching "燃油舱计量" sheet
 */
export function exportCalculationResultsExcel(summary: ShipCalcSummary) {
  const wb = XLSX.utils.book_new();

  const exportData: any[][] = [
    [`${summary.vesselName} 燃油舱计量汇总表`],
    [`油品: ${summary.oilType}`, `纵倾: ${summary.trim >= 0 ? '+' : ''}${summary.trim} 米`, `是否算钢膨: ${summary.useSteelExpansion ? '是' : '否'}`, `日期: ${summary.dateStr}`],
    [],
    [
      '舱号',
      '观测高度类型',
      '测量值 (米)',
      '纵/横倾修正后 (米)',
      '20°C标密 (t/m³)',
      '温度 (°C)',
      '观测体积 OBS. VOL (m³)',
      '水高 (米)',
      '明水扣除 (m³)',
      '实际体积 G.O.V (m³)',
      '钢材膨胀系数 TK EXP.',
      '重量修正系数 WCF',
      '体积修正系数 VCF',
      '总标准体积 G.S.V (m³)',
      `净油重量 ${summary.useSteelExpansion ? '(钢膨修正后)' : '(未经钢膨修正)'} (吨)`,
    ],
  ];

  summary.tankResults.forEach((tank) => {
    exportData.push([
      tank.tankName,
      tank.type === 'sounding' ? '实高' : '空高',
      tank.inputValue,
      tank.correctedSounding,
      tank.density20C.toFixed(4),
      tank.temperature.toFixed(1),
      tank.obsVolume,
      tank.waterSounding,
      tank.waterVolume,
      tank.govVolume,
      summary.useSteelExpansion ? tank.tempFactor.toFixed(5) : 'NIL',
      tank.wcfFactor.toFixed(4),
      tank.vcfFactor.toFixed(4),
      tank.gsvVolume,
      tank.weightTon,
    ]);
  });

  exportData.push([]);

  if (summary.pipelineVolume > 0) {
    exportData.push([
      '管线 (Pipeline)',
      '-',
      '-',
      '-',
      summary.pipelineDensity.toFixed(4),
      summary.pipelineTemp.toFixed(1),
      summary.pipelineVolume,
      0,
      0,
      summary.pipelineVolume,
      summary.useSteelExpansion ? summary.pipelineTempFactor.toFixed(5) : 'NIL',
      summary.pipelineWcf.toFixed(4),
      summary.pipelineVcf.toFixed(4),
      summary.pipelineGsv,
      summary.pipelineWeight,
    ]);
  }

  if (summary.bottomRobVolume > 0) {
    exportData.push([
      '底油 (Unpumpable ROB)',
      '-',
      '-',
      '-',
      summary.bottomRobDensity.toFixed(4),
      summary.bottomRobTemp.toFixed(1),
      summary.bottomRobVolume,
      0,
      0,
      summary.bottomRobVolume,
      summary.useSteelExpansion ? summary.bottomRobTempFactor.toFixed(5) : 'NIL',
      summary.bottomRobWcf.toFixed(4),
      summary.bottomRobVcf.toFixed(4),
      summary.bottomRobGsv,
      summary.bottomRobWeight,
    ]);
  }

  exportData.push([
    '总量 (Grand Total)',
    '',
    '',
    '',
    '',
    '',
    summary.totalObsVolume,
    '',
    (summary.totalObsVolume - summary.totalGovVolume).toFixed(3),
    summary.totalVolume,
    '',
    '',
    '',
    summary.totalGsv,
    summary.totalWeight,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 18 }, // 舱号
    { wch: 12 }, // 类型
    { wch: 12 }, // 测量值
    { wch: 18 }, // 修正后
    { wch: 14 }, // 标密
    { wch: 10 }, // 温度
    { wch: 20 }, // OBS VOL
    { wch: 12 }, // 水高
    { wch: 14 }, // 明水扣除
    { wch: 20 }, // GOV
    { wch: 18 }, // TK EXP
    { wch: 18 }, // WCF
    { wch: 18 }, // VCF
    { wch: 20 }, // GSV
    { wch: 24 }, // 净油重量
  ];

  XLSX.utils.book_append_sheet(wb, ws, '燃油舱计量汇总');

  const dateStr = summary.dateStr || new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${summary.vesselName}_燃油舱计量汇总表_${dateStr}.xlsx`);
}

