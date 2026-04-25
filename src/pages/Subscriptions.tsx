import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CheckCircle, X, ArrowRight, Clock3 } from "lucide-react";
import { setMetaTags, SEO_CONFIG } from "@/lib/seo";

interface Subscription {
  id: string;
  group_id: string;
  group_name: string;
  advisor_name: string;
  monthly_price: number;
  status: string;
  start_date: string;
  end_date: string;
  advisor_id: string;
}

export default function Subscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Set meta tags
  useEffect(() => {
    setMetaTags(SEO_CONFIG.subscriptions);
  }, []);

  useEffect(() => {
    if (user) fetchSubscriptions();
  }, [user]);

  const fetchSubscriptions = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("subscriptions")
      .select("id, group_id, status, start_date, end_date, groups!inner(name, monthly_price, advisor_id, advisors!inner(full_name))")
      .eq("user_id", user!.id)
      .gte("end_date", now)
      .order("start_date", { ascending: false });

    const formatted = (data || []).map((sub: any) => ({
      id: sub.id,
      group_id: sub.group_id,
      group_name: sub.groups.name,
      advisor_name: sub.groups.advisors.full_name,
      monthly_price: sub.groups.monthly_price,
      status: sub.status,
      start_date: sub.start_date,
      end_date: sub.end_date,
      advisor_id: sub.groups.advisor_id,
    }));

    setSubscriptions(formatted);
    setLoading(false);
  };

  const handleCancel = async (subscriptionId: string) => {
    if (window.confirm("Are you sure? You'll lose access to this advisor's signals.")) {
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled", end_date: new Date().toISOString() })
        .eq("id", subscriptionId);
      setSubscriptions(subscriptions.filter((s) => s.id !== subscriptionId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading subscriptions...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground">
            Renew, track expiry, and jump back into signals quickly.
          </p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              No Active Subscriptions Yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Browse SEBI verified advisors and subscribe to get trading signals delivered to Telegram.
            </p>
            <Link to="/discover">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Browse Verified Advisors
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Subscriptions List */}
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground">
                        {sub.group_name}
                      </h3>
                      {sub.status === "active" && (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-3">
                      By <strong>{sub.advisor_name}</strong>
                    </p>

                    <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Price
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          ₹{sub.monthly_price}/mo
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Subscribed Since
                        </p>
                        <p className="font-semibold text-foreground">
                          {new Date(sub.start_date).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Active Until
                        </p>
                        <p className="font-semibold text-foreground">
                          {new Date(sub.end_date).toLocaleDateString("en-IN")}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86400000))} day(s) left
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link to={`/advisor/${sub.advisor_id}`}>
                      <Button variant="outline" className="w-full">
                        View Profile
                      </Button>
                    </Link>
                    <Link to="/home">
                      <Button variant="secondary" className="w-full">
                        View Signals <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancel(sub.id)}
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <h3 className="font-bold text-foreground mb-3">
                💡 How to Get More from Your Subscriptions
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  ✓ Enable Telegram notifications for instant signal alerts
                </li>
                <li>
                  ✓ Follow advisors on the Discover page to track their public signals
                </li>
                <li>
                  ✓ Check track records to verify advisor accuracy over time
                </li>
                <li>
                  ✓ Cancel and resubscribe anytime—no penalties or lock-in
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-10 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">
            Explore Premium Advisors
          </h2>
          <p className="mb-6 text-white/90">
            Find SEBI verified advisors with proven track records and real-time signal delivery.
          </p>
          <Link to="/discover">
            <Button size="lg" className="bg-white text-green-600 hover:bg-white/90 font-bold">
              Browse All Advisors
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
