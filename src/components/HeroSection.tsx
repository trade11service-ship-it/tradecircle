import React from 'react';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  cta?: {
    text: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryCta?: {
    text: string;
    onClick?: () => void;
    href?: string;
  };
}

export function HeroSection({ title, subtitle, cta, secondaryCta }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden tc-gradient-hero py-20 md:py-28">
      {/* Ambient orbs */}
      <div className="absolute top-20 left-[10%] w-[300px] h-[300px] rounded-full bg-primary/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-[10%] w-[300px] h-[300px] rounded-full bg-secondary/8 blur-[100px] pointer-events-none" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="container relative z-10 mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {title}
        </h1>
        
        {subtitle && (
          <p className="text-lg md:text-xl text-white/60 mb-8 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          {cta && (
            cta.href ? (
              <a
                href={cta.href}
                className="px-8 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-bold transition-all duration-300 shadow-lg shadow-primary/25 hover:scale-[1.02]"
              >
                {cta.text}
              </a>
            ) : (
              <button
                onClick={cta.onClick}
                className="px-8 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-bold transition-all duration-300 shadow-lg shadow-primary/25 hover:scale-[1.02]"
              >
                {cta.text}
              </button>
            )
          )}

          {secondaryCta && (
            secondaryCta.href ? (
              <a
                href={secondaryCta.href}
                className="px-8 py-3 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 font-semibold transition-all duration-300 backdrop-blur-sm"
              >
                {secondaryCta.text}
              </a>
            ) : (
              <button
                onClick={secondaryCta.onClick}
                className="px-8 py-3 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 font-semibold transition-all duration-300 backdrop-blur-sm"
              >
                {secondaryCta.text}
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
