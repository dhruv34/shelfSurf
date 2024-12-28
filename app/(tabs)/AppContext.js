import React, { createContext, useState, useContext } from 'react';

// Create a Context to hold the resp state
export const AppContext = createContext();

// Create a Provider component
export const AppProvider = ({ children }) => {
  const [resp, setResp] = useState('');

  return (
    <AppContext.Provider value={{ resp, setResp }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = () => useContext(AppContext);
