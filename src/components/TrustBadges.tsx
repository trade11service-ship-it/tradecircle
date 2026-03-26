import React from 'react';
import { CheckCircle, BarChart3, Zap, Users } from 'lucide-react';

interface TrustBadgesProps {
  variant?: 'full' | 'compact';
}

export function TrustBadges({ variant = 'full' }: TrustBadgesProps) {
  const badges = [
    {
      icon: CheckCircle,
      title: 'SEBI Verified',
      description: 'Every advisor manually verified',
    },
    {
      icon: BarChart3,
      title: 'Public Track Records',
      description: 'Full WIN/LOSS history visible',
    },
    {
      icon: Zap,
      title: 'Telegram Alerts',
      description: 'Signals delivered instantly',
    },
    {
      icon: Users,
      title: '₹0 Listing Fee',
      description: 'No hidden charges for advisors',
    },
  ];

  return (
    <section className="bg-slate-50 py-12 md:py-16">
      <div className="container mx-auto px-4">
        {variant === 'full' && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Why Choose TradeCircle?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to find verified, trusted trading advisors with proven track records
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-200"
              >
                <div className="flex items-start gap-4">
                  <Icon className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{badge.title}</h3>
                    <p className="text-sm text-slate-600">{badge.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Bar */}
        <div className="mt-12 bg-white rounded-lg p-8 border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-600">500+</div>
              <p className="text-sm text-slate-600 mt-2">SEBI Verified Advisors</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-600">100K+</div>
              <p className="text-sm text-slate-600 mt-2">Active Traders</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-600">25K+</div>
              <p className="text-sm text-slate-600 mt-2">Monthly Signals</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-600">100%</div>
              <p className="text-sm text-slate-600 mt-2">Track Record Transparent</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
