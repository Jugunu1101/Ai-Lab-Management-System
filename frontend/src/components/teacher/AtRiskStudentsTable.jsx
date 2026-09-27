import React, { useState } from "react";
import { Tag, Button, Tooltip, Typography, Progress, Input } from "antd";
import { WarningOutlined, EyeOutlined, UserOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

/* ─── Reason formatter ──────────────────────────────────────────────────────
   Converts the raw reason string from the backend into a concise display label.
   The 45% threshold logic stays unchanged in the backend; we only format here.
────────────────────────────────────────────────────────────────────────────── */
function formatReason(reason) {
  if (!reason) return "—";
  const lower = reason.toLowerCase();
  if (lower.includes("below") || lower.includes("mastery") || lower.includes("45")) {
    return "Below 45% threshold";
  }
  if (lower.includes("consecutive") || lower.includes("fail")) {
    // e.g. "Repeated failed submissions (3 consecutive failures)" → "3 consecutive failures"
    const match = reason.match(/\((.+?)\)/);
    return match ? match[1] : "Repeated failures";
  }
  // Fallback: truncate to 40 chars, full text in tooltip
  return reason.length > 40 ? reason.slice(0, 38) + "…" : reason;
}

/* ─── Mastery cell ──────────────────────────────────────────────────────────
   Badge + subtle progress bar.
────────────────────────────────────────────────────────────────────────────── */
function MasteryCell({ score }) {
  const pct = score !== undefined && score !== null ? Math.round(score) : null;
  if (pct === null) return <span style={{ color: "var(--text-muted)" }}>—</span>;

  const color = pct < 25 ? "#ef4444" : pct < 35 ? "#f97316" : "#f59e0b";

  return (
    <div style={{ minWidth: 70 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 28,
          borderRadius: 6,
          background: `${color}18`,
          border: `1.5px solid ${color}55`,
          fontWeight: 700,
          fontSize: 13,
          color,
          marginBottom: 5,
        }}
      >
        {pct}%
      </div>
      <Progress
        percent={pct}
        showInfo={false}
        strokeColor={color}
        trailColor="var(--border-subtle)"
        size={["100%", 3]}
        style={{ maxWidth: 70, margin: 0 }}
      />
    </div>
  );
}

/* ─── Topics cell ───────────────────────────────────────────────────────────
   Tags with wrapping. Never overflow the column.
────────────────────────────────────────────────────────────────────────────── */
function TopicsCell({ topics }) {
  const list = Array.isArray(topics) && topics.length > 0 ? topics : [];
  if (list.length === 0) {
    return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 4px" }}>
      {list.map((t, i) => (
        <Tag
          key={i}
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: "18px",
            padding: "0 7px",
            borderRadius: 10,
            border: "1.5px solid #ef444455",
            background: "#ef444410",
            color: "#c83c3c",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {t}
        </Tag>
      ))}
    </div>
  );
}

/* ─── Desktop table ──────────────────────────────────────────────────────── */
function DesktopTable({ students, navigate }) {
  return (
    <div className="ar-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table className="ar-table">
        <thead>
          <tr>
            <th style={{ width: "22%" }}>Student</th>
            <th style={{ width: "11%" }}>Mastery</th>
            <th style={{ width: "28%" }}>Vulnerable Topics</th>
            <th style={{ width: "27%" }}>Reason</th>
            <th style={{ width: "12%", textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, idx) => {
            const studentId = student.studentId || student._id || student.id;
            const topics = student.weakTopics || student.vulnerableTopics || [];
            const rawReason = student.reason || "";
            const shortReason = formatReason(rawReason);
            const needsTooltip = rawReason && rawReason !== shortReason && rawReason.length > 40;

            return (
              <tr key={studentId || idx} className="ar-row">
                {/* Student Name + Email */}
                <td>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div
                      className="ar-avatar"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #ef4444 0%, #c83c3c 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#fff",
                        marginTop: 2,
                      }}
                    >
                      {(student.name || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 180,
                        }}
                        title={student.name}
                      >
                        {student.name || "—"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 180,
                          marginTop: 1,
                        }}
                        title={student.email}
                      >
                        {student.email || ""}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Mastery */}
                <td>
                  <MasteryCell score={student.score} />
                </td>

                {/* Vulnerable Topics */}
                <td>
                  <TopicsCell topics={topics} />
                </td>

                {/* Reason */}
                <td>
                  {needsTooltip ? (
                    <Tooltip title={rawReason} placement="topLeft">
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 220,
                          cursor: "help",
                          borderBottom: "1px dashed var(--border-color)",
                        }}
                      >
                        {shortReason}
                      </span>
                    </Tooltip>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {shortReason}
                    </span>
                  )}
                </td>

                {/* Action */}
                <td style={{ textAlign: "right" }}>
                  {studentId ? (
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/teacher/students/${studentId}`)}
                      style={{
                        borderRadius: 6,
                        fontWeight: 500,
                        minWidth: 72,
                        borderColor: "var(--border-color)",
                      }}
                    >
                      View
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Mobile cards ───────────────────────────────────────────────────────── */
function MobileCards({ students, navigate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 0 4px" }}>
      {students.map((student, idx) => {
        const studentId = student.studentId || student._id || student.id;
        const topics = student.weakTopics || student.vulnerableTopics || [];
        const shortReason = formatReason(student.reason || "");
        const pct = student.score !== undefined && student.score !== null ? Math.round(student.score) : null;
        const color = pct === null ? "#f59e0b" : pct < 25 ? "#ef4444" : pct < 35 ? "#f97316" : "#f59e0b";

        return (
          <div
            key={studentId || idx}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            {/* Name row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 1 }}>
                  {student.name || "—"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                  {student.email || ""}
                </div>
              </div>
              {pct !== null && (
                <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 32,
                    borderRadius: 6,
                    background: `${color}18`,
                    border: `1.5px solid ${color}55`,
                    fontWeight: 700,
                    fontSize: 14,
                    color,
                    marginLeft: 8,
                  }}
                >
                  {pct}%
                </div>
              )}
            </div>

            {/* Topics */}
            {topics.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>
                  Vulnerable Topics
                </div>
                <TopicsCell topics={topics} />
              </div>
            )}

            {/* Reason + Action */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 2 }}>
                  Reason
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{shortReason}</div>
              </div>
              {studentId && (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/teacher/students/${studentId}`)}
                  style={{ borderRadius: 6, fontWeight: 500, minWidth: 72, flexShrink: 0, marginLeft: 8 }}
                >
                  View
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export const AtRiskStudentsTable = ({ students = [] }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const count = students.length;
  const cleanSearch = (searchTerm || "").trim().toLowerCase();

  const displayedStudents = students.filter((s) => {
    if (!cleanSearch) return true;
    const nameMatch = s.name?.toLowerCase().includes(cleanSearch);
    const emailMatch = s.email?.toLowerCase().includes(cleanSearch);
    const reasonMatch = s.reason?.toLowerCase().includes(cleanSearch);
    const topics = s.weakTopics || s.vulnerableTopics || [];
    const topicMatch = topics.some((t) => t?.toLowerCase().includes(cleanSearch));
    return nameMatch || emailMatch || reasonMatch || topicMatch;
  });

  return (
    <div
      className="glass-card"
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--border-color)",
      }}
    >
      {/* ── Section Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: count > 0 ? "1px solid var(--border-color)" : "none",
          background: "var(--bg-card)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <WarningOutlined style={{ color: "var(--error)", fontSize: 16 }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              Students Needing Attention
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 24 }}>
            Students below the attention threshold (mastery &lt; 45%)
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          {count > 0 && (
            <Input
              prefix={<SearchOutlined style={{ color: "var(--text-muted)", fontSize: 13 }} />}
              placeholder="Search student or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              style={{ width: 200, height: 32, borderRadius: 6, fontSize: 12 }}
            />
          )}
          {count > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "3px 10px",
                borderRadius: 20,
                background: "#ef444415",
                border: "1.5px solid #ef444440",
                fontSize: 12,
                fontWeight: 600,
                color: "#c83c3c",
              }}
            >
              {displayedStudents.length} of {count}
            </span>
          )}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px 10px",
              borderRadius: 20,
              background: "#ef444415",
              border: "1.5px solid #ef444440",
              fontSize: 12,
              fontWeight: 600,
              color: "#c83c3c",
            }}
          >
            Action Required
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      {count === 0 ? (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 14,
            background: "var(--bg-card)",
          }}
        >
          <UserOutlined style={{ fontSize: 28, marginBottom: 8, display: "block", opacity: 0.4 }} />
          No students currently need attention.
        </div>
      ) : displayedStudents.length === 0 ? (
        <div
          style={{
            padding: "32px 24px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
            background: "var(--bg-card)",
          }}
        >
          No students match "{searchTerm.trim()}".
          <div style={{ marginTop: 8 }}>
            <Button size="small" onClick={() => setSearchTerm("")} style={{ borderRadius: 6 }}>
              Clear Filter
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table — hidden on mobile via CSS */}
          <div className="ar-desktop-view">
            <DesktopTable students={displayedStudents} navigate={navigate} />
          </div>
          {/* Mobile cards — hidden on desktop via CSS */}
          <div className="ar-mobile-view" style={{ padding: "12px 16px" }}>
            <MobileCards students={displayedStudents} navigate={navigate} />
          </div>
        </>
      )}
    </div>
  );
};

export default AtRiskStudentsTable;
