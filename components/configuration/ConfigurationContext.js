import { createContext, useContext } from "react";

const ConfigurationContext = createContext();

export const useConfigurationContext = () => {
  const context = useContext(ConfigurationContext);
  if (!context) {
    throw new Error("useConfigurationContext must be used within ConfigurationProvider");
  }
  return context;
};

export const ConfigurationProvider = ({ children, value }) => {
  return <ConfigurationContext.Provider value={value}>{children}</ConfigurationContext.Provider>;
};
