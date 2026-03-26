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
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-green-900 py-20 md:py-28">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
          {title}
        </h1>
        
        {subtitle && (
          <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          {cta && (
            cta.href ? (
              <a
                href={cta.href}
                className="px-8 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
              >
                {cta.text}
              </a>
            ) : (
              <button
                onClick={cta.onClick}
                className="px-8 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
              >
                {cta.text}
              </button>
            )
          )}

          {secondaryCta && (
            secondaryCta.href ? (
              <a
                href={secondaryCta.href}
                className="px-8 py-3 rounded-lg border-2 border-white text-white hover:bg-white hover:text-slate-900 font-semibold transition-colors"
              >
                {secondaryCta.text}
              </a>
            ) : (
              <button
                onClick={secondaryCta.onClick}
                className="px-8 py-3 rounded-lg border-2 border-white text-white hover:bg-white hover:text-slate-900 font-semibold transition-colors"
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
