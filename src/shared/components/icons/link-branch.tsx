type Props = {
  className?: string;
  width?: number;
  height?: number;
};

export function LinkBranchIcon({ className, width = 24, height = 24 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width={width}
      height={height}
      viewBox="0 0 12 12"
      className={className}
    >
      <g id="link">
        <path
          id="Vector"
          d="M3.5 4.5C4.32843 4.5 5 3.82843 5 3C5 2.17157 4.32843 1.5 3.5 1.5C2.67157 1.5 2 2.17157 2 3C2 3.82843 2.67157 4.5 3.5 4.5ZM3.5 4.5V8C3.5 8.26522 3.60536 8.51957 3.79289 8.70711C3.98043 8.89464 4.23478 9 4.5 9H10.25M10.25 9L8.75 7.5M10.25 9L8.75 10.5"
          stroke="#5F6D7E"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
