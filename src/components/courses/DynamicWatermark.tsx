import { useEffect, useRef, useState } from 'react';

interface DynamicWatermarkProps {
  /** Primary identity line, usually the viewer's email. */
  primary: string;
  /** Secondary identity line, usually the viewer's phone number. */
  secondary?: string | null;
}

/**
 * Anti-piracy overlay. A floating identity stamp drifts to a new random
 * position every 4 seconds so any screen recording carries the viewer's
 * account identity. Pointer events pass through to the player beneath.
 */
export function DynamicWatermark({ primary, secondary }: DynamicWatermarkProps) {
  const [pos, setPos] = useState({ top: '12%', left: '8%' });
  const [stamp, setStamp] = useState(() => new Date().toLocaleTimeString('en-IN'));
  const timer = useRef<number>();

  useEffect(() => {
    const move = () => {
      setPos({
        top: `${8 + Math.random() * 74}%`,
        left: `${4 + Math.random() * 60}%`,
      });
      setStamp(new Date().toLocaleTimeString('en-IN'));
    };
    move();
    timer.current = window.setInterval(move, 4000);
    return () => window.clearInterval(timer.current);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-20">
      <div
        className="absolute whitespace-nowrap rounded px-2 py-1 text-[10px] font-semibold tracking-wide text-white/45 bg-black/15 transition-all duration-1000 ease-in-out"
        style={{ top: pos.top, left: pos.left }}
      >
        {primary}
        {secondary ? ` | ${secondary}` : ''} | {stamp} | Protected content
      </div>
    </div>
  );
}

/** Repeating diagonal watermark mesh, used over PDF page canvases. */
export function WatermarkMesh({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-20 opacity-[0.14]">
      <div className="absolute inset-[-30%] flex flex-col justify-around -rotate-[30deg]">
        {Array.from({ length: 12 }).map((_, row) => (
          <div key={row} className="flex justify-around whitespace-nowrap">
            {Array.from({ length: 4 }).map((__, col) => (
              <span key={col} className="text-[11px] font-bold text-foreground px-6">
                {label}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
