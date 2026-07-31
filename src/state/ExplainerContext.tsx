import { createContext, useContext, useState, type ReactNode } from 'react';
import { ExplainerSheet } from '../components/ExplainerSheet';

const ExplainerContext = createContext<(key: string) => void>(() => {});

/** Opens the explainer sheet for a term key — used by ExplainChip/ExplainTerm. */
export function useExplainer() {
  return useContext(ExplainerContext);
}

/**
 * Owns which explainer (if any) is open. A "related" pill inside the sheet
 * calls the same setter, which swaps the sheet's content in place rather
 * than stacking a second sheet — matching the vanilla's openExplainer.
 */
export function ExplainerProvider({ children }: { children: ReactNode }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <ExplainerContext.Provider value={setOpenKey}>
      {children}
      {openKey && <ExplainerSheet explainerKey={openKey} onNavigate={setOpenKey} onClose={() => setOpenKey(null)} />}
    </ExplainerContext.Provider>
  );
}
