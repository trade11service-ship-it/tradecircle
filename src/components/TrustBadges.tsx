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
      description: 'Every advisor manually verified against SEBI records',
    },
    {
      icon: BarChart3,
      title: 'Tamper-Proof Records',
      description: 'Full WIN/LOSS history — cannot be deleted or edited',
    },
    {
      icon: Zap,
      title: 'Telegram Alerts',
      description: 'Real-time signals delivered instantly to your phone',
    },
    {
      icon: Users,
      title: '₹0 Listing Fee',
      description: 'No hidden charges for advisors to get listed',
    },
  ];

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        {variant === 'full' && (
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Why Choose StockCircle?
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Everything you need to find verified, trusted trading advisors with proven track records
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div
                key={index}
                className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{badge.title}</h3>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Bar - honest numbers */}
        <div className="mt-10 rounded-xl border border-border bg-card p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">100%</div>
              <p className="text-xs text-muted-foreground mt-1">SEBI Verified</p>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">₹0</div>
              <p className="text-xs text-muted-foreground mt-1">Listing Fee</p>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">24hr</div>
              <p className="text-xs text-muted-foreground mt-1">Verification Time</p>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground mt-1">Lock-in Period</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
