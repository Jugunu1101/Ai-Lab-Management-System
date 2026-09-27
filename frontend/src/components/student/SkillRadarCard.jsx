import React, { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { RadarChartOutlined, InfoCircleOutlined } from "@ant-design/icons";

export const getStatusInfo = (score) => {
  const s = Math.round(score || 0);
  if (s >= 70) {
    return {
      statusText: "Good Mastery",
      color: "#2F7D4A",
      bg: "rgba(47, 125, 74, 0.08)",
      border: "rgba(47, 125, 74, 0.2)",
    };
  }
  if (s >= 50) {
    return {
      statusText: "Needs Practice",
      color: "#D99A00",
      bg: "rgba(217, 154, 0, 0.08)",
      border: "rgba(217, 154, 0, 0.2)",
    };
  }
  return {
    statusText: "Weak Topic",
    color: "#C83C3C",
    bg: "rgba(200, 60, 60, 0.08)",
    border: "rgba(200, 60, 60, 0.2)",
  };
};

/**
 * 0-Topic Empty State
 */
const EmptyTopicRadar = () => (
  <div
    style={{
      flex: 1,
      minHeight: 340,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "var(--surface-hover, rgba(47, 125, 74, 0.08))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        color: "var(--cl-green-deep, #2F7D4A)",
        fontSize: 28,
      }}
    >
      <RadarChartOutlined />
    </div>
    <div
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "var(--text-primary)",
        marginBottom: 6,
      }}
    >
      No topic mastery data available yet
    </div>
    <p
      style={{
        fontSize: 13,
        color: "var(--text-secondary)",
        maxWidth: 280,
        margin: 0,
        lineHeight: 1.5,
      }}
    >
      Solve coding assignments and quizzes to map your multi-axis competency across topics.
    </p>
  </div>
);

/**
 * 1-Topic Circular Radial Gauge Visualization
 */
const SingleTopicGauge = ({ topic, hoveredTopic, setHoveredTopic }) => {
  const score = Math.min(100, Math.max(0, Math.round(topic?.score || 0)));
  const { statusText, color } = getStatusInfo(score);
  const formattedTopic =
    topic?.topic ? topic.topic.charAt(0).toUpperCase() + topic.topic.slice(1) : "Topic";

  // SVG Geometry Constants
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = 95;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: 360,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: "100%", maxWidth: 330, maxHeight: 330, overflow: "visible" }}
        onMouseEnter={() => setHoveredTopic(topic)}
        onMouseLeave={() => setHoveredTopic(null)}
      >
        {/* Concentric scale rings (25%, 50%, 75%, 100%) */}
        {[0.25, 0.5, 0.75, 1.0].map((fraction) => (
          <circle
            key={fraction}
            cx={cx}
            cy={cy}
            r={r * fraction}
            fill="none"
            stroke="var(--border-subtle, rgba(128,128,128,0.18))"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />
        ))}

        {/* Outer track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--surface-hover, rgba(0,0,0,0.06))"
          strokeWidth="16"
        />

        {/* Progress Arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{
            transition: "stroke-dashoffset 0.8s ease, stroke 0.3s ease",
            cursor: "pointer",
          }}
        />

        {/* Center Content */}
        <text
          x={cx}
          y={cy - 24}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: "15px",
            fontWeight: 700,
            fill: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {formattedTopic}
        </text>

        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: "28px",
            fontWeight: 800,
            fill: color,
            fontFamily: "var(--font-sans, inherit)",
          }}
        >
          {score}%
        </text>

        <g transform={`translate(${cx}, ${cy + 34})`}>
          <rect
            x="-48"
            y="-10"
            width="96"
            height="20"
            rx="10"
            fill={color}
            fillOpacity="0.12"
          />
          <text
            x="0"
            y="1"
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              fill: color,
            }}
          >
            {statusText}
          </text>
        </g>
      </svg>
    </div>
  );
};

