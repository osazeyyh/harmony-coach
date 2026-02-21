"use client";

/**
 * GradientBlobBackground
 * Fixed full-viewport animated background — fluid/watery purple blobs.
 * Inspired by Dolby On's fluid waveform aesthetic.
 * Pure CSS animations, no JS required beyond the component mount.
 */
export function GradientBlobBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Deep purple base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d0820] via-[#130a2e] to-[#0a0618]" />

      {/* Blob 1 — violet, top-left */}
      <div
        className="blob-1 absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(circle at center, #7c3aed 0%, #4f46e5 50%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Blob 2 — indigo/purple, top-right */}
      <div
        className="blob-2 absolute -right-40 top-1/4 h-[500px] w-[500px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle at center, #9333ea 0%, #7c3aed 50%, transparent 70%)",
          filter: "blur(90px)",
        }}
      />

      {/* Blob 3 — violet/pink, bottom-center */}
      <div
        className="blob-3 absolute bottom-0 left-1/2 h-[550px] w-[550px] -translate-x-1/2 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle at center, #6d28d9 0%, #9333ea 40%, #ec4899 70%, transparent 80%)",
          filter: "blur(100px)",
        }}
      />

      {/* Subtle noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
    </div>
  );
}
