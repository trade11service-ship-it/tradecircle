import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { CheckCircle, FileText, User, Shield } from 'lucide-react';

export default function AdvisorRegister() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sebiRegNo: '', bio: '', strategyType: '',
    aadhaarNo: '', panNo: '', address: '', phone: '',
  });

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  // Must be logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex max-w-md flex-col items-center px-4 py-16">
          <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
            <Shield className="mx-auto h-16 w-16 text-secondary" />
            <h2 className="mt-4 text-xl font-bold">Login Required</h2>
            <p className="mt-2 text-sm text-muted-foreground">You need to create an account and sign in before registering as an advisor.</p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button onClick={() => navigate('/login')}>Sign In</Button>
              <Button variant="outline" onClick={() => navigate('/register')}>Create Account</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Update profile phone if provided
      if (form.phone) {
        await supabase.from('profiles').update({ phone: form.phone, role: 'advisor' }).eq('id', user.id);
      }

      // Create advisor record
      const { error: advError } = await supabase.from('advisors').insert({
        user_id: user.id,
        full_name: profile?.full_name || '',
        email: profile?.email || user.email || '',
        phone: form.phone || profile?.phone || '',
        sebi_reg_no: form.sebiRegNo,
        bio: form.bio,
        strategy_type: form.strategyType,
        aadhaar_no: form.aadhaarNo,
        pan_no: form.panNo,
        address: form.address,
        status: 'pending',
      });
      if (advError) throw advError;

      setStep(4); // Success
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    }
    setLoading(false);
  };

  const steps = [
    { num: 1, label: 'SEBI Details', icon: FileText },
    { num: 2, label: 'KYC Info', icon: Shield },
    { num: 3, label: 'Review', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-lg px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Register as Advisor</h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {profile?.full_name || user.email}</p>
        </div>

        {/* Progress */}
        {step < 4 && (
          <div className="mb-8 flex gap-1">
            {steps.map(s => (
              <div key={s.num} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${s.num <= step ? 'bg-primary' : 'bg-muted'}`} />
                <p className={`mt-2 text-xs ${s.num <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">SEBI & Strategy Details</h2>
            <div className="space-y-2">
              <Label>SEBI Registration Number *</Label>
              <Input value={form.sebiRegNo} onChange={e => update('sebiRegNo', e.target.value)} placeholder="INH000XXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Brief Bio</Label>
              <Textarea value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Tell traders about your experience and approach..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Strategy Type *</Label>
              <Select value={form.strategyType} onValueChange={v => update('strategyType', v)}>
                <SelectTrigger><SelectValue placeholder="Select your primary strategy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Options">Options</SelectItem>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Futures">Futures</SelectItem>
                  <SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => setStep(2)} disabled={!form.sebiRegNo || !form.strategyType}>Next</Button>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">KYC Information</h2>
            <div className="space-y-2">
              <Label>Aadhaar Number (12 digits) *</Label>
              <Input value={form.aadhaarNo} onChange={e => update('aadhaarNo', e.target.value.replace(/\D/g, ''))} maxLength={12} placeholder="XXXX XXXX XXXX" />
            </div>
            <div className="space-y-2">
              <Label>PAN Number (10 characters) *</Label>
              <Input value={form.panNo} onChange={e => update('panNo', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" />
            </div>
            <div className="space-y-2">
              <Label>Full Address</Label>
              <Textarea value={form.address} onChange={e => update('address', e.target.value)} placeholder="Your registered address" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!form.aadhaarNo || !form.panNo}>Review</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Review & Submit</h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p><span className="text-muted-foreground">Name:</span> <strong>{profile?.full_name}</strong></p>
                <p><span className="text-muted-foreground">Email:</span> <strong>{profile?.email}</strong></p>
                <p><span className="text-muted-foreground">Phone:</span> <strong>{form.phone || profile?.phone || '-'}</strong></p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p><span className="text-muted-foreground">SEBI Reg No:</span> <strong>{form.sebiRegNo}</strong></p>
                <p><span className="text-muted-foreground">Strategy:</span> <strong>{form.strategyType}</strong></p>
                <p><span className="text-muted-foreground">Bio:</span> {form.bio || '-'}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p><span className="text-muted-foreground">Aadhaar:</span> <strong>••••••••{form.aadhaarNo.slice(-4)}</strong></p>
                <p><span className="text-muted-foreground">PAN:</span> <strong>{form.panNo}</strong></p>
                <p><span className="text-muted-foreground">Address:</span> {form.address || '-'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
            <CheckCircle className="mx-auto h-16 w-16 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Application Submitted!</h2>
            <p className="mt-3 text-sm text-muted-foreground">Our team will verify your SEBI registration within 24-48 hours. You'll receive an email once approved.</p>
            <Button className="mt-6" onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        )}
      </div>
    </div>
  );
}
