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
  density20C?: number; // 20°C标密 (t/m³ 或 kg/L, e.g. 0.8500 或 0.9000)
  temperature?: number; // 舱温 (°C, e.g. 20.0, 60.0)
  vcf?: number; // 体积修正系数 VCF (e.g. 0.9689, 1.0000)
  waterSounding?: number; // 测得的水高 (m, 默认 0.000)
  waterVolume?: number; // 明水/水份扣除 (m³, 根据水高或自动计算)
}

export interface ShipGlobalInput {
  draftAft: number; // 艉吃水 (m)
  draftForward: number; // 艏吃水 (m)
  trimOverride?: number | null; // 手动指定纵倾 (m) - 若为空则用 Aft - Forward
  list: number; // 横倾 (度, 负数为左倾, 正数为右倾)
  oilType?: string; // 油品名称 (e.g. "柴油")
  dateStr?: string; // 计量日期
  useSteelExpansion: boolean; // 是否算钢膨，默认 true
  syncWithFirstTank: boolean; // 体积/密度修正系数配置: 是否全部与第一个舱一样 (true) 还是每个舱不同 (false)
  useAirBuoyancy: boolean; // 重量修正系数是否扣除空气浮力，默认 true
  airBuoyancyValue: number; // 空气浮力扣除值 (t/m³ 或 kg/m³), 默认 0.0011 t/m³ (1.1 kg/m³)
  pipelineVolume?: number; // 管线容积 (m³), 默认 0
  pipelineDensity?: number; // 管线 20°C标密 (t/m³)
  pipelineTemp?: number; // 管线温度 (°C)
  pipelineVcf?: number; // 管线 VCF
  bottomRobVolume?: number; // 底油容积 (m³), 默认 0
  bottomRobDensity?: number; // 底油 20°C标密 (t/m³)
  bottomRobTemp?: number; // 底油温度 (°C)
  bottomRobVcf?: number; // 底油 VCF
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
  correctedSounding: number; // 修正后实高/横倾纵倾修正后高度 (m)
  correctedUllage: number; // 修正后空高 (m)
  waterSounding: number; // 测得的水高 (m)
  correctedWaterSounding: number; // 修正后水高 (m)
  density20C: number; // 20°C标密 (t/m³) e.g. 0.9000
  temperature: number; // 舱壁温度 (°C) e.g. 60.0
  obsVolume: number; // 观测体积 OBS. VOL. (m³)
  waterVolume: number; // 明水净高/吃水差修正扣水 (m³)
  govVolume: number; // 实际体积 G.O.V. (m³) = OBS.VOL - Water
  tempFactor: number; // 钢材膨胀系数 TK EXP. CORP (1 + (t-20)*0.000036)
  wcfFactor: number; // 重量修正系数 WCF = Density20C - AirBuoyancy (0.0011)
  vcfFactor: number; // 体积修正系数 VCF
  gsvVolume: number; // 总标准体积 G.S.V. (m³) = G.O.V * VCF
  weightTon: number; // 净油重量 钢膨修正后 (t) = G.S.V * WCF * TempFactor (若算钢膨)
  capacity100: number; // 100%总容量
  fillPercentage: number; // 舱容充满率 (%)
}

export interface ShipCalcSummary {
  vesselName: string;
  certificateNo: string;
  oilType: string;
  dateStr: string;
  trim: number; // 纵倾 (m)
  list: number; // 横倾 (°)
  useSteelExpansion: boolean;
  syncWithFirstTank: boolean;
  totalObsVolume: number; // 总观测体积 OBS. VOL (m³)
  totalGovVolume: number; // 实际体积 G.O.V 小计 (m³)
  totalGsvVolume: number; // 净油标准体积 G.S.V 小计 (m³)
  tanksTotalVolume: number; // 各舱 G.O.V 小计 (m³)
  tanksTotalWeight: number; // 各舱重量小计 (t)
  pipelineVolume: number; // 管线容积 (m³)
  pipelineDensity: number; // 管线标密 (t/m³)
  pipelineTemp: number; // 管线温度 (°C)
  pipelineTempFactor: number; // 管线钢膨系数
  pipelineWcf: number; // 管线 WCF
  pipelineVcf: number; // 管线 VCF
  pipelineGsv: number; // 管线 GSV (m³)
  pipelineWeight: number; // 管线重量 (t)
  bottomRobVolume: number; // 底油容积 (m³)
  bottomRobDensity: number; // 底油标密 (t/m³)
  bottomRobTemp: number; // 底油温度 (°C)
  bottomRobTempFactor: number; // 底油钢膨系数
  bottomRobWcf: number; // 底油 WCF
  bottomRobVcf: number; // 底油 VCF
  bottomRobGsv: number; // 底油 GSV (m³)
  bottomRobWeight: number; // 底油重量 (t)
  totalVolume: number; // 货油总实际体积 G.O.V (m³)
  totalGsv: number; // 货油总标准体积 G.S.V (m³)
  totalWeight: number; // 货油总净重 (t)
  tankResults: TankCalcResult[];
  timestamp: string;
}


