export default function ArrowWithText({
  text = 'Continue to Next Step',
  width = 300,
  height = 40,
}) {
  const arrowHeadSize = Math.min(height, 15)
  const lineY = height / 2
  const lineEndX = width - arrowHeadSize

  return (
    <div className="flex flex-col items-center relative">
      {/* Text above arrow */}
      <span className="text-sm font-light absolute translate-y-[-20%]">{text}</span>

      {/* Long arrow SVG */}
      <svg
        className="text-gray-500"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Arrow line */}
        <line x1="0" y1={lineY} x2={lineEndX} y2={lineY} stroke="currentColor" strokeWidth="2" />
        {/* Arrow head */}
        <path
          d={`M ${width} ${lineY} L ${lineEndX} ${lineY - arrowHeadSize / 3} L ${lineEndX} ${
            lineY + arrowHeadSize / 3
          } Z`}
          fill="currentColor"
        />
      </svg>
    </div>
  )
}
