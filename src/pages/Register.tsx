import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, role: 'trader' },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      // Update phone
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ phone: form.phone, full_name: form.fullName }).eq('id', user.id);
      }
      toast.success('Account created! Redirecting...');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto flex max-w-md flex-col px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">Create Account</h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <div><Label>Full Name</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
          <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Register'}</Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-secondary underline">Login</Link>
        </div>
      </div>
    </div>
  );
}
