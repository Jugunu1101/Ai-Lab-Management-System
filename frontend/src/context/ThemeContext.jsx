import React, { createContext, useContext, useState, useEffect } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Default to light (CodeLab AI Cream + Green system)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  useEffect(() => {
    const themeStr = isDarkMode ? "dark" : "light";
    localStorage.setItem("theme", themeStr);
    document.documentElement.setAttribute("data-theme", themeStr);
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const antdConfigTheme = {
    algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: isDarkMode ? "#2F7D4A" : "#123C2A",
      colorPrimaryHover: isDarkMode ? "#246B45" : "#174832",
      colorPrimaryActive: isDarkMode ? "#174832" : "#246B45",
      colorSuccess: "#2F7D4A",
      colorWarning: "#D99A00",
      colorError: "#C83C3C",
      colorInfo: "#2F7D4A",
      borderRadius: 12,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: 15,
      fontSizeLG: 16,
      fontSizeSM: 14,
      fontSizeHeading1: 34,
      fontSizeHeading2: 24,
      fontSizeHeading3: 20,
      fontSizeHeading4: 18,
      controlHeight: 44,
      lineHeight: 1.55,
      colorBgBase: isDarkMode ? "#0F281E" : "#F8F6EE",
      colorBgContainer: isDarkMode ? "#174832" : "#FFFFFF",
      colorBgElevated: isDarkMode ? "#1F543C" : "#FFFFFF",
      colorBorder: isDarkMode ? "#246B45" : "#DDE5DC",
      colorBorderSecondary: isDarkMode ? "#1D4733" : "#EBF0EA",
      colorText: isDarkMode ? "#F8F6EE" : "#18231D",
      colorTextSecondary: isDarkMode ? "#DCEEDD" : "#59665E",
      colorTextTertiary: isDarkMode ? "#9CB5A3" : "#748078",
      colorTextDisabled: isDarkMode ? "#6E8775" : "#8E9B93",
    },
    components: {
      Card: {
        colorBgContainer: isDarkMode ? "#174832" : "#FFFFFF",
        colorBorderSecondary: isDarkMode ? "#246B45" : "#DDE5DC",
        borderRadiusLG: 20,
        paddingLG: 24,
      },
      Table: {
        colorBgContainer: isDarkMode ? "#174832" : "#FFFFFF",
        headerBg: isDarkMode ? "#123C2A" : "#F8F6EE",
        headerColor: isDarkMode ? "#F8F6EE" : "#18231D",
        rowHoverBg: isDarkMode ? "#1F543C" : "#EDF6EA",
        cellPaddingBlock: 16,
        cellPaddingInline: 18,
        fontSize: 14,
      },
      Button: {
        controlHeight: 44,
        borderRadius: 12,
        fontWeight: 600,
        fontSize: 15,
      },
      Input: {
        controlHeight: 46,
        borderRadius: 12,
        fontSize: 15,
      },
      Select: {
        controlHeight: 46,
        borderRadius: 12,
        fontSize: 15,
      },
      Tag: {
        borderRadiusSM: 8,
        fontSize: 13,
      },
    },
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ConfigProvider theme={antdConfigTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
