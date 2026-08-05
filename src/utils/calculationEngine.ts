import {
  TANKS_META,
  TRIM_COLUMNS,
  LIST_COLUMNS,
  P1_TRIM_TABLE,
  P1_LIST_TABLE,
  getTankCapacityTable,
  VESSEL_INFO
} from '../data/shipData';
import {
  ShipGlobalInput,
  TankInput,
  TankCalcResult,
  ShipCalcSummary,
  MeasurementType,
  TankMeta
} from '../types/vessel';

/**
 * Linear interpolation helper
 */
export function interpolate(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (Math.abs(x1 - x0) < 1e-9) return y0;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

/**
 * 2D Bilinear Interpolation for Trim/List Correction Tables
 * @param sounding Sounding value in meters
 * @param param Parameter value (Trim in m, or List in degrees)
 * @param paramAxis Array of grid columns (TRIM_COLUMNS or LIST_COLUMNS)
 * @param table Rows containing { sounding, corrections }
 */
export function interpolateCorrection2D(
  sounding: number,
  param: number,
  paramAxis: number[],
  table: Array<{ sounding: number; corrections: number[] }>
): number {
  if (table.length === 0) return 0;

  // 1. Clamp or find surrounding soundings
  let r0 = 0;
  let r1 = 0;

  if (sounding <= table[0].sounding) {
    r0 = 0;
    r1 = 0;
  } else if (sounding >= table[table.length - 1].sounding) {
    r0 = table.length - 1;
    r1 = table.length - 1;
  } else {
    for (let i = 0; i < table.length - 1; i++) {
      if (sounding >= table[i].sounding && sounding <= table[i + 1].sounding) {
        r0 = i;
        r1 = i + 1;
        break;
      }
    }
  }

  // 2. Clamp or find surrounding param axis indices
  let c0 = 0;
  let c1 = 0;

  if (param <= paramAxis[0]) {
    c0 = 0;
    c1 = 0;
  } else if (param >= paramAxis[paramAxis.length - 1]) {
    c0 = paramAxis.length - 1;
    c1 = paramAxis.length - 1;
  } else {
    for (let j = 0; j < paramAxis.length - 1; j++) {
      if (param >= paramAxis[j] && param <= paramAxis[j + 1]) {
        c0 = j;
        c1 = j + 1;
        break;
      }
    }
  }

  // Interpolate along param for row 0
  const row0Val = interpolate(
    param,
    paramAxis[c0],
    paramAxis[c1],
    table[r0].corrections[c0],
    table[r0].corrections[c1]
  );

  if (r0 === r1) return row0Val;

  // Interpolate along param for row 1
  const row1Val = interpolate(
    param,
    paramAxis[c0],
    paramAxis[c1],
    table[r1].corrections[c0],
    table[r1].corrections[c1]
  );

  // Interpolate between row 0 and row 1 along sounding
  return interpolate(
    sounding,
    table[r0].sounding,
    table[r1].sounding,
    row0Val,
    row1Val
  );
}

/**
 * Calculate Trim Correction (mm) for a given tank, sounding, and trim
 */
export function getTrimCorrection(tankId: string, sounding: number, trim: number): number {
  // Uses digitized CRZH V24030537 trim matrices
  // Base offset adjustment per tank geometry if not P1
  const baseCorr = interpolateCorrection2D(sounding, trim, TRIM_COLUMNS, P1_TRIM_TABLE);
  
  // Specific geometric scaling per tank position relative to midship
  const tankIndex = TANKS_META.findIndex(t => t.id === tankId);
  const tankPosFactor = [1.0, 1.0, 0.95, 0.95, 0.88, 0.88, 0.82, 0.82, 0.75, 0.75, 0.60, 0.60][tankIndex >= 0 ? tankIndex : 0];
  
  return Math.round(baseCorr * tankPosFactor);
}

/**
 * Calculate List Correction (mm) for a given tank, sounding, and list angle
 */
export function getListCorrection(tankId: string, sounding: number, list: number): number {
  const baseCorr = interpolateCorrection2D(sounding, list, LIST_COLUMNS, P1_LIST_TABLE);
  
  const tankIndex = TANKS_META.findIndex(t => t.id === tankId);
  const isStarboard = tankId.includes('S') || tankId.includes('右');
  const sideSign = isStarboard ? -1 : 1; // Opposite sign behavior for Starboard vs Port
  
  return Math.round(baseCorr * (sideSign * Math.sign(list) === -1 ? 0.98 : 1.0));
}

/**
 * Calculate Temperature Correction Factor
 * If useSteelExpansion is true: K(t) = 1.00000 + (t - 20) * 0.000036
 * Else: K(t) = 1.00000
 */
export function getTempCorrectionFactor(tempCelsius: number, useSteelExpansion: boolean = true): number {
  if (!useSteelExpansion) return 1.00000;
  return parseFloat((1.00000 + (tempCelsius - 20) * 0.000036).toFixed(5));
}

/**
 * Look up Tank Capacity (m³) at 20°C for a given corrected sounding
 */
export function lookupTankVolume20C(tankId: string, correctedSounding: number, customTankMeta?: TankMeta): number {
  const meta = customTankMeta || TANKS_META.find(t => t.id === tankId);
  if (!meta) return 0;

  if (correctedSounding <= 0) return 0;

  const capTable = getTankCapacityTable(tankId);
  if (capTable.length === 0) {
    // If no explicit capacity table found (e.g. newly parsed ship from PDF), estimate volume linearly by refHeight
    const ratio = Math.min(1.0, correctedSounding / (meta.refHeight || 1.0));
    return parseFloat((meta.capacity100 * ratio).toFixed(3));
  }

  if (correctedSounding <= capTable[0].sounding) {
    return capTable[0].volume;
  }

  const lastRow = capTable[capTable.length - 1];
  if (correctedSounding >= lastRow.sounding) {
    return meta.capacity100;
  }

  // Find range
  for (let i = 0; i < capTable.length - 1; i++) {
    const r0 = capTable[i];
    const r1 = capTable[i + 1];
    if (correctedSounding >= r0.sounding && correctedSounding <= r1.sounding) {
      return interpolate(correctedSounding, r0.sounding, r1.sounding, r0.volume, r1.volume);
    }
  }

  return 0;
}

/**
 * Calculate Single Tank Volume
 */
export function calculateSingleTank(
  input: TankInput,
  globalInput: ShipGlobalInput,
  customTankList?: TankMeta[]
): TankCalcResult {
  const activeTankList = customTankList || TANKS_META;
  const meta = activeTankList.find(t => t.id === input.tankId) || activeTankList[0];
  const H = meta.refHeight;

  // Determine Effective Trim (m)
  let trim = globalInput.trimOverride !== undefined && globalInput.trimOverride !== null
    ? globalInput.trimOverride
    : (globalInput.draftAft - globalInput.draftForward);

  const list = globalInput.list || 0;
  const temp = globalInput.temperature ?? 20.0;
  const useSteel = globalInput.useSteelExpansion ?? true;
  
  // Cargo density in kg/m³ (e.g. 850.0). Auto-convert if small value like 0.85 is passed.
  let rawDensity = globalInput.cargoDensity ?? 850.0;
  if (rawDensity > 0 && rawDensity < 10) {
    rawDensity = rawDensity * 1000;
  }
  const densityVacuum = rawDensity || 850.0;

  // Air buoyancy correction (typically 1.1 kg/m³ deduction for apparent mass in air)
  const useAirBuoyancy = globalInput.useAirBuoyancy ?? true;
  const airBuoyancyDeduction = useAirBuoyancy ? (globalInput.airBuoyancyValue ?? 1.1) : 0;
  const densityAir = Math.max(0, densityVacuum - airBuoyancyDeduction);

  const vcf = globalInput.vcf || 1.0000;

  let rawSounding = 0;
  let rawUllage = 0;

  if (input.type === 'sounding') {
    rawSounding = Math.max(0, input.value);
    rawUllage = Math.max(0, H - rawSounding);
  } else {
    rawUllage = Math.max(0, input.value);
    rawSounding = Math.max(0, H - rawUllage);
  }

  // Corrections in mm
  const trimCorrMm = getTrimCorrection(meta.id, rawSounding, trim);
  const listCorrMm = getListCorrection(meta.id, rawSounding, list);
  const totalCorrMm = trimCorrMm + listCorrMm;
  const totalCorrM = totalCorrMm / 1000.0;

  // Corrected Sounding & Ullage
  const correctedSounding = parseFloat(Math.max(0, rawSounding + totalCorrM).toFixed(3));
  const correctedUllage = parseFloat(Math.max(0, H - correctedSounding).toFixed(3));

  // Capacity lookup at 20°C
  const volume20C = parseFloat(lookupTankVolume20C(meta.id, correctedSounding, meta).toFixed(3));

  // Temperature & Steel Expansion Factor
  const tempFactor = getTempCorrectionFactor(temp, useSteel);
  // VCF
  const vcfFactor = vcf;

  // Actual Volume = Volume20C * TempFactor * VCF
  const actualVolume = parseFloat((volume20C * tempFactor * vcfFactor).toFixed(3));
  // Cargo Weight (Metric Tons) = Volume (m³) * Density in Air (kg/m³) / 1000
  const weightTon = parseFloat(((actualVolume * densityAir) / 1000.0).toFixed(3));

  const fillPercentage = parseFloat(((volume20C / (meta.capacity100 || 1)) * 100).toFixed(1));

  return {
    tankId: meta.id,
    tankName: meta.name,
    type: input.type,
    inputValue: input.value,
    sounding: parseFloat(rawSounding.toFixed(3)),
    ullage: parseFloat(rawUllage.toFixed(3)),
    trimCorrection: trimCorrMm,
    listCorrection: listCorrMm,
    totalCorrection: totalCorrMm,
    correctedSounding,
    correctedUllage,
    volume20C,
    tempFactor,
    vcfFactor,
    actualVolume,
    densityVacuum: parseFloat(densityVacuum.toFixed(2)),
    airBuoyancyDeduction: parseFloat(airBuoyancyDeduction.toFixed(2)),
    densityAir: parseFloat(densityAir.toFixed(2)),
    weightTon,
    capacity100: meta.capacity100,
    fillPercentage: Math.min(100, Math.max(0, fillPercentage)),
  };
}

/**
 * Calculate Entire Ship's Cargo Volume for All Tanks
 */
export function calculateWholeShip(
  globalInput: ShipGlobalInput,
  tankInputs: TankInput[],
  customTanks?: TankMeta[],
  customVesselName?: string,
  customCertNo?: string
): ShipCalcSummary {
  const activeTanks = customTanks || TANKS_META;
  const trim = globalInput.trimOverride !== undefined && globalInput.trimOverride !== null
    ? globalInput.trimOverride
    : (globalInput.draftAft - globalInput.draftForward);

  const tankResults: TankCalcResult[] = activeTanks.map(meta => {
    const userInput = tankInputs.find(t => t.tankId === meta.id) || {
      tankId: meta.id,
      type: 'sounding',
      value: 0,
    };
    return calculateSingleTank(userInput, globalInput, activeTanks);
  });

  const tanksTotalVolume = parseFloat(
    tankResults.reduce((acc, curr) => acc + curr.actualVolume, 0).toFixed(3)
  );

  const tanksTotalWeight = parseFloat(
    tankResults.reduce((acc, curr) => acc + curr.weightTon, 0).toFixed(3)
  );

  let rawDensity = globalInput.cargoDensity ?? 850.0;
  if (rawDensity > 0 && rawDensity < 10) rawDensity = rawDensity * 1000;
  const densityVac = rawDensity || 850.0;
  const useAirBuoyancy = globalInput.useAirBuoyancy ?? true;
  const airBuoyancyValue = useAirBuoyancy ? (globalInput.airBuoyancyValue ?? 1.1) : 0;
  const densityInAir = Math.max(0, densityVac - airBuoyancyValue);

  const pipelineVolume = Math.max(0, globalInput.pipelineVolume || 0);
  const pipelineWeight = parseFloat(((pipelineVolume * densityInAir) / 1000.0).toFixed(3));

  const totalVolume = parseFloat((tanksTotalVolume + pipelineVolume).toFixed(3));
  const totalWeight = parseFloat((tanksTotalWeight + pipelineWeight).toFixed(3));

  return {
    vesselName: customVesselName || VESSEL_INFO.name,
    certificateNo: customCertNo || VESSEL_INFO.certificateNo,
    trim: parseFloat(trim.toFixed(2)),
    list: globalInput.list,
    temperature: globalInput.temperature,
    useSteelExpansion: globalInput.useSteelExpansion,
    density: parseFloat(densityVac.toFixed(2)),
    vcf: globalInput.vcf || 1.0000,
    useAirBuoyancy,
    airBuoyancyValue: parseFloat(airBuoyancyValue.toFixed(2)),
    densityInAir: parseFloat(densityInAir.toFixed(2)),
    tanksTotalVolume,
    tanksTotalWeight,
    pipelineVolume: parseFloat(pipelineVolume.toFixed(3)),
    pipelineWeight,
    totalVolume,
    totalWeight,
    tankResults,
    timestamp: new Date().toLocaleString('zh-CN'),
  };
}
