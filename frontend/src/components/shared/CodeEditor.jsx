import React from "react";
import Editor from "@monaco-editor/react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useTheme } from "../../context/ThemeContext";

export const CodeEditor = ({
  value = "",
  onChange,
  language = "javascript",
  height = "500px",
  readOnly = false,
  theme,
  options = {},
}) => {
  const { isDarkMode } = useTheme();

  const monacoTheme = theme || (isDarkMode ? "vs-dark" : "vs");

  // Map language to monaco language identifier
  const resolveLanguage = (lang) => {
    switch (lang?.toLowerCase()) {
      case "c++":
      case "cpp":
        return "cpp";
      case "py":
      case "python":
      case "python3":
        return "python";
      case "java":
        return "java";
      case "javascript":
      case "js":
      case "node":
        return "javascript";
      default:
        return "javascript";
    }
  };

  const defaultOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
    lineNumbers: "on",
    roundedSelection: true,
    scrollBeyondLastLine: false,
    readOnly,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: "on",
    bracketPairColorization: { enabled: true },
    formatOnPaste: true,
    formatOnType: true,
    ...options,
  };

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        height,
      }}
    >
      <Editor
        height="100%"
        language={resolveLanguage(language)}
        value={value}
        theme={monacoTheme}
        onChange={onChange}
        options={defaultOptions}
        loading={
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isDarkMode ? "#1e1e1e" : "#fffffe",
            }}
          >
            <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: "var(--primary)" }} spin />} />
          </div>
        }
      />
    </div>
  );
};

export default CodeEditor;
