import type { CSSProperties, ReactNode } from "react";

// Decorative blue field + floating 3D "liquid" shapes behind the auth cards.
// Pure presentation (no hooks) so it stays a server component.
function Shape({
  gradId,
  viewBox,
  className,
  style,
  children,
}: {
  gradId: string;
  viewBox: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      fill="none"
      className={className}
      style={{ filter: "drop-shadow(0 16px 24px rgba(6,20,52,0.38))", ...style }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dcebff" />
          <stop offset="48%" stopColor="#8ab6f6" />
          <stop offset="100%" stopColor="#4781e6" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

export function AuthBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* deep blue gradient field */}
      <div className="absolute inset-0 bg-[radial-gradient(135%_120%_at_50%_22%,#3b86f4_0%,#1c61d2_40%,#0d3eaa_74%,#0a2f86_100%)]" />

      {/* ambient glow orbs */}
      <div className="absolute -left-32 top-[18%] h-80 w-80 rounded-full bg-sky-300/25 blur-[90px]" />
      <div className="absolute -right-24 bottom-2 h-96 w-96 rounded-full bg-blue-400/25 blur-[100px]" />
      <div className="absolute left-1/2 top-[-6%] h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-200/20 blur-[80px]" />

      {/* chevrons, top-left */}
      <Shape
        gradId="ab1"
        viewBox="0 0 120 210"
        className="auth-float absolute left-[5%] top-[24%] w-20 sm:w-28"
        style={{ "--rot": "-10deg" } as CSSProperties}
      >
        <path d="M24 26 L86 72 L24 118" stroke="url(#ab1)" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 96 L86 142 L24 188" stroke="url(#ab1)" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
      </Shape>

      {/* long squiggle, right */}
      <Shape
        gradId="ab2"
        viewBox="0 0 320 170"
        className="auth-float absolute right-[3%] top-[20%] w-64 md:w-96"
        style={{ animationDelay: "1.4s" } as CSSProperties}
      >
        <path d="M16 102 C 62 22, 112 158, 162 92 S 252 18, 304 96" stroke="url(#ab2)" strokeWidth="30" strokeLinecap="round" />
      </Shape>

      {/* squiggle, lower-right */}
      <Shape
        gradId="ab3"
        viewBox="0 0 260 130"
        className="auth-float absolute bottom-[9%] right-[15%] w-48 md:w-56"
        style={{ animationDelay: "0.7s" } as CSSProperties}
      >
        <path d="M14 74 C 52 22, 92 116, 132 64 S 212 18, 246 68" stroke="url(#ab3)" strokeWidth="26" strokeLinecap="round" />
      </Shape>

      {/* squiggle, lower-left */}
      <Shape
        gradId="ab4"
        viewBox="0 0 220 130"
        className="auth-float absolute bottom-[14%] left-[9%] w-40 md:w-48"
        style={{ "--rot": "8deg", animationDelay: "2.1s" } as CSSProperties}
      >
        <path d="M12 70 C 46 26, 82 106, 118 62 S 186 22, 208 64" stroke="url(#ab4)" strokeWidth="24" strokeLinecap="round" />
      </Shape>
    </div>
  );
}