/**
 * 2-Topic Dual-Axis Radial Competency Comparator
 *
 * Solves the degenerate Recharts 2-vertex polygon collapse.
 * Displays two distinct opposing radial axes (Left & Right) with:
 * - Concentric reference rings (25%, 50%, 75%, 100%)
 * - Symmetrical radial mastery petals/wings showing relative mastery
 * - High-contrast data nodes with clear spatial separation (e.g. Loops 20% vs Basics 76%)
 * - Interactive hover tooltips
 */
const DualTopicComparator = ({ topics, hoveredTopic, setHoveredTopic }) => {
  const [t1, t2] = topics;
  const score1 = Math.min(100, Math.max(0, Math.round(t1?.score || 0)));
  const score2 = Math.min(100, Math.max(0, Math.round(t2?.score || 0)));
  const info1 = getStatusInfo(score1);
  const info2 = getStatusInfo(score2);

  const title1 = t1?.topic ? t1.topic.charAt(0).toUpperCase() + t1.topic.slice(1) : "Topic 1";
  const title2 = t2?.topic ? t2.topic.charAt(0).toUpperCase() + t2.topic.slice(1) : "Topic 2";

  // SVG Geometry
  const width = 420;
  const height = 330;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = 125;

  // Distances from center along horizontal axis
  const r1 = Math.max(16, (score1 / 100) * maxRadius);
  const r2 = Math.max(16, (score2 / 100) * maxRadius);

  // Endpoint coordinates
  const x1 = cx - r1;
  const x2 = cx + r2;

  // Full axis endpoints
  const fullX1 = cx - maxRadius;
  const fullX2 = cx + maxRadius;

  // Lobe/Petal curve widths (gives volume and visual weight rather than a bare 1D line)
  const spread1 = Math.max(20, (score1 / 100) * 44);
  const spread2 = Math.max(20, (score2 / 100) * 44);

  // Left Topic Lobe Path (Bezier curved wedge)
  const pathLobe1 = `
    M ${cx} ${cy}
    C ${cx - r1 * 0.4} ${cy - spread1}, ${x1 + r1 * 0.1} ${cy - spread1 * 0.6}, ${x1} ${cy}
    C ${x1 + r1 * 0.1} ${cy + spread1 * 0.6}, ${cx - r1 * 0.4} ${cy + spread1}, ${cx} ${cy}
    Z
  `;

  // Right Topic Lobe Path (Bezier curved wedge)
  const pathLobe2 = `
    M ${cx} ${cy}
    C ${cx + r2 * 0.4} ${cy - spread2}, ${x2 - r2 * 0.1} ${cy - spread2 * 0.6}, ${x2} ${cy}
    C ${x2 - r2 * 0.1} ${cy + spread2 * 0.6}, ${cx + r2 * 0.4} ${cy + spread2}, ${cx} ${cy}
    Z
  `;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: 360,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", maxWidth: 430, maxHeight: 340, overflow: "visible" }}
      >
        {/* Concentric Guide Circles with Scale Labels */}
        {[0.25, 0.5, 0.75, 1.0].map((frac) => {
          const ringR = maxRadius * frac;
          const percent = Math.round(frac * 100);
          return (
            <g key={frac}>
              <circle
                cx={cx}
                cy={cy}
                r={ringR}
                fill="none"
                stroke="var(--border-subtle, rgba(128,128,128,0.18))"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <text
                x={cx}
                y={cy - ringR - 3}
                textAnchor="middle"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  fill: "var(--text-muted, #748078)",
                  opacity: 0.75,
                }}
              >
                {percent}%
              </text>
            </g>
          );
        })}

        {/* Vertical cross-axis guide */}
        <line
          x1={cx}
          y1={cy - maxRadius * 0.85}
          x2={cx}
          y2={cy + maxRadius * 0.85}
          stroke="var(--border-subtle, rgba(128,128,128,0.15))"
          strokeDasharray="2 2"
          strokeWidth="1"
        />

        {/* Left & Right Base Axis Rails */}
        <line
          x1={fullX1}
          y1={cy}
          x2={cx}
          y2={cy}
          stroke="var(--border-subtle, rgba(128,128,128,0.3))"
          strokeWidth="2"
        />
        <line
          x1={cx}
          y1={cy}
          x2={fullX2}
          y2={cy}
          stroke="var(--border-subtle, rgba(128,128,128,0.3))"
          strokeWidth="2"
        />

        {/* Left Topic Mastery Lobe / Wedge */}
        <path
          d={pathLobe1}
          fill={info1.color}
          fillOpacity={hoveredTopic?.topic === t1.topic ? 0.35 : 0.22}
          stroke={info1.color}
          strokeWidth="2.5"
          style={{
            cursor: "pointer",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={() => setHoveredTopic(t1)}
          onMouseLeave={() => setHoveredTopic(null)}
        />

        {/* Right Topic Mastery Lobe / Wedge */}
        <path
          d={pathLobe2}
          fill={info2.color}
          fillOpacity={hoveredTopic?.topic === t2.topic ? 0.35 : 0.22}
          stroke={info2.color}
          strokeWidth="2.5"
          style={{
            cursor: "pointer",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={() => setHoveredTopic(t2)}
          onMouseLeave={() => setHoveredTopic(null)}
        />

        {/* Center Origin Hub */}
        <circle
          cx={cx}
          cy={cy}
          r="6"
          fill="var(--cl-green-deep, #174832)"
          stroke="var(--bg-card, #FFFFFF)"
          strokeWidth="2"
        />

        {/* Left Topic Marker Dot */}
        <g
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setHoveredTopic(t1)}
          onMouseLeave={() => setHoveredTopic(null)}
        >
          <circle
            cx={x1}
            cy={cy}
            r={hoveredTopic?.topic === t1.topic ? "8" : "6"}
            fill={info1.color}
            stroke="#FFFFFF"
            strokeWidth="2.5"
            style={{ transition: "r 0.2s ease" }}
          />
        </g>

        {/* Right Topic Marker Dot */}
        <g
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setHoveredTopic(t2)}
          onMouseLeave={() => setHoveredTopic(null)}
        >
          <circle
            cx={x2}
            cy={cy}
            r={hoveredTopic?.topic === t2.topic ? "8" : "6"}
            fill={info2.color}
            stroke="#FFFFFF"
            strokeWidth="2.5"
            style={{ transition: "r 0.2s ease" }}
          />
        </g>

        {/* Left Topic Label & Score Header */}
        <g
          transform={`translate(${fullX1 - 10}, ${cy})`}
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setHoveredTopic(t1)}
          onMouseLeave={() => setHoveredTopic(null)}
        >
          <text
            x="0"
            y="-14"
            textAnchor="end"
            style={{
              fontSize: "13px",
              fontWeight: 700,
              fill: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {title1}
          </text>
          <text
            x="0"
            y="4"
            textAnchor="end"
            style={{
              fontSize: "17px",
              fontWeight: 800,
              fill: info1.color,
            }}
          >
            {score1}%
          </text>
          <text
            x="0"
            y="20"
            textAnchor="end"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              fill: info1.color,
              opacity: 0.9,
            }}
          >
            {info1.statusText}
          </text>
        </g>

        {/* Right Topic Label & Score Header */}
        <g
          transform={`translate(${fullX2 + 10}, ${cy})`}
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setHoveredTopic(t2)}
          onMouseLeave={() => setHoveredTopic(null)}
        >
          <text
            x="0"
            y="-14"
            textAnchor="start"
            style={{
              fontSize: "13px",
              fontWeight: 700,
              fill: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {title2}
          </text>
          <text
            x="0"
            y="4"
            textAnchor="start"
            style={{
              fontSize: "17px",
              fontWeight: 800,
              fill: info2.color,
            }}
          >
            {score2}%
          </text>
          <text
            x="0"
            y="20"
            textAnchor="start"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              fill: info2.color,
              opacity: 0.9,
            }}
          >
            {info2.statusText}
          </text>
        </g>
      </svg>
    </div>
  );
};

