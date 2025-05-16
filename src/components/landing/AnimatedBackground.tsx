"use client"; // Ensures this component and its SVG animations are client-rendered

import React from "react";

/**
 * Animated SVG blobs with a noise overlay for a modern, dynamic background.
 * Uses CSS keyframes for smooth morphing and a subtle noise PNG overlay.
 */
const AnimatedBackground: React.FC = () => (
  <div
    className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    aria-hidden="true"
  >
    {/* SVG Blobs */}
    <svg
      className="absolute w-[120vw] h-[120vh] -left-1/10 -top-1/10"
      viewBox="0 0 1200 900"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "blur(40px)", opacity: 0.5 }}
    >
      <g>
        <path>
          <animate
            attributeName="d"
            dur="18s"
            repeatCount="indefinite"
            values="M421,314Q410,378,355,410Q300,442,246,410Q192,378,181,314Q170,250,246,218Q322,186,355,250Q388,314,421,314Z;M421,314Q410,250,355,218Q300,186,246,218Q192,250,181,314Q170,378,246,410Q322,442,355,378Q388,314,421,314Z;M421,314Q410,378,355,410Q300,442,246,410Q192,378,181,314Q170,250,246,218Q322,186,355,250Q388,314,421,314Z"
            keyTimes="0;0.5;1"
            begin="0s"
          />
          <animate
            attributeName="fill"
            values="#0ea5e9;#0ea5e9"
            dur="18s"
            repeatCount="indefinite"
            begin="0s"
          />
        </path>
        <path>
          <animate
            attributeName="d"
            dur="22s"
            repeatCount="indefinite"
            values="M900,600Q880,700,780,720Q680,740,600,700Q520,660,540,600Q560,540,600,520Q640,500,720,520Q800,540,900,600Z;M900,600Q880,500,780,480Q680,460,600,500Q520,540,540,600Q560,660,600,680Q640,700,720,680Q800,660,900,600Z;M900,600Q880,700,780,720Q680,740,600,700Q520,660,540,600Q560,540,600,520Q640,500,720,520Q800,540,900,600Z"
            keyTimes="0;0.5;1"
            begin="3s"
          />
          <animate
            attributeName="fill"
            values="#38bdf8;#38bdf8"
            dur="22s"
            repeatCount="indefinite"
            begin="3s"
          />
        </path>
      </g>
    </svg>
    {/* Noise Overlay */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: "url('/noise.png')",
        opacity: 0.08,
        mixBlendMode: "overlay",
      }}
    />
  </div>
);

export default AnimatedBackground;
