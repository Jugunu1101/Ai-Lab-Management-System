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
    document.documentElement.classList.toggle("dark", isDarkMode);
    if (document.body) {
      document.body.setAttribute("data-theme", themeStr);
      document.body.classList.toggle("dark", isDarkMode);
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const antdConfigTheme = {
    algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: isDarkMode ? "#2F7D4A" : "#123C2A",
      colorPrimaryHover: isDarkMode ? "#3BA764" : "#174832",
      colorPrimaryActive: isDarkMode ? "#174832" : "#246B45",
      colorSuccess: isDarkMode ? "#3BA764" : "#2F7D4A",
      colorWarning: isDarkMode ? "#E5B632" : "#D99A00",
      colorError: isDarkMode ? "#F87171" : "#C83C3C",
      colorInfo: isDarkMode ? "#3BA764" : "#2F7D4A",
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
      colorBgBase: isDarkMode ? "#0B1E16" : "#F8F6EE",
      colorBgContainer: isDarkMode ? "#133827" : "#FFFFFF",
      colorBgElevated: isDarkMode ? "#194631" : "#FFFFFF",
      colorBorder: isDarkMode ? "#246B45" : "#DDE5DC",
      colorBorderSecondary: isDarkMode ? "#1D4733" : "#EBF0EA",
      colorText: isDarkMode ? "#F8F6EE" : "#18231D",
      colorTextSecondary: isDarkMode ? "#DCEEDD" : "#59665E",
      colorTextTertiary: isDarkMode ? "#9CB5A3" : "#748078",
      colorTextDisabled: isDarkMode ? "#6E8775" : "#8E9B93",
    },
    components: {
      Card: {
        colorBgContainer: isDarkMode ? "#133827" : "#FFFFFF",
        colorBorderSecondary: isDarkMode ? "#246B45" : "#DDE5DC",
        borderRadiusLG: 20,
        paddingLG: 24,
      },
      Table: {
        colorBgContainer: isDarkMode ? "#133827" : "#FFFFFF",
        headerBg: isDarkMode ? "#0F281E" : "#EDF6EA",
        headerColor: isDarkMode ? "#F8F6EE" : "#18231D",
        rowHoverBg: isDarkMode ? "#1C4D36" : "#EDF6EA",
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
    // Graceful fallback for isolated test suites
    return { isDarkMode: false, toggleTheme: () => {} };
  }
  return context;
};

export default ThemeContext;
