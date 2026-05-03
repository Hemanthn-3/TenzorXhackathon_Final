import React, { createContext, useContext, useState } from 'react';
import { clearGeminiCache } from '../utils/geminiClient';

export const GoldSenseContext = createContext(null);

const initialState = {
  capturedImages: [],       // array of { slot, dataURL, croppedURL }
  ocrResult: null,
  acousticResult: null,
  surfaceResult: null,
  weightEstimate: null,
  fusionResult: null,
  fraudResult: null,
  loanOffer: null,
  userInputs: {
    declaredWeight: 0,
    declaredKarat: '',
    jewelryType: '',
    referenceObject: null
  },
  goldRate: null,
  demoScenario: 'genuine',
  isDemoMode: false  // Default OFF — real images get full Gemini analysis; toggle ON for demo/hackathon
};

export function GoldSenseProvider({ children }) {
  const [state, setState] = useState(initialState);

  // Convenience helper — update a single top-level key
  const setField = (key, value) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  // Reset everything back to initial (useful when starting a new assessment)
  const resetState = () => {
    clearGeminiCache(); // Clear cached AI responses for fresh analysis
    setState(prev => ({
      ...initialState,
      isDemoMode: prev.isDemoMode,
      demoScenario: prev.demoScenario
    }));
  };

  const value = {
    ...state,
    setState,
    setField,
    resetState
  };

  return (
    <GoldSenseContext.Provider value={value}>
      {children}
    </GoldSenseContext.Provider>
  );
}

export const useGoldSense = () => useContext(GoldSenseContext);
