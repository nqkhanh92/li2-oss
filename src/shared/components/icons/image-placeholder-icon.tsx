type Props = {
  className?: string;
  width?: number;
  height?: number;
};

export function ImagePlaceholderIcon({
  className,
  width = 24,
  height = 24,
}: Props) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 95 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4.08962"
        y="16.4462"
        width="72.4637"
        height="55.0335"
        transform="rotate(-10.3137 4.08962 16.4462)"
        fill="white"
        stroke="#D9D9D9"
        strokeWidth="5.97213"
      />
      <path
        d="M30.2411 48.1974L19.2463 59.0564L12.9492 24.4531L68.9882 14.2552L73.5021 39.0594L56.2118 25.7549L39.1503 51.9543L30.2411 48.1974Z"
        fill="white"
      />
      <circle
        cx="27.0372"
        cy="32.3288"
        r="5.91381"
        transform="rotate(-10.3137 27.0372 32.3288)"
        fill="white"
      />
      <rect
        x="22.115"
        y="24.4597"
        width="69.2766"
        height="52.5547"
        fill="white"
        stroke="#D9D9D9"
        strokeWidth="5.97213"
      />
      <path
        d="M41.2272 58.7995L28.9844 67.1605V33.418H83.6293V57.6051L69.5948 42.0775L48.991 63.8758L41.2272 58.7995Z"
        fill="#D9D9D9"
      />
      <circle cx="40.9274" cy="43.2712" r="5.67352" fill="white" />
    </svg>
  );
}
