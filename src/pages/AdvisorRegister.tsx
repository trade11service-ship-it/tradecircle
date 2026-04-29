import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeText, sanitizeTextarea, sanitizeAlphanumeric, sanitizePhone } from '@/lib/sanitize';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { CheckCircle, FileText, Shield } from 'lucide-react';
import { ADVISOR_CHECKBOX_1_TEXT, ADVISOR_CHECKBOX_2_TEXT, getDeviceInfo, getIpAddress } from '@/lib/legalTexts';

export default function AdvisorRegister() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ sebiRegNo: '', bio: '', strategyType: '', aadhaarNo: '', panNo: '', address: '', phone: '' });
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [showCheckError, setShowCheckError] = useState(false);
  const [existingAdvisor, setExistingAdvisor] = useState<any>(null);
  const [checkingAdvisor, setCheckingAdvisor] = useState(false);
  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  // Check if user is already registered as advisor
  useEffect(() => {
    if (user) {
      setCheckingAdvisor(true);
      supabase.from('advisors').select('*').eq('user_id', user.id).single().then(({ data }) => {
        if (data) setExistingAdvisor(data);
        setCheckingAdvisor(false);
      });
    }
  }, [user]);

  if (authLoading || checkingAdvisor) return <div className="flex min-h-screen items-center justify-center bg-off-white"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (!user) return (
    <div className="min-h-screen flex flex-col bg-off-white"><Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md">
          <Shield className="mx-auto h-16 w-16 text-secondary" />
          <h2 className="mt-4 text-xl font-bold">Login Required</h2>
          <p className="mt-2 text-sm text-muted-foreground">You need to create an account and sign in before registering as an advisor.</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button onClick={() => navigate('/login')} className="tc-btn-click">Sign In</Button>
            <Button variant="outline" onClick={() => navigate('/register')} className="tc-btn-click">Create Account</Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (existingAdvisor) return (
    <div className="min-h-screen flex flex-col bg-off-white"><Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md">
          <CheckCircle className="mx-auto h-16 w-16 text-primary" />
          <h2 className="mt-4 text-xl font-bold">Already Registered</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            You are already registered as an advisor on StockCircle. 
            {existingAdvisor.status === 'pending' && ' Your application is currently under review.'}
            {existingAdvisor.status === 'approved' && ' Your account is active.'}
            {existingAdvisor.status === 'rejected' && ` Your application was rejected${existingAdvisor.rejection_reason ? ': ' + existingAdvisor.rejection_reason : '.'}`}
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            {existingAdvisor.status === 'approved' && (
              <Button onClick={() => navigate('/advisor/dashboard')} className="tc-btn-click">Go to Dashboard</Button>
            )}
            <Button variant="outline" onClick={() => navigate('/')} className="tc-btn-click">Back to Home</Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );

  const handleSubmit = async () => {
    if (!check1 || !check2) {
      setShowCheckError(true);
      toast.error('Please accept all terms to proceed');
      return;
    }
    if (form.bio && form.bio.length < 80) {
      toast.error('Please write a proper bio describing your experience (minimum 80 characters)');
      return;
    }
    setLoading(true);
    try {
      if (form.phone) await supabase.from('profiles').update({ phone: sanitizePhone(form.phone) }).eq('id', user.id);
      const { data: advData, error: advError } = await supabase.from('advisors').insert({
        user_id: user.id, full_name: profile?.full_name || '', email: profile?.email || user.email || '',
        phone: sanitizePhone(form.phone || profile?.phone || ''), sebi_reg_no: sanitizeAlphanumeric(form.sebiRegNo), bio: sanitizeTextarea(form.bio),
        strategy_type: sanitizeText(form.strategyType), aadhaar_no: sanitizeAlphanumeric(form.aadhaarNo), pan_no: sanitizeAlphanumeric(form.panNo),
        address: sanitizeText(form.address), status: 'pending',
      }).select('id').single();
      if (advError) throw advError;

      // NOTE: Do NOT set role to 'advisor' here. Role stays 'trader' until admin approves.
      // Admin approval flow in AdminDashboard handles the role change.

      // Save legal acceptance
      const ip = await getIpAddress();
      await supabase.from('advisor_legal_acceptances').insert({
        advisor_id: advData.id,
        full_name: profile?.full_name || '',
        sebi_reg_no: form.sebiRegNo,
        pan_no: form.panNo,
        checkbox_1_sebi_responsibility: true,
        checkbox_1_text: ADVISOR_CHECKBOX_1_TEXT,
        checkbox_2_indemnity: true,
        checkbox_2_text: ADVISOR_CHECKBOX_2_TEXT,
        ip_address: ip,
        user_agent: navigator.userAgent,
        device_info: getDeviceInfo(),
      });

      setStep(4);
    } catch (error: any) { toast.error(error.message || 'Registration failed'); }
    setLoading(false);
  };

  const steps = [{ num: 1, label: 'SEBI Details' }, { num: 2, label: 'KYC Info' }, { num: 3, label: 'Review' }];

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="flex-1 container mx-auto max-w-lg px-4 py-12">
        <div className="mb-8">
          <h1 className="tc-page-title text-3xl">Register as Advisor</h1>
          <p className="mt-1 tc-small">Signed in as {profile?.full_name || user.email}</p>
        </div>

        {step < 4 && (
          <div className="mb-8 flex gap-1">
            {steps.map(s => (
              <div key={s.num} className="flex-1">
                <div className={`h-2 rounded-full transition-colors ${s.num <= step ? 'bg-primary' : 'bg-muted'}`} />
                <p className={`mt-2 text-xs ${s.num <= step ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="tc-card-static p-6 space-y-4">
            <h2 className="tc-card-title">SEBI & Strategy Details</h2>
            <div className="space-y-2"><Label>SEBI Registration Number *</Label><Input value={form.sebiRegNo} onChange={e => update('sebiRegNo', e.target.value)} placeholder="INH000XXXXXX" className="tc-input-focus" /></div>
            <div className="space-y-2"><Label>Phone Number</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" className="tc-input-focus" /></div>
            <div className="space-y-2"><Label>Brief Bio</Label><Textarea value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Tell traders about your experience and approach..." rows={4} /><p className={`text-xs ${form.bio.length < 80 ? 'text-orange-600' : 'text-green-600'}`}>{form.bio.length}/80 characters (minimum 80 required)</p></div>
            <div className="space-y-2">
              <Label>Strategy Type *</Label>
              <Select value={form.strategyType} onValueChange={v => update('strategyType', v)}>
                <SelectTrigger className="tc-input-focus"><SelectValue placeholder="Select your primary strategy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Options">Options</SelectItem>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Futures">Futures</SelectItem>
                  <SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full tc-btn-click font-semibold" onClick={() => setStep(2)} disabled={!form.sebiRegNo || !form.strategyType}>Next</Button>
          </div>
        )}

        {step === 2 && (
          <div className="tc-card-static p-6 space-y-4">
            <h2 className="tc-card-title">KYC Information</h2>
            <div className="space-y-2"><Label>Aadhaar Number (12 digits) *</Label><Input value={form.aadhaarNo} onChange={e => update('aadhaarNo', e.target.value.replace(/\D/g, ''))} maxLength={12} placeholder="XXXX XXXX XXXX" className="tc-input-focus" /></div>
            <div className="space-y-2"><Label>PAN Number (10 characters) *</Label><Input value={form.panNo} onChange={e => update('panNo', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" className="tc-input-focus" /></div>
            <div className="space-y-2"><Label>Full Address</Label><Textarea value={form.address} onChange={e => update('address', e.target.value)} placeholder="Your registered address" rows={3} /></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 tc-btn-click" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1 tc-btn-click font-semibold" onClick={() => setStep(3)} disabled={!form.aadhaarNo || !form.panNo}>Review</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="tc-card-static p-6 space-y-4">
            <h2 className="tc-card-title">Review & Submit</h2>
            <div className="space-y-3 text-sm">
              {[
                { items: [{ l: 'Name', v: profile?.full_name }, { l: 'Email', v: profile?.email }, { l: 'Phone', v: form.phone || profile?.phone || '-' }] },
                { items: [{ l: 'SEBI Reg No', v: form.sebiRegNo }, { l: 'Strategy', v: form.strategyType }, { l: 'Bio', v: form.bio || '-' }] },
                { items: [{ l: 'Aadhaar', v: `••••••••${form.aadhaarNo.slice(-4)}` }, { l: 'PAN', v: form.panNo }, { l: 'Address', v: form.address || '-' }] },
              ].map((group, gi) => (
                <div key={gi} className="rounded-lg bg-off-white p-4 space-y-2">
                  {group.items.map(item => (
                    <p key={item.l}><span className="text-muted-foreground">{item.l}:</span> <strong>{item.v}</strong></p>
                  ))}
                </div>
              ))}
            </div>

            {/* Legal Checkboxes */}
            <div className="space-y-2 mt-3">
              <div className="flex items-start gap-2 rounded border p-2 bg-muted/20">
                <Checkbox
                  id="check1"
                  checked={check1}
                  onCheckedChange={(checked) => { setCheck1(checked === true); setShowCheckError(false); }}
                  className="mt-0.5 shrink-0"
                />
                <label htmlFor="check1" className="text-[11px] leading-snug text-muted-foreground cursor-pointer">
                  {ADVISOR_CHECKBOX_1_TEXT}
                </label>
              </div>
              <div className="flex items-start gap-2 rounded border p-2 bg-muted/20">
                <Checkbox
                  id="check2"
                  checked={check2}
                  onCheckedChange={(checked) => { setCheck2(checked === true); setShowCheckError(false); }}
                  className="mt-0.5 shrink-0"
                />
                <label htmlFor="check2" className="text-[11px] leading-snug text-muted-foreground cursor-pointer">
                  {ADVISOR_CHECKBOX_2_TEXT}
                </label>
              </div>
              {showCheckError && (
                <p className="text-xs text-destructive font-medium">Please accept all terms to proceed</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 tc-btn-click" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1 tc-btn-click font-semibold" onClick={handleSubmit} disabled={loading || !check1 || !check2}>{loading ? 'Submitting...' : 'Submit Application'}</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="tc-card-static p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Application Submitted!</h2>
            <p className="mt-3 text-sm text-muted-foreground">Application submitted successfully. Our team will verify your details within 24-48 hours and contact you directly.</p>
            <Button className="mt-6 tc-btn-click" onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
