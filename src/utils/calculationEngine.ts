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
 * Calculate Single Tank Volume and Weight
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
  const temp = input.temperature ?? 20.0;
  const useSteel = globalInput.useSteelExpansion ?? true;
  
  // Density in t/m³ (e.g. 0.8500 or 0.9000)
  let rawDensity = input.density20C ?? 0.8500;
  if (rawDensity > 10) {
    rawDensity = rawDensity / 1000.0; // convert kg/m³ to t/m³ if needed
  }
  const density20C = rawDensity > 0 ? rawDensity : 0.8500;

  // Air buoyancy value in t/m³ (default 0.0011 t/m³)
  const useAirBuoyancy = globalInput.useAirBuoyancy ?? true;
  let rawBuoyancy = globalInput.airBuoyancyValue ?? 0.0011;
  if (rawBuoyancy > 0.1) {
    rawBuoyancy = rawBuoyancy / 1000.0; // convert 1.1 kg/m³ to 0.0011 t/m³
  }
  const airBuoyancy = useAirBuoyancy ? rawBuoyancy : 0;

  // Weight Correction Factor (WCF) = Density20C - AirBuoyancy
  const wcfFactor = parseFloat(Math.max(0, density20C - airBuoyancy).toFixed(4));

  const vcfFactor = input.vcf ?? 1.0000;

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

  // Capacity lookup at 20°C (Observed Volume)
  const obsVolume = parseFloat(lookupTankVolume20C(meta.id, correctedSounding, meta).toFixed(3));

  // Water sounding calculation & table lookup
  const rawWaterSounding = Math.max(0, input.waterSounding || 0);
  let correctedWaterSounding = 0;
  let waterVolume = 0;

  if (rawWaterSounding > 0) {
    const waterTrimCorrMm = getTrimCorrection(meta.id, rawWaterSounding, trim);
    const waterListCorrMm = getListCorrection(meta.id, rawWaterSounding, list);
    correctedWaterSounding = parseFloat(Math.max(0, rawWaterSounding + (waterTrimCorrMm + waterListCorrMm) / 1000.0).toFixed(3));
    waterVolume = parseFloat(lookupTankVolume20C(meta.id, correctedWaterSounding, meta).toFixed(3));
  } else {
    waterVolume = parseFloat((input.waterVolume || 0).toFixed(3));
  }

  const govVolume = parseFloat(Math.max(0, obsVolume - waterVolume).toFixed(3));

  // Temperature & Steel Expansion Factor
  const tempFactor = getTempCorrectionFactor(temp, useSteel);

  // Gross Standard Volume (G.S.V.) = G.O.V. * VCF
  const gsvVolume = parseFloat((govVolume * vcfFactor).toFixed(3));

  // Net Oil Weight (Metric Tons) = G.S.V. * WCF * (SteelExpansionFactor if enabled else 1.0)
  const steelMultiplier = useSteel ? tempFactor : 1.0;
  const weightTon = parseFloat((gsvVolume * wcfFactor * steelMultiplier).toFixed(3));

  const fillPercentage = parseFloat(((obsVolume / (meta.capacity100 || 1)) * 100).toFixed(1));

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
    waterSounding: rawWaterSounding,
    correctedWaterSounding,
    density20C: parseFloat(density20C.toFixed(4)),
    temperature: temp,
    obsVolume,
    waterVolume,
    govVolume,
    tempFactor,
    wcfFactor,
    vcfFactor,
    gsvVolume,
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

  const syncFirst = globalInput.syncWithFirstTank ?? true;
  const firstInput = tankInputs[0];
  const firstDensity = firstInput?.density20C ?? 0.8500;
  const firstTemp = firstInput?.temperature ?? 20.0;
  const firstVcf = firstInput?.vcf ?? 1.0000;

  const effectiveInputs = tankInputs.map((t, idx) => {
    if (syncFirst && idx > 0) {
      return {
        ...t,
        density20C: firstDensity,
        temperature: firstTemp,
        vcf: firstVcf,
      };
    }
    return t;
  });

  const tankResults: TankCalcResult[] = activeTanks.map(meta => {
    const userInput = effectiveInputs.find(t => t.tankId === meta.id) || {
      tankId: meta.id,
      type: 'sounding',
      value: 0,
      density20C: firstDensity,
      temperature: firstTemp,
      vcf: firstVcf,
    };
    return calculateSingleTank(userInput, globalInput, activeTanks);
  });

  const totalObsVolume = parseFloat(
    tankResults.reduce((acc, curr) => acc + curr.obsVolume, 0).toFixed(3)
  );

  const totalGovVolume = parseFloat(
    tankResults.reduce((acc, curr) => acc + curr.govVolume, 0).toFixed(3)
  );

  const totalGsvVolume = parseFloat(
    tankResults.reduce((acc, curr) => acc + curr.gsvVolume, 0).toFixed(3)
  );

  const tanksTotalWeight = parseFloat(
    tankResults.reduce((acc, curr) => acc + curr.weightTon, 0).toFixed(3)
  );

  // WCF, VCF, TempFactor for pipeline and bottom ROB
  let rawBuoyancy = globalInput.airBuoyancyValue ?? 0.0011;
  if (rawBuoyancy > 0.1) rawBuoyancy = rawBuoyancy / 1000.0;

  // Pipeline calculations
  const pipelineDensity = globalInput.pipelineDensity ?? (syncFirst ? firstDensity : 0.8500);
  const pipelineTemp = globalInput.pipelineTemp ?? (syncFirst ? firstTemp : 20.0);
  const pipelineVcf = globalInput.pipelineVcf ?? (syncFirst ? firstVcf : 1.0000);
  const pipelineWcf = Math.max(0, pipelineDensity - rawBuoyancy);
  const pipelineTempFactor = getTempCorrectionFactor(pipelineTemp, globalInput.useSteelExpansion ?? true);
  const pipeSteelMultiplier = (globalInput.useSteelExpansion ?? true) ? pipelineTempFactor : 1.0;

  const pipelineVolume = Math.max(0, globalInput.pipelineVolume || 0);
  const pipelineGsv = parseFloat((pipelineVolume * pipelineVcf).toFixed(3));
  const pipelineWeight = parseFloat((pipelineGsv * pipelineWcf * pipeSteelMultiplier).toFixed(3));

  // Bottom ROB calculations
  const bottomRobDensity = globalInput.bottomRobDensity ?? (syncFirst ? firstDensity : 0.8500);
  const bottomRobTemp = globalInput.bottomRobTemp ?? (syncFirst ? firstTemp : 20.0);
  const bottomRobVcf = globalInput.bottomRobVcf ?? (syncFirst ? firstVcf : 1.0000);
  const bottomRobWcf = Math.max(0, bottomRobDensity - rawBuoyancy);
  const bottomRobTempFactor = getTempCorrectionFactor(bottomRobTemp, globalInput.useSteelExpansion ?? true);
  const robSteelMultiplier = (globalInput.useSteelExpansion ?? true) ? bottomRobTempFactor : 1.0;

  const bottomRobVolume = Math.max(0, globalInput.bottomRobVolume || 0);
  const bottomRobGsv = parseFloat((bottomRobVolume * bottomRobVcf).toFixed(3));
  const bottomRobWeight = parseFloat((bottomRobGsv * bottomRobWcf * robSteelMultiplier).toFixed(3));

  const totalVolume = parseFloat((totalGovVolume + pipelineVolume + bottomRobVolume).toFixed(3));
  const totalGsv = parseFloat((totalGsvVolume + pipelineGsv + bottomRobGsv).toFixed(3));
  const totalWeight = parseFloat((tanksTotalWeight + pipelineWeight + bottomRobWeight).toFixed(3));

  return {
    vesselName: customVesselName || VESSEL_INFO.name,
    certificateNo: customCertNo || VESSEL_INFO.certificateNo,
    oilType: globalInput.oilType || '柴油',
    dateStr: globalInput.dateStr || new Date().toISOString().slice(0, 10),
    trim: parseFloat(trim.toFixed(2)),
    list: globalInput.list,
    useSteelExpansion: globalInput.useSteelExpansion ?? true,
    syncWithFirstTank: syncFirst,
    totalObsVolume,
    totalGovVolume,
    totalGsvVolume,
    tanksTotalVolume: totalGovVolume,
    tanksTotalWeight,
    pipelineVolume: parseFloat(pipelineVolume.toFixed(3)),
    pipelineDensity: parseFloat(pipelineDensity.toFixed(4)),
    pipelineTemp: parseFloat(pipelineTemp.toFixed(1)),
    pipelineTempFactor: parseFloat(pipelineTempFactor.toFixed(5)),
    pipelineWcf: parseFloat(pipelineWcf.toFixed(4)),
    pipelineVcf: parseFloat(pipelineVcf.toFixed(4)),
    pipelineGsv,
    pipelineWeight,
    bottomRobVolume: parseFloat(bottomRobVolume.toFixed(3)),
    bottomRobDensity: parseFloat(bottomRobDensity.toFixed(4)),
    bottomRobTemp: parseFloat(bottomRobTemp.toFixed(1)),
    bottomRobTempFactor: parseFloat(bottomRobTempFactor.toFixed(5)),
    bottomRobWcf: parseFloat(bottomRobWcf.toFixed(4)),
    bottomRobVcf: parseFloat(bottomRobVcf.toFixed(4)),
    bottomRobGsv,
    bottomRobWeight,
    totalVolume,
    totalGsv,
    totalWeight,
    tankResults,
    timestamp: new Date().toLocaleString('zh-CN'),
  };
}

