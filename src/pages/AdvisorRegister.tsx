import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AdvisorRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '',
    sebiRegNo: '', bio: '', strategyType: '',
    aadhaarNo: '', panNo: '', address: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [aadhaarPhoto, setAadhaarPhoto] = useState<File | null>(null);
  const [panPhoto, setPanPhoto] = useState<File | null>(null);

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from('kyc-documents').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, role: 'advisor' }, emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('User creation failed');

      // Update profile
      await supabase.from('profiles').update({ phone: form.phone, full_name: form.fullName, role: 'advisor' }).eq('id', userId);

      // Upload photos
      let profilePhotoUrl = '';
      let aadhaarPhotoUrl = '';
      let panPhotoUrl = '';

      if (profilePhoto) profilePhotoUrl = await uploadFile(profilePhoto, `${userId}/profile.${profilePhoto.name.split('.').pop()}`);
      if (aadhaarPhoto) aadhaarPhotoUrl = await uploadFile(aadhaarPhoto, `${userId}/aadhaar.${aadhaarPhoto.name.split('.').pop()}`);
      if (panPhoto) panPhotoUrl = await uploadFile(panPhoto, `${userId}/pan.${panPhoto.name.split('.').pop()}`);

      // Create advisor record
      const { error: advError } = await supabase.from('advisors').insert({
        user_id: userId,
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        sebi_reg_no: form.sebiRegNo,
        bio: form.bio,
        strategy_type: form.strategyType,
        aadhaar_no: form.aadhaarNo,
        pan_no: form.panNo,
        address: form.address,
        profile_photo_url: profilePhotoUrl,
        aadhaar_photo_url: aadhaarPhotoUrl,
        pan_photo_url: panPhotoUrl,
        status: 'pending',
      });
      if (advError) throw advError;

      setStep(5); // Success
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    }
    setLoading(false);
  };

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-lg px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold">Register as Advisor</h1>
        <p className="mb-6 text-sm text-muted-foreground">Step {Math.min(step, 4)} of 4</p>

        {/* Progress */}
        <div className="mb-8 flex gap-1">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1 flex-1 rounded ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Account Details</h2>
            <div><Label>Full Name</Label><Input value={form.fullName} onChange={e => update('fullName', e.target.value)} required /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} required /></div>
            <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => update('password', e.target.value)} required minLength={6} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} required /></div>
            <Button className="w-full" onClick={() => setStep(2)} disabled={!form.fullName || !form.email || !form.password}>Next</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">SEBI Details</h2>
            <div><Label>SEBI Registration Number</Label><Input value={form.sebiRegNo} onChange={e => update('sebiRegNo', e.target.value)} required /></div>
            <div><Label>Brief Bio</Label><Textarea value={form.bio} onChange={e => update('bio', e.target.value)} /></div>
            <div>
              <Label>Strategy Type</Label>
              <Select value={form.strategyType} onValueChange={v => update('strategyType', v)}>
                <SelectTrigger><SelectValue placeholder="Select strategy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Options">Options</SelectItem>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Futures">Futures</SelectItem>
                  <SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!form.sebiRegNo || !form.strategyType}>Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">KYC Documents</h2>
            <div><Label>Aadhaar Number (12 digits)</Label><Input value={form.aadhaarNo} onChange={e => update('aadhaarNo', e.target.value)} maxLength={12} /></div>
            <div><Label>PAN Number (10 chars)</Label><Input value={form.panNo} onChange={e => update('panNo', e.target.value.toUpperCase())} maxLength={10} /></div>
            <div><Label>Profile Photo</Label><Input type="file" accept="image/*" onChange={e => setProfilePhoto(e.target.files?.[0] || null)} /></div>
            <div><Label>Aadhaar Card Photo</Label><Input type="file" accept="image/*" onChange={e => setAadhaarPhoto(e.target.files?.[0] || null)} /></div>
            <div><Label>PAN Card Photo</Label><Input type="file" accept="image/*" onChange={e => setPanPhoto(e.target.files?.[0] || null)} /></div>
            <div><Label>Full Address</Label><Textarea value={form.address} onChange={e => update('address', e.target.value)} /></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(4)}>Review</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & Submit</h2>
            <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
              <p><strong>Name:</strong> {form.fullName}</p>
              <p><strong>Email:</strong> {form.email}</p>
              <p><strong>Phone:</strong> {form.phone}</p>
              <p><strong>SEBI Reg No:</strong> {form.sebiRegNo}</p>
              <p><strong>Strategy:</strong> {form.strategyType}</p>
              <p><strong>Aadhaar:</strong> {form.aadhaarNo}</p>
              <p><strong>PAN:</strong> {form.panNo}</p>
              <p><strong>Address:</strong> {form.address}</p>
              <p><strong>Photos:</strong> {[profilePhoto?.name, aadhaarPhoto?.name, panPhoto?.name].filter(Boolean).join(', ') || 'None'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="rounded-lg border bg-card p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-bold">Application Submitted!</h2>
            <p className="mt-2 text-muted-foreground">Our team will verify your SEBI registration within 24-48 hours. You'll receive an email once approved.</p>
            <Button className="mt-6" onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        )}
      </div>
    </div>
  );
}
