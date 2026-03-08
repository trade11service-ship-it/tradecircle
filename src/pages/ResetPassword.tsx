import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // No redirect check needed - auth provider handles PASSWORD_RECOVERY navigation

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else { toast.success('Password updated successfully!'); navigate('/login'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto flex max-w-md flex-col px-4 py-12">
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Set New Password</h1>
          <p className="mb-6 text-sm text-muted-foreground">Enter your new password below</p>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="pl-10 pr-10" placeholder="Min 6 characters" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} className="pl-10" placeholder="Confirm password" />
              </div>
            </div>
            <Button type="submit" className="w-full py-5" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
