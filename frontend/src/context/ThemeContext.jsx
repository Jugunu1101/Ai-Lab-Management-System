import React, { createContext, useContext, useState, useEffect } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
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
      colorPrimary: isDarkMode ? "#6366f1" : "#4f46e5",
      colorSuccess: "#10b981",
      colorWarning: "#f59e0b",
      colorError: "#f43f5e",
      colorInfo: "#06b6d4",
      borderRadius: 10,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      colorBgContainer: isDarkMode ? "#111827" : "#ffffff",
      colorBgElevated: isDarkMode ? "#1f2937" : "#ffffff",
      colorBorder: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
      colorText: isDarkMode ? "#f8fafc" : "#0f172a",
      colorTextSecondary: isDarkMode ? "#94a3b8" : "#475569",
    },
    components: {
      Card: {
        colorBgContainer: isDarkMode ? "rgba(17, 24, 39, 0.85)" : "#ffffff",
        colorBorderSecondary: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
      },
      Table: {
        colorBgContainer: isDarkMode ? "rgba(17, 24, 39, 0.7)" : "#ffffff",
      },
      Button: {
        controlHeight: 38,
        borderRadius: 8,
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
