import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Generates the site favicon using the same weave-logo design as GlyphWeaverLogo.
 * Next.js serves this as /icon.png and injects <link rel="icon"> automatically.
 * The existing favicon.ico stays as a legacy fallback for older browsers.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width="32"
        height="32"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Full weaving thread — behind the horizontal lines */}
        <line x1="22" y1="2" x2="6" y2="28" stroke="#6f94f1" strokeWidth="3" strokeLinecap="round" />

        {/* Three horizontal text lines */}
        <line x1="2" y1="8" x2="26" y2="8" stroke="#8d9ba3" strokeWidth="3" strokeLinecap="round" />
        <line x1="2" y1="15" x2="26" y2="15" stroke="#8d9ba3" strokeWidth="3" strokeLinecap="round" />
        <line x1="2" y1="22" x2="26" y2="22" stroke="#8d9ba3" strokeWidth="3" strokeLinecap="round" />

        {/* Thread OVER line 1 and line 3 — redrawn on top */}
        <line x1="20" y1="5" x2="16" y2="11" stroke="#6f94f1" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="19" x2="8" y2="25" stroke="#6f94f1" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    { ...size },
  );
}
