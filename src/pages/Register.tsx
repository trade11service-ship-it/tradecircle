import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sanitizeText, sanitizeName, sanitizeEmail, sanitizePhone, isValidEmail, isValidPhone } from '@/lib/sanitize';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Navbar } from '@/components/Navbar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { User, Mail, Lock, Phone, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { GENERAL_TERMS_TEXT, getDeviceInfo, getIpAddress } from '@/lib/legalTexts';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const saveLegalAcceptance = async (userId: string) => {
    const ip = await getIpAddress();
    await supabase.from('user_legal_acceptances').insert({
      user_id: userId,
      full_name: form.fullName,
      email: form.email,
      acceptance_type: 'general_terms',
      checkbox_text: GENERAL_TERMS_TEXT,
      accepted: true,
      ip_address: ip,
      user_agent: navigator.userAgent,
      device_info: getDeviceInfo(),
      page_url: window.location.href,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) { toast.error('Please accept the terms to proceed'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    const cleanEmail = sanitizeEmail(form.email);
    const cleanName = sanitizeName(form.fullName);
    const cleanPhone = sanitizePhone(form.phone);
    if (!isValidEmail(cleanEmail)) { toast.error('Please enter a valid email address'); return; }
    if (cleanPhone && !isValidPhone(cleanPhone)) { toast.error('Please enter a valid 10-digit phone number'); return; }
    if (!cleanName) { toast.error('Please enter your full name'); return; }
    
    setLoading(true);
    // Check if email already exists
    const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
    if (existingUser) {
      setLoading(false);
      toast.error('This email is already registered. Please use a different email or login.');
      return;
    }
    
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: form.password,
      options: {
        data: { full_name: cleanName, role: 'trader' },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) toast.error(error.message);
    else {
      if (data.user) {
        await saveLegalAcceptance(data.user.id);
        // Check referral cookie
        const cookie = document.cookie.split(';').find(c => c.trim().startsWith('referral_code='));
        const cookieCode = cookie?.split('=')?.[1]?.trim();
        if (cookieCode) {
          try {
            const { data: refLink } = await supabase.from('referral_links').select('*').eq('referral_code', cookieCode).eq('is_active', true).maybeSingle();
            if (refLink) {
              await supabase.from('referral_signups').insert({
                referral_code: cookieCode,
                advisor_id: refLink.advisor_id,
                group_id: refLink.group_id,
                user_id: data.user.id,
              });
              await supabase.rpc('increment_referral_signups', { _code: cookieCode });
            }
          } catch (e) { console.error('Referral signup error:', e); }
        }
      }
      setRegistered(true);
    }
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    if (!termsAccepted) { toast.error('Please accept the terms to proceed'); return; }
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + '/login',
    });
    if (error) {
      toast.error('Google sign-up failed');
      setGoogleLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex flex-col bg-off-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="tc-card-static p-8 text-center max-w-md">
            <CheckCircle className="mx-auto h-16 w-16 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Check Your Email</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              We've sent a verification link to <strong>{form.email}</strong>. 
              Please click the link in the email to verify your account before signing in.
            </p>
            <Button className="mt-6 tc-btn-click" variant="outline" onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md tc-card-static p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold text-foreground">Create Account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Join <span className="font-bold text-foreground">Trade<span className="text-primary">Circle</span></span> and start following top advisors</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required className="pl-10 tc-input-focus" placeholder="Your full name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="pl-10 tc-input-focus" placeholder="you@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} className="pl-10 pr-10 tc-input-focus" placeholder="Min 6 characters" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required className="pl-10 tc-input-focus" placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>

            {/* Legal checkbox */}
            <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
                {GENERAL_TERMS_TEXT}
              </label>
            </div>

            <Button type="submit" className="w-full py-5 font-semibold tc-btn-click" disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">or</span></div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 py-5 text-sm font-medium tc-btn-click"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {googleLoading ? 'Signing up...' : 'Continue with Google'}
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-secondary hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
      
    </div>
  );
}
