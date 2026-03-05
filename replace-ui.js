const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/renderer/src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Add Imports
const imports = `
import { Stepper, StepInfo } from './components/Stepper';
import { ActionLogs } from './components/ActionLogs';
import { SetupStep } from './components/steps/SetupStep';
import { ScrapeStep } from './components/steps/ScrapeStep';
import { SyncStep } from './components/steps/SyncStep';
import { AutomationStep } from './components/steps/AutomationStep';

const WIZARD_STEPS: StepInfo[] = [
  { id: 1, label: 'Setup & Auth' },
  { id: 2, label: 'Scrape Tester' },
  { id: 3, label: 'Sync Manager' },
  { id: 4, label: 'Auto-Pilot' },
];
`;

content = content.replace("type SyncStatus = 'pending' | 'syncing' | 'success' | 'failed'", "type SyncStatus = 'pending' | 'syncing' | 'success' | 'failed'\n" + imports);

// 2. Add State Hook
content = content.replace("// Phase 6 States", "// Wizard State\n  const [currentStep, setCurrentStep] = useState<number>(1);\n\n  // Phase 6 States");

// 3. Replace return block
const returnIndex = content.indexOf('  return (');
if (returnIndex !== -1) {
  content = content.substring(0, returnIndex); // Keep everything before 'return ('
  const newReturn = `  return (
    <div className="app-container">
      {/* Left: Main Steps Wizard */}
      <div className="wizard-container">
        <Stepper steps={WIZARD_STEPS} currentStep={currentStep} />
        
        <div className="step-content-scroll">
          {currentStep === 1 && (
            <SetupStep 
              sheetId={sheetId}
              handleAuth={handleAuth}
              handleCreateSheet={handleCreateSheet}
              handleWriteTemplate={handleWriteTemplate}
              handleOpenSheet={handleOpenSheet}
            />
          )}
          {currentStep === 2 && (
            <ScrapeStep 
              targetUrl={targetUrl}
              setTargetUrl={setTargetUrl}
              handleScrape={handleScrape}
            />
          )}
          {currentStep === 3 && (
            <SyncStep 
              sheetData={sheetData}
              syncStatuses={syncStatuses}
              handleReadProducts={handleReadProducts}
              handleSyncProducts={handleSyncProducts}
              handleFetchSmartStoreOrders={handleFetchSmartStoreOrders}
            />
          )}
          {currentStep === 4 && (
            <AutomationStep 
              categoryUrl={categoryUrl}
              setCategoryUrl={setCategoryUrl}
              naverCatId={naverCatId}
              setNaverCatId={setNaverCatId}
              handleSaveRule={handleSaveRule}
              catSearchKeyword={catSearchKeyword}
              setCatSearchKeyword={setCatSearchKeyword}
              catSearchResults={catSearchResults}
              setCatSearchResults={setCatSearchResults}
              handleSearchCategory={handleSearchCategory}
              categoryRules={categoryRules}
              handleDeleteRule={handleDeleteRule}
              handleBulkAutomation={handleBulkAutomation}
              sheetId={sheetId}
              addLog={addLog}
            />
          )}
        </div>

        <div className="wizard-footer">
          <button 
            className="ghost" 
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            ← Previous
          </button>
          
          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>Step {currentStep} of {WIZARD_STEPS.length}</div>

          <button 
            className="primary" 
            onClick={() => setCurrentStep(prev => Math.min(WIZARD_STEPS.length, prev + 1))}
            disabled={currentStep === WIZARD_STEPS.length}
          >
            {currentStep === WIZARD_STEPS.length ? 'Finish' : 'Next Step →'}
          </button>
        </div>
      </div>

      {/* Right: Action Logs Terminal */}
      <ActionLogs logs={logs} />
    </div>
  );
}

export default App;
`;
  content += newReturn;
}

fs.writeFileSync(appPath, content);
console.log('App.tsx successfully updated!');
