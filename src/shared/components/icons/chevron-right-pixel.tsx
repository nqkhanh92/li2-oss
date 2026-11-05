export const ChevronRightPixel = ({
  width = 16,
  height = 16,
  color = '#000029',
  className
}: {
  width?: number
  height?: number
  color?: string
  className?: string
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path d="M9 5V7V8V9V7H11V9H9V11H7V13H5V11H7V9H9V8V7H7V5H9Z" fill={color} />
      <path d="M7 5H5V3H7V5Z" fill={color} />
    </svg>
  )
}
