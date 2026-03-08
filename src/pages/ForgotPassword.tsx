import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex max-w-md flex-col items-center px-4 py-16">
          <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
            <CheckCircle className="mx-auto h-16 w-16 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Check Your Email</h2>
            <p className="mt-3 text-sm text-muted-foreground">We've sent a password reset link to <strong>{email}</strong>.</p>
            <Link to="/login"><Button className="mt-6" variant="outline">Back to Login</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto flex max-w-md flex-col px-4 py-12">
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Forgot Password</h1>
          <p className="mb-6 text-sm text-muted-foreground">Enter your email to receive a reset link</p>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="pl-10" placeholder="you@example.com" />
              </div>
            </div>
            <Button type="submit" className="w-full py-5" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-secondary hover:underline">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
