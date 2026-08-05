import React, { useState } from 'react';
import { Header } from './components/Header';
import { CalculatorView } from './components/CalculatorView';
import { PdfUploadGeneratorView } from './components/PdfUploadGeneratorView';
import { VerificationExampleView } from './components/VerificationExampleView';
import { CertificateViewer } from './components/CertificateViewer';
import { ShipGlobalInput, TankInput, VesselMetadata } from './types/vessel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'pdf' | 'example' | 'certificate'>('calculator');

  // Currently loaded active vessel context (defaults to 東城油17)
  const [activeVesselMeta, setActiveVesselMeta] = useState<VesselMetadata | null>(null);

  // Shared state for transferring parsed input values to calculator
  const [transferredGlobalInput, setTransferredGlobalInput] = useState<ShipGlobalInput | null>(null);
  const [transferredTankInputs, setTransferredTankInputs] = useState<TankInput[] | null>(null);

  const handleApplyVesselToCalculator = (
    vesselMeta: VesselMetadata,
    globalInput?: ShipGlobalInput,
    tankInputs?: TankInput[]
  ) => {
    setActiveVesselMeta(vesselMeta);
    if (globalInput) setTransferredGlobalInput(globalInput);
    if (tankInputs) setTransferredTankInputs(tankInputs);
    setActiveTab('calculator');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Application Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentVesselName={activeVesselMeta?.name}
        currentCertNo={activeVesselMeta?.certificateNo}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'calculator' && (
          <CalculatorView
            customTanks={activeVesselMeta?.tanks}
            customVesselName={activeVesselMeta?.name}
            customCertNo={activeVesselMeta?.certificateNo}
            initialGlobalInput={transferredGlobalInput}
            initialTankInputs={transferredTankInputs}
            onNavigateToPdfUpload={() => setActiveTab('pdf')}
          />
        )}

        {activeTab === 'pdf' && (
          <PdfUploadGeneratorView
            onApplyVesselToCalculator={handleApplyVesselToCalculator}
          />
        )}

        {activeTab === 'example' && (
          <VerificationExampleView vesselMeta={activeVesselMeta} />
        )}

        {activeTab === 'certificate' && (
          <CertificateViewer vesselMeta={activeVesselMeta} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>{activeVesselMeta?.name || '东城油17 (DONG CHENG YOU 17)'} 舱容积计算平台</strong> | {activeVesselMeta?.issuingAuthority || '国家船舶舱容积计量站 (CRZH)'}
          </div>
          <div className="text-slate-500">
            支持 100% 离线计算与舱容表解析、任意舱位(含首尾污油舱)示意图、空气浮力与 VCF 修正
          </div>
        </div>
      </footer>
    </div>
  );
}