/**
 * Custom Floating Tooltip for 1 & 2 Topic Visualizations
 */
const CustomFloatingTooltip = ({ topic }) => {
  if (!topic) return null;
  const score = Math.round(topic.score || 0);
  const { statusText, color } = getStatusInfo(score);
  const topicName = topic.topic
    ? topic.topic.charAt(0).toUpperCase() + topic.topic.slice(1)
    : "";

  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
        borderRadius: 12,
        padding: "10px 14px",
        color: "var(--text-primary)",
        minWidth: 140,
        zIndex: 10,
        pointerEvents: "none",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
        Topic: {topicName}
      </div>
      <div
        style={{
          color: color,
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 2,
        }}
      >
        Mastery: {score}%
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted)",
        }}
      >
        Status: {statusText}
      </div>
    </div>
  );
};

/**
 * SkillRadarCard Component
 */
export const SkillRadarCard = ({ progressData = [] }) => {
  const [hoveredTopic, setHoveredTopic] = useState(null);
  const topicCount = progressData.length;

  return (
    <div
      className="cl-card"
      style={{
        background: "var(--bg-card)",
        borderRadius: 20,
        padding: "24px 28px",
        border: "1px solid var(--border-color)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      {/* 1. Card Header with Dynamic Topic Count Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Skill Radar
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: "4px 0 0 0",
            }}
          >
            Multilateral competency mapping across languages &amp; topics
          </p>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--cl-green-deep, #2F7D4A)",
            background: "rgba(47, 125, 74, 0.1)",
            border: "1px solid rgba(47, 125, 74, 0.22)",
            padding: "3px 10px",
            borderRadius: 16,
            whiteSpace: "nowrap",
          }}
        >
          {topicCount} {topicCount === 1 ? "Topic" : "Topics"}
        </span>
      </div>

      {/* Accessible screen-reader description */}
      <div
        className="sr-only"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          border: 0,
        }}
      >
        Skill Radar competency breakdown:{" "}
        {progressData.map((t) => `${t.topic}: ${t.score}%`).join(", ")}
      </div>

      {/* 2. Visualizations based on Topic Count */}
      <div
        role="region"
        aria-label="Skill Radar competency mapping chart"
        style={{
          flex: 1,
          width: "100%",
          minHeight: 370,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Floating tooltip for 1 & 2 topic modes */}
        {topicCount <= 2 && hoveredTopic && (
          <CustomFloatingTooltip topic={hoveredTopic} />
        )}

        {topicCount === 0 && <EmptyTopicRadar />}

        {topicCount === 1 && (
          <SingleTopicGauge
            topic={progressData[0]}
            hoveredTopic={hoveredTopic}
            setHoveredTopic={setHoveredTopic}
          />
        )}

        {topicCount === 2 && (
          <DualTopicComparator
            topics={progressData}
            hoveredTopic={hoveredTopic}
            setHoveredTopic={setHoveredTopic}
          />
        )}

        {topicCount >= 3 && (
          <ResponsiveContainer width="100%" height={370}>
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="72%"
              data={progressData.slice(0, 8)}
              margin={{ top: 28, right: 48, bottom: 28, left: 48 }}
            >
              <PolarGrid
                stroke="var(--border-subtle, rgba(128, 128, 128, 0.2))"
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey="topic"
                tick={(props) => {
                  const { payload, x, y, cx, cy } = props;
                  const topicKey = payload.value;
                  const item = progressData.find(
                    (d) =>
                      String(d.topic).toLowerCase() ===
                      String(topicKey).toLowerCase()
                  );
                  const score = item ? item.score : 0;
                  const statusInfo = getStatusInfo(score);

                  const dx = x - cx;
                  const dy = y - cy;
                  const dist = Math.hypot(dx, dy) || 1;
                  const offset = 14;
                  const targetX = x + (dx / dist) * offset;
                  const targetY = y + (dy / dist) * offset;
                  const anchor = dx > 12 ? "start" : dx < -12 ? "end" : "middle";

                  return (
                    <g>
                      <text
                        x={targetX}
                        y={targetY - 9}
                        textAnchor={anchor}
                        dominantBaseline="central"
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          fill: "var(--text-primary)",
                          letterSpacing: "-0.01em",
                          textTransform: "capitalize",
                        }}
                      >
                        {topicKey}
                      </text>
                      <text
                        x={targetX}
                        y={targetY + 9}
                        textAnchor={anchor}
                        dominantBaseline="central"
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          fill: statusInfo.color,
                        }}
                      >
                        {score}%
                      </text>
                    </g>
                  );
                }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                stroke="transparent"
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Mastery"
                dataKey="score"
                stroke="var(--cl-green-deep, #2F7D4A)"
                strokeWidth={2.5}
                fill="var(--cl-green-deep, #2F7D4A)"
                fillOpacity={0.25}
                dot={{
                  r: 4.5,
                  fill: "var(--cl-green-deep, #2F7D4A)",
                  stroke: "var(--bg-card, #FFFFFF)",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6.5,
                  fill: "var(--cl-green-deep, #2F7D4A)",
                  stroke: "#FFFFFF",
                  strokeWidth: 2.5,
                }}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const score = item.score;
                    const statusInfo = getStatusInfo(score);
                    const topicName = item.topic
                      ? item.topic.charAt(0).toUpperCase() + item.topic.slice(1)
                      : "";

                    return (
                      <div
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-color)",
                          boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
                          borderRadius: 12,
                          padding: "10px 14px",
                          color: "var(--text-primary)",
                          minWidth: 140,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            marginBottom: 4,
                          }}
                        >
                          Topic: {topicName}
                        </div>
                        <div
                          style={{
                            color: statusInfo.color,
                            fontWeight: 700,
                            fontSize: 14,
                            marginBottom: 2,
                          }}
                        >
                          Mastery: {score}%
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                          }}
                        >
                          Status: {statusInfo.statusText}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. Scale Guide */}
      {topicCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 14px",
            background: "var(--surface-hover, rgba(0,0,0,0.03))",
            borderRadius: 10,
            margin: "4px 0 10px 0",
            fontSize: 12,
            color: "var(--text-muted)",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span style={{ fontWeight: 500 }}>
            Closer to outer edge = higher mastery
          </span>
          <span
            style={{
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.02em",
            }}
          >
            0% ────────── 100%
          </span>
        </div>
      )}

      {/* 4. Bottom Topic Summary Cards */}
      {topicCount > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              progressData.length <= 3
                ? "repeat(auto-fit, minmax(110px, 1fr))"
                : "repeat(auto-fill, minmax(115px, 1fr))",
            gap: 10,
            marginTop: 10,
            paddingTop: 14,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {progressData.slice(0, 6).map((t) => {
            const score = t.score;
            const statusInfo = getStatusInfo(score);
            const formattedTopic =
              t.topic.charAt(0).toUpperCase() + t.topic.slice(1);

            return (
              <div
                key={t.topic}
                style={{
                  background: statusInfo.bg,
                  border: `1px solid ${statusInfo.border}`,
                  borderRadius: 14,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 3,
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {formattedTopic}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: statusInfo.color,
                    lineHeight: 1.1,
                  }}
                >
                  {score}%
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: statusInfo.color,
                    marginTop: 1,
                  }}
                >
                  {statusInfo.statusText}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SkillRadarCard;
