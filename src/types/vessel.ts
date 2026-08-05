export type MeasurementType = 'sounding' | 'ullage';

export interface ExcelRowData {
  tankId?: string;
  tankName?: string;
  type?: string;
  value?: number;
  rowNum?: number;
  status?: string;
  inputValue?: number;
}


export interface TankMeta {
  id: string;
  name: string; // e.g. "左.1 P.1"
  code: string; // e.g. "P1"
  refHeight: number; // 基准高度 H (m) e.g. 8.960
  zeroUllageRef: number; // 空高零基准点 h (mm) e.g. 760
  capacity100: number; // 100%容量 (m³)
  capacity98: number; // 98%容量 (m³)
  capacity95: number; // 95%容量 (m³)
  pipeLineNo1?: number; // 管线容量1
  pipeLineNo2?: number; // 管线容量2
  position?: 'port' | 'starboard' | 'center' | 'slop' | 'bow_slop' | 'bow'; // 舱位类型，支持首部污油舱
}

export interface VesselMetadata {
  name: string;
  englishName: string;
  certificateNo: string;
  validPeriod: string;
  issuingAuthority: string;
  tankCount: number;
  tanks: TankMeta[];
}

export interface TankInput {
  tankId: string;
  type: MeasurementType;
  value: number; // 实高或空高数值 (m)
}

export interface ShipGlobalInput {
  draftAft: number; // 艉吃水 (m)
  draftForward: number; // 艏吃水 (m)
  trimOverride?: number | null; // 手动指定纵倾 (m) - 若为空则用 Aft - Forward
  list: number; // 横倾 (度, 负数为左倾, 正数为右倾)
  temperature: number; // 舱壁温度 (°C), 默认 20.0
  useSteelExpansion: boolean; // 是否使用钢膨修正，默认 true
  cargoDensity: number; // 货油密度 (kg/m³ @ 20°C/15°C), 默认 850.0
  vcf: number; // 体积修正系数 VCF, 默认 1.0000
  useAirBuoyancy: boolean; // 是否进行空气浮力修正，默认 true
  airBuoyancyValue: number; // 空气浮力扣除值 (kg/m³), 默认 1.1 kg/m³
  pipelineVolume?: number; // 管线容积 (m³), 默认 0
}

export interface TankCalcResult {
  tankId: string;
  tankName: string;
  type: MeasurementType;
  inputValue: number; // 原始实高/空高 (m)
  sounding: number; // 换算得到的实高 (m)
  ullage: number; // 换算得到的空高 (m)
  trimCorrection: number; // 纵倾修正值 (mm)
  listCorrection: number; // 横倾修正值 (mm)
  totalCorrection: number; // 合计修正值 (mm)
  correctedSounding: number; // 修正后实高 (m)
  correctedUllage: number; // 修正后空高 (m)
  volume20C: number; // 20°C标准容量 (m³)
  tempFactor: number; // 温度/钢膨修正系数
  vcfFactor: number; // VCF系数
  actualVolume: number; // 实际货物容积 (m³)
  densityVacuum: number; // 真空密度 (kg/m³)
  airBuoyancyDeduction: number; // 空气浮力修正扣减 (kg/m³)
  densityAir: number; // 空气中视密度 (kg/m³)
  weightTon: number; // 货物重量 (t)
  capacity100: number; // 100%总容量
  fillPercentage: number; // 舱容充满率 (%)
}

export interface ShipCalcSummary {
  vesselName: string;
  certificateNo: string;
  trim: number; // 纵倾 (m)
  list: number; // 横倾 (°)
  temperature: number; // 温度 (°C)
  useSteelExpansion: boolean;
  density: number; // 真空密度 (kg/m³)
  vcf: number; // VCF
  useAirBuoyancy: boolean;
  airBuoyancyValue: number; // 空气浮力扣减值 (kg/m³)
  densityInAir: number; // 空气中密度 (kg/m³)
  tanksTotalVolume: number; // 各舱容积小计 (m³)
  tanksTotalWeight: number; // 各舱重量小计 (t)
  pipelineVolume: number; // 管线容积 (m³)
  pipelineWeight: number; // 管线重量 (t)
  totalVolume: number; // 货油总容积 (m³ = 舱容积 + 管线容积)
  totalWeight: number; // 货油总重量 (t = 舱重量 + 管线重量)
  tankResults: TankCalcResult[];
  timestamp: string;
}

