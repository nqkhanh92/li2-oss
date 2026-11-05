import { useState } from "react";

type MapChartLegendProps = {
  title: string;
  currentValue: number;
  minValue?: number;
  maxValue?: number;
  valueLabels?: number[];
  colorStops?: { offset: string; color: string }[];
  size?: "sm" | "md" | "lg" | "xl";
};

export default function MapChartLegend({
  title,
  currentValue,
  minValue = 0,
  maxValue = 2500,
  valueLabels = [0, 100, 250, 500, 1000, 2500],
  colorStops = [
    { offset: "0%", color: "#f7fbff" },
    { offset: "20%", color: "#c8ddf0" },
    { offset: "40%", color: "#73b3d8" },
    { offset: "60%", color: "#2879b9" },
    { offset: "80%", color: "#08306b" },
    { offset: "100%", color: "#020c28" },
  ],
  size = "md",
}: MapChartLegendProps) {
  // Use props directly instead of state to avoid unnecessary re-renders
  // and ensure the component updates when props change

  // Size configurations
  const sizeConfig = {
    sm: {
      viewBox: "0 0 300 80",
      barWidth: 200,
      barStartX: 50,
      barHeight: 10,
      barY: 35,
      titleY: 15,
      titleSize: "12",
      labelSize: "8",
      valueSize: "8",
      tickHeight: { regular: 4, end: 5 },
      labelY: 55,
      triangleSize: 4,
      rectWidth: 30,
      rectHeight: 12,
      rectY: 10,
      valueY: 18,
    },
    md: {
      viewBox: "0 0 400 100",
      barWidth: 300,
      barStartX: 50,
      barHeight: 14,
      barY: 45,
      titleY: 20,
      titleSize: "14",
      labelSize: "10",
      valueSize: "10",
      tickHeight: { regular: 6, end: 8 },
      labelY: 70,
      triangleSize: 6,
      rectWidth: 40,
      rectHeight: 16,
      rectY: 12,
      valueY: 23,
    },
    lg: {
      viewBox: "0 0 600 150",
      barWidth: 400,
      barStartX: 100,
      barHeight: 20,
      barY: 60,
      titleY: 30,
      titleSize: "16",
      labelSize: "12",
      valueSize: "12",
      tickHeight: { regular: 8, end: 10 },
      labelY: 105,
      triangleSize: 8,
      rectWidth: 50,
      rectHeight: 20,
      rectY: 15,
      valueY: 30,
    },
    xl: {
      viewBox: "0 0 800 200",
      barWidth: 600,
      barStartX: 100,
      barHeight: 30,
      barY: 80,
      titleY: 40,
      titleSize: "20",
      labelSize: "14",
      valueSize: "14",
      tickHeight: { regular: 10, end: 12 },
      labelY: 135,
      triangleSize: 10,
      rectWidth: 60,
      rectHeight: 24,
      rectY: 20,
      valueY: 38,
    },
  };

  // Get config for the current size
  const config = sizeConfig[size];

  // Calculate position properly by determining percentage along scale
  const percentageAlongScale =
    (currentValue - minValue) / (maxValue - minValue);
  const valuePosition =
    config.barStartX + config.barWidth * percentageAlongScale;

  // Generate a unique ID for the gradient to avoid conflicts when multiple instances exist
  const gradientId = `colorGradient-${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  return (
    <svg viewBox={config.viewBox} className="w-full">
      {/* Title */}
      <text
        x={config.barStartX + config.barWidth / 2}
        y={config.titleY}
        textAnchor="middle"
        fontSize={config.titleSize}
        fontWeight="bold"
      >
        {title}
      </text>

      {/* Gradient Definition */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {colorStops.map((stop, index) => (
            <stop key={index} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
      </defs>

      {/* Color bar */}
      <rect
        x={config.barStartX}
        y={config.barY}
        width={config.barWidth}
        height={config.barHeight}
        fill={`url(#${gradientId})`}
        stroke="#333"
        strokeWidth="1"
      />

      {/* Tick marks and labels */}
      {valueLabels.map((value, index) => {
        // Calculate proper position for each tick
        const percentage = (value - minValue) / (maxValue - minValue);
        const x = config.barStartX + config.barWidth * percentage;
        const tickHeight =
          index === 0 || index === valueLabels.length - 1
            ? config.tickHeight.end
            : config.tickHeight.regular;

        return (
          <g key={index}>
            <line
              x1={x}
              y1={config.barY + config.barHeight}
              x2={x}
              y2={config.barY + config.barHeight + tickHeight}
              stroke="#333"
              strokeWidth="1"
            />
            <text
              x={x}
              y={config.labelY}
              textAnchor="middle"
              fontSize={config.labelSize}
            >
              {value}
            </text>
          </g>
        );
      })}

      {/* Simplified Current value marker - triangle pointer and value text */}
      <g>
        {/* Triangle pointer */}
        <polygon
          points={`
            ${valuePosition},${config.barY - 2} 
            ${valuePosition - config.triangleSize},${
            config.barY - config.triangleSize - 2
          } 
            ${valuePosition + config.triangleSize},${
            config.barY - config.triangleSize - 2
          }
          `}
          fill="#333"
        />

        {/* Current value label */}
        <rect
          x={valuePosition - config.rectWidth / 2}
          y={config.rectY}
          width={config.rectWidth}
          height={config.rectHeight}
          rx="4"
          fill="#333"
        />
        <text
          x={valuePosition}
          y={config.valueY}
          textAnchor="middle"
          fontSize={config.valueSize}
          fontWeight="bold"
          fill="#fff"
        >
          {currentValue}
        </text>
      </g>
    </svg>
  );
}
