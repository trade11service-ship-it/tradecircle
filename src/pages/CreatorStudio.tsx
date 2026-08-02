import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  COURSE_CATEGORIES,
  EDU_DISCLAIMER,
  findBannedWords,
  formatINR,
  PLATFORM_COMMISSION_PERCENT,
  splitAmount,
} from '@/lib/courses';
import { sanitizeAlphanumeric, sanitizeName, sanitizeText, sanitizeTextarea } from '@/lib/sanitize';
import { acceptFor, checkUpload, UPLOAD_RULES } from '@/lib/uploadGuard';
import { setMetaTags } from '@/lib/seo';
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Clock,
  IndianRupee,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react';

type CreatorProfile = {
  id: string;
  full_legal_name: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  youtube_channel: string | null;
  pan_masked: string | null;
  kyc_status: string;
  rejection_reason: string | null;
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number;
  course_type: string;
  cover_image_url: string | null;
  review_status: string;
  rejection_reason: string | null;
  is_visible: boolean;
  created_at: string;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  content_type: string;
  duration_label: string | null;
  sort_order: number;
};

type LedgerRow = { id: string; amount: number; status: string; created_at: string };

const TABS = [
  { key: 'courses', label: 'My courses', icon: BookOpen },
  { key: 'upload', label: 'New course', icon: Plus },
  { key: 'payouts', label: 'Earnings & payouts', icon: Wallet },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-emerald/10 text-emerald border-emerald/30',
  pending_review: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  unverified: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  pending_review: 'Under review',
  rejected: 'Rejected',
  unverified: 'Not verified',
};

