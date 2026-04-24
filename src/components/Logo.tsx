export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      xmlSpace="preserve"
      style={{
        fillRule: "evenodd",
        clipRule: "evenodd",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeMiterlimit: 1.5,
      }}
    >
      <g transform="matrix(-0.707107,0.707107,-0.707107,-0.707107,22.4853,25.3137)">
        <path
          d="M4,4L4,24"
          style={{
            fill: "none",
            stroke: "black",
            strokeWidth: 1,
          }}
        />
      </g>
      <g transform="matrix(0.707107,0.707107,-0.707107,0.707107,25.3137,5.51472)">
        <path
          d="M4,4L4,24"
          style={{
            fill: "none",
            stroke: "black",
            strokeWidth: 1,
          }}
        />
      </g>
      <g transform="matrix(-0.707107,0.707107,-0.707107,-0.707107,26.7279,21.0711)">
        <path
          d="M4,4L4,24"
          style={{
            fill: "none",
            stroke: "black",
            strokeWidth: 1,
          }}
        />
      </g>
      <g transform="matrix(0.707107,0.707107,-0.707107,0.707107,21.0711,1.27208)">
        <path
          d="M4,4L4,24"
          style={{
            fill: "none",
            stroke: "black",
            strokeWidth: 1,
          }}
        />
      </g>
      <g transform="matrix(-0.707107,0.707107,-0.707107,-0.707107,30.9706,16.8284)">
        <path
          d="M4,4L4,24"
          style={{
            fill: "none",
            stroke: "rgb(0,107,255)",
            strokeWidth: 1,
          }}
        />
      </g>
      <g transform="matrix(0.707107,0.707107,-0.707107,0.707107,16.8284,-2.97056)">
        <path
          d="M4,4L4,24"
          style={{
            fill: "none",
            stroke: "black",
            strokeWidth: 1,
          }}
        />
      </g>
    </svg>
  );
}