export default function CreatorStudio() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabKey>('courses');
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [sales, setSales] = useState<{ gross: number; net: number; count: number }>({ gross: 0, net: 0, count: 0 });

  // onboarding form
  const [legalName, setLegalName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [agree, setAgree] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // course form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(COURSE_CATEGORIES[0]);
  const [price, setPrice] = useState('999');
  const [courseType, setCourseType] = useState('video');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [eduConfirm, setEduConfirm] = useState(false);
  const [creating, setCreating] = useState(false);

  // module upload
  const [uploadCourseId, setUploadCourseId] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDuration, setModuleDuration] = useState('');
  const [moduleFile, setModuleFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // payout form
  const [pan, setPan] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [holder, setHolder] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setMetaTags({
      title: 'Creator Studio | RA Circle',
      description: 'Publish, manage and monetise education-only market courses on RA Circle.',
    });
  }, []);

  const loadAll = async (creatorId: string) => {
    const [{ data: cs }, { data: ms }, { data: lg }, { data: ps }] = await Promise.all([
      supabase.from('courses').select('*').eq('creator_id', creatorId).order('created_at', { ascending: false }),
      supabase.from('course_modules').select('id, course_id, title, content_type, duration_label, sort_order'),
      supabase.from('creator_payout_ledger').select('id, amount, status, created_at').eq('creator_id', creatorId).order('created_at', { ascending: false }),
      supabase.from('course_purchases').select('total_amount, creator_payout_amount').eq('creator_id', creatorId).eq('payment_status', 'captured'),
    ]);
    setCourses((cs as Course[]) ?? []);
    setModules((ms as Module[]) ?? []);
    setLedger((lg as LedgerRow[]) ?? []);
    const rows = (ps as { total_amount: number; creator_payout_amount: number }[]) ?? [];
    setSales({
      gross: rows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      net: rows.reduce((s, r) => s + Number(r.creator_payout_amount || 0), 0),
      count: rows.length,
    });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login?redirect=/creator-studio', { replace: true }); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('creator_profiles')
        .select('id, full_legal_name, email, phone, instagram_handle, youtube_channel, pan_masked, kyc_status, rejection_reason')
        .eq('user_id', user.id)
        .maybeSingle();
      const c = data as CreatorProfile | null;
      setCreator(c);
      setLegalName(c?.full_legal_name ?? profile?.full_name ?? '');
      if (c) await loadAll(c.id);
      setLoading(false);
    })();
  }, [user, authLoading, navigate, profile?.full_name]);

  const createProfile = async () => {
    if (!user) return;
    if (legalName.trim().length < 3) {
      toast({ title: 'Enter your full legal name', variant: 'destructive' });
      return;
    }
    setSavingProfile(true);
    const { data, error } = await supabase
      .from('creator_profiles')
      .insert({
        user_id: user.id,
        full_legal_name: sanitizeName(legalName),
        email: profile?.email ?? user.email ?? null,
        phone: profile?.phone ?? null,
        instagram_handle: instagram ? sanitizeText(instagram).slice(0, 60) : null,
        youtube_channel: youtube ? sanitizeText(youtube).slice(0, 120) : null,
      })
      .select('id, full_legal_name, email, phone, instagram_handle, youtube_channel, pan_masked, kyc_status, rejection_reason')
      .single();
    setSavingProfile(false);
    if (error) {
      toast({ title: 'Could not create creator account', description: error.message, variant: 'destructive' });
      return;
    }
    setCreator(data as CreatorProfile);
    toast({ title: 'Creator account ready', description: 'Upload your first course to enter the review queue.' });
    setTab('upload');
  };

  const bannedHits = useMemo(() => findBannedWords(title, description), [title, description]);

  const createCourse = async () => {
    if (!creator) return;
    const cleanTitle = sanitizeText(title);
    const cleanDesc = sanitizeTextarea(description);
    if (cleanTitle.length < 6) { toast({ title: 'Give your course a longer title', variant: 'destructive' }); return; }
    if (bannedHits.length) {
      toast({
        title: 'Non-compliant wording',
        description: `Remove: ${bannedHits.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }
    if (!eduConfirm) { toast({ title: 'Confirm the education-only declaration', variant: 'destructive' }); return; }

    setCreating(true);

    // Always re-resolve the creator row so storage policies see a live id
    const { data: liveCreator } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle();
    const creatorId = (liveCreator as { id: string } | null)?.id ?? creator.id;

    let coverUrl: string | null = null;
    if (coverFile) {
      const check = await checkUpload(coverFile, 'image');
      if (!check.ok) {
        setCreating(false);
        toast({ title: 'Cover rejected', description: check.error, variant: 'destructive' });
        return;
      }
      const path = `course-covers/${creatorId}/${crypto.randomUUID()}.${check.ext}`;
      const { error: upErr } = await supabase.storage
        .from('group-media')
        .upload(path, coverFile, { upsert: false, contentType: check.detected ?? coverFile.type });
      if (upErr) {
        setCreating(false);
        toast({ title: 'Cover upload failed', description: upErr.message, variant: 'destructive' });
        return;
      }
      coverUrl = supabase.storage.from('group-media').getPublicUrl(path).data.publicUrl;
    }


    const { data, error } = await supabase
      .from('courses')
      .insert({
        creator_id: creator.id,
        title: cleanTitle,
        description: cleanDesc,
        category,
        price: Math.max(0, parseInt(price.replace(/[^\d]/g, ''), 10) || 0),
        course_type: courseType,
        cover_image_url: coverUrl,
        platform_commission_percent: PLATFORM_COMMISSION_PERCENT,
      })
      .select('*')
      .single();
    setCreating(false);
    if (error) {
      toast({ title: 'Could not save course', description: error.message, variant: 'destructive' });
      return;
    }
    setCourses((prev) => [data as Course, ...prev]);
    setUploadCourseId((data as Course).id);
    setTitle(''); setDescription(''); setCoverFile(null); setEduConfirm(false);
    toast({ title: 'Draft created', description: 'Now upload lessons, then submit for review.' });
    setTab('courses');
  };

  const uploadModule = async () => {
    if (!creator || !uploadCourseId || !moduleFile) {
      toast({ title: 'Pick a course and a file', variant: 'destructive' });
      return;
    }
    const cleanTitle = sanitizeText(moduleTitle) || moduleFile.name.replace(/\.[^.]+$/, '');
    const check = await checkUpload(moduleFile, 'course-media');
    if (!check.ok) {
      toast({ title: 'File rejected', description: check.error, variant: 'destructive' });
      return;
    }
    const isPdf = check.detected === 'application/pdf';
    if (isPdf && moduleFile.size > UPLOAD_RULES.pdf.maxBytes) {
      toast({ title: 'PDF too large', description: 'E-books must be under 50MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const { data: liveCreator } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle();
    const creatorId = (liveCreator as { id: string } | null)?.id ?? creator.id;
    const path = `${creatorId}/${uploadCourseId}/${crypto.randomUUID()}.${check.ext}`;
    const { error: upErr } = await supabase.storage
      .from('courses-content')
      .upload(path, moduleFile, { upsert: false, contentType: check.detected ?? moduleFile.type });

    if (upErr) {
      setUploading(false);
      toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' });
      return;
    }
    const nextOrder = modules.filter((m) => m.course_id === uploadCourseId).length;
    const { data, error } = await supabase
      .from('course_modules')
      .insert({
        course_id: uploadCourseId,
        title: cleanTitle,
        content_type: isPdf ? 'pdf_ebook' : 'video',
        file_storage_path: path,
        duration_label: moduleDuration ? sanitizeText(moduleDuration).slice(0, 20) : null,
        sort_order: nextOrder,
      })
      .select('id, course_id, title, content_type, duration_label, sort_order')
      .single();
    setUploading(false);
    if (error) {
      toast({ title: 'Could not save lesson', description: error.message, variant: 'destructive' });
      return;
    }
    setModules((prev) => [...prev, data as Module]);
    setModuleTitle(''); setModuleDuration(''); setModuleFile(null);
    toast({ title: 'Lesson uploaded' });
  };

  const deleteModule = async (m: Module) => {
    const { error } = await supabase.from('course_modules').delete().eq('id', m.id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setModules((prev) => prev.filter((x) => x.id !== m.id));
  };

  const submitForReview = async (course: Course) => {
    const count = modules.filter((m) => m.course_id === course.id).length;
    if (count === 0) { toast({ title: 'Add at least one lesson first', variant: 'destructive' }); return; }
    const { error } = await supabase.functions.invoke('course-content-scan', { body: { course_id: course.id } });
    if (error) { toast({ title: 'Submission failed', description: error.message, variant: 'destructive' }); return; }
    const { error: updErr } = await supabase
      .from('courses')
      .update({ review_status: 'pending_review', rejection_reason: null })
      .eq('id', course.id);
    if (updErr) { toast({ title: 'Submission failed', description: updErr.message, variant: 'destructive' }); return; }
    setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, review_status: 'pending_review', rejection_reason: null } : c)));
    toast({ title: 'Sent for review', description: 'Our compliance team will respond shortly.' });
  };

  const toggleVisibility = async (course: Course) => {
    const next = !course.is_visible;
    const { error } = await supabase.from('courses').update({ is_visible: next }).eq('id', course.id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, is_visible: next } : c)));
  };

  const verifyPayout = async () => {
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke('creator-kyc-verify', {
      body: {
        full_legal_name: legalName,
        pan,
        bank_account_number: bankAccount,
        bank_ifsc: ifsc,
        bank_account_holder_name: holder,
      },
    });
    setVerifying(false);
    const payload = data as { error?: string; pan_masked?: string } | null;
    if (error || payload?.error) {
      toast({ title: 'Verification failed', description: payload?.error ?? error?.message, variant: 'destructive' });
      return;
    }
    setCreator((prev) => (prev ? { ...prev, kyc_status: 'approved', pan_masked: payload?.pan_masked ?? prev.pan_masked } : prev));
    setPan(''); setBankAccount(''); setIfsc(''); setHolder('');
    toast({ title: 'Payout details verified', description: 'Your approved courses can now go live.' });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ---------- Onboarding gate ---------- */
  if (!creator) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Creator Studio</p>
          <h1 className="mt-2 text-[24px] font-extrabold leading-tight text-foreground">
            Teach markets. Keep {100 - PLATFORM_COMMISSION_PERCENT}% of every sale.
          </h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            Creator accounts are completely separate from SEBI advisor registration. You may publish education
            only — never live calls, tips, or portfolio advice.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <Label className="text-[12.5px] font-semibold">Full legal name</Label>
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="As printed on your PAN" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-[12.5px] font-semibold">Instagram (optional)</Label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="@handle" />
              </div>
              <div>
                <Label className="text-[12.5px] font-semibold">YouTube (optional)</Label>
                <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Channel URL" />
              </div>
            </div>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              <span className="text-[12.5px] leading-relaxed text-foreground">
                I confirm my content is educational only and contains no stock recommendations, buy/sell calls,
                or assured-return claims. {EDU_DISCLAIMER}
              </span>
            </label>
            <Button className="w-full h-11 rounded-xl" disabled={!agree || savingProfile} onClick={createProfile}>
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create creator account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const netEarnings = sales.net;
  const pendingPayout = ledger.filter((l) => l.status === 'accrued').reduce((s, l) => s + Number(l.amount), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 pb-12">
      {/* Header */}
      <div className="rounded-2xl bg-foreground p-5 text-background">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-background/60">Creator Studio</p>
        <h1 className="mt-1 text-[22px] font-extrabold">{creator.full_legal_name}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-[12px]">
          <span className="text-background/70">Lifetime sales <b className="text-background">{formatINR(sales.gross)}</b></span>
          <span className="text-background/70">Net earnings <b className="text-background">{formatINR(netEarnings)}</b></span>
          <span className="text-background/70">Enrolments <b className="text-background">{sales.count}</b></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
              tab === t.key ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Courses */}
      {tab === 'courses' && (
        <div className="mt-4 space-y-4">
          {courses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <BookOpen className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-3 text-[14px] font-bold text-foreground">No courses yet</p>
              <Button className="mt-4 rounded-xl" onClick={() => setTab('upload')}>Create your first course</Button>
            </div>
          )}

          {courses.map((c) => {
            const mods = modules.filter((m) => m.course_id === c.id).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[15.5px] font-extrabold leading-snug text-foreground">{c.title}</h2>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {c.category || 'General'} · {c.price === 0 ? 'Free' : formatINR(c.price)} · {mods.length} lesson{mods.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className={`rounded-md border px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide ${STATUS_STYLES[c.review_status] ?? STATUS_STYLES.unverified}`}>
                    {STATUS_LABELS[c.review_status] ?? c.review_status}
                  </span>
                </div>

                {c.review_status === 'rejected' && c.rejection_reason && (
                  <p className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-[12px] text-destructive">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {c.rejection_reason}
                  </p>
                )}

                {mods.length > 0 && (
                  <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                    {mods.map((m, i) => (
                      <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                        <span className="w-4 text-[11px] font-bold text-muted-foreground">{i + 1}</span>
                        <span className="flex-1 truncate text-[13px] text-foreground">{m.title}</span>
                        <span className="text-[10.5px] uppercase text-muted-foreground">{m.content_type === 'pdf_ebook' ? 'PDF' : 'Video'}</span>
                        {c.review_status !== 'approved' && (
                          <button onClick={() => deleteModule(m)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Delete lesson">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { setUploadCourseId(c.id); setTab('upload'); }}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Add lesson
                  </Button>
                  {c.review_status !== 'approved' && (
                    <Button size="sm" className="rounded-lg" onClick={() => submitForReview(c)}>
                      Submit for review
                    </Button>
                  )}
                  {c.review_status === 'approved' && (
                    <Button size="sm" variant={c.is_visible ? 'outline' : 'default'} className="rounded-lg" onClick={() => toggleVisibility(c)}>
                      {c.is_visible ? 'Unlist from marketplace' : 'Publish to marketplace'}
                    </Button>
                  )}
                </div>

                {c.review_status === 'approved' && creator.kyc_status !== 'approved' && (
                  <p className="mt-3 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[12px] text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    Verify your payout details to make this course purchasable.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New course + lesson upload */}
      {tab === 'upload' && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-[15px] font-extrabold text-foreground">Course details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-[12.5px] font-semibold">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Price action for Indian equities" />
              </div>
              <div>
                <Label className="text-[12.5px] font-semibold">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1.5 rounded-xl" placeholder="What learners will be able to do after this course" />
              </div>
              {bannedHits.length > 0 && (
                <p className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-[12px] text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Non-compliant wording detected: <b>{bannedHits.join(', ')}</b>
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[12.5px] font-semibold">Category</Label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-[14px]">
                    {COURSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[12.5px] font-semibold">Format</Label>
                  <select value={courseType} onChange={(e) => setCourseType(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-[14px]">
                    <option value="video">Video course</option>
                    <option value="ebook">E-book / PDF</option>
                    <option value="hybrid">Video + PDF</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-[12.5px] font-semibold">Price (INR)</Label>
                <div className="relative mt-1.5">
                  <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" className="h-11 rounded-xl pl-9" />
                </div>
                <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                  You receive {formatINR(splitAmount(parseInt(price || '0', 10)).creatorNet)} per sale after the {PLATFORM_COMMISSION_PERCENT}% platform fee.
                </p>
              </div>
              <div>
                <Label className="text-[12.5px] font-semibold">Cover image</Label>
                <Input type="file" accept={acceptFor('image')} onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="mt-1.5 h-11 rounded-xl" />
                <p className="mt-1.5 text-[11.5px] text-muted-foreground">{UPLOAD_RULES.image.label}. SVG and script-bearing files are blocked.</p>
              </div>
              <label className="flex cursor-pointer gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <Checkbox checked={eduConfirm} onCheckedChange={(v) => setEduConfirm(!!v)} className="mt-0.5" />
                <span className="text-[12.5px] leading-relaxed text-foreground">
                  I declare this course is educational only, with no live calls or assured returns.
                </span>
              </label>
              <Button className="h-11 w-full rounded-xl" disabled={creating} onClick={createCourse}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save draft
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-[15px] font-extrabold text-foreground">Upload a lesson</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Files are stored privately and streamed through expiring, watermarked links only.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-[12.5px] font-semibold">Course</Label>
                <select value={uploadCourseId} onChange={(e) => setUploadCourseId(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-[14px]">
                  <option value="">Select a course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[12.5px] font-semibold">Lesson title</Label>
                  <Input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Module 1 — Market structure" />
                </div>
                <div>
                  <Label className="text-[12.5px] font-semibold">Duration (optional)</Label>
                  <Input value={moduleDuration} onChange={(e) => setModuleDuration(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="12 min" />
                </div>
              </div>
              <div>
                <Label className="text-[12.5px] font-semibold">Video (MP4) or PDF</Label>
                <Input type="file" accept={acceptFor('course-media')} onChange={(e) => setModuleFile(e.target.files?.[0] ?? null)} className="mt-1.5 h-11 rounded-xl" />
                <p className="mt-1.5 text-[11.5px] text-muted-foreground">{UPLOAD_RULES['course-media'].label}. Every file is scanned for scripts and disguised executables.</p>
              </div>
              <Button className="h-11 w-full rounded-xl" disabled={uploading} onClick={uploadModule}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {uploading ? 'Uploading' : 'Upload lesson'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payouts */}
      {tab === 'payouts' && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Gross sales', value: formatINR(sales.gross) },
              { label: 'Your net share', value: formatINR(netEarnings) },
              { label: 'Awaiting settlement', value: formatINR(pendingPayout) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-[20px] font-extrabold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-extrabold text-foreground">Payout identity</h2>
              <span className={`rounded-md border px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide ${STATUS_STYLES[creator.kyc_status] ?? STATUS_STYLES.unverified}`}>
                {STATUS_LABELS[creator.kyc_status] ?? creator.kyc_status}
              </span>
            </div>

            {creator.kyc_status === 'approved' ? (
              <p className="mt-3 flex items-center gap-2 text-[13px] text-foreground">
                <BadgeCheck className="h-4 w-4 text-emerald" />
                Verified{creator.pan_masked ? ` · PAN ${creator.pan_masked}` : ''}. Settlements run on a
                weekly cycle.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  Your PAN is encrypted server-side and never stored in readable form. These details are used
                  only for marketplace payouts and are isolated from SEBI advisor records.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-[12.5px] font-semibold">PAN</Label>
                    <Input value={pan} onChange={(e) => setPan(sanitizeAlphanumeric(e.target.value).slice(0, 10))} className="mt-1.5 h-11 rounded-xl" placeholder="ABCDE1234F" />
                  </div>
                  <div>
                    <Label className="text-[12.5px] font-semibold">Account holder name</Label>
                    <Input value={holder} onChange={(e) => setHolder(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-[12.5px] font-semibold">Bank account number</Label>
                    <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" className="mt-1.5 h-11 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-[12.5px] font-semibold">IFSC</Label>
                    <Input value={ifsc} onChange={(e) => setIfsc(sanitizeAlphanumeric(e.target.value).slice(0, 11))} className="mt-1.5 h-11 rounded-xl" placeholder="HDFC0001234" />
                  </div>
                </div>
                <Button className="h-11 w-full rounded-xl" disabled={verifying} onClick={verifyPayout}>
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify payout details
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-[15px] font-extrabold text-foreground">Settlement ledger</h2>
            {ledger.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted-foreground">No entries yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {ledger.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2 text-[13px] text-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(l.created_at).toLocaleDateString('en-IN')}
                    </span>
                    <span className="text-[13px] font-bold text-foreground">{formatINR(Number(l.amount))}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{l.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
