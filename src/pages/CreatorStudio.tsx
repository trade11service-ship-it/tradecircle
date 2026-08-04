import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import LessonUploader, { type LessonDraft } from '@/components/creator/LessonUploader';
import CourseEditor, { type CourseEditValues } from '@/components/creator/CourseEditor';
import { setMetaTags } from '@/lib/seo';

import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Clock,
  IndianRupee,
  LayoutDashboard,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  UserRound,
  Wallet,
  XCircle,
  PlayCircle,
  Banknote,
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
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  intro_video_url: string | null;
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
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'courses', label: 'My courses', icon: BookOpen },
  { key: 'upload', label: 'New course', icon: Plus },
  { key: 'payouts', label: 'Earnings & payouts', icon: Wallet },
  { key: 'profile', label: 'Public profile', icon: UserRound },
] as const;
type TabKey = (typeof TABS)[number]['key'];


const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  approved: 'bg-emerald/10 text-emerald border-emerald/30',
  pending_review: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  unverified: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  pending_review: 'Under review',
  rejected: 'Rejected',
  unverified: 'Not verified',
};


export default function CreatorStudio() {
  const { user, profile, loading: authLoading, refreshCreator } = useAuth();
  const userId = user?.id ?? null;
  const profileName = profile?.full_name ?? '';
  const bootstrapped = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();


  const [tab, setTab] = useState<TabKey>('overview');
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

  // per-course inline panels
  const [lessonPanelId, setLessonPanelIdState] = useState<string | null>(() => sessionStorage.getItem('creator_lesson_panel'));
  const [editPanelId, setEditPanelId] = useState<string | null>(null);

  const setLessonPanelId = useCallback((courseId: string | null) => {
    setLessonPanelIdState(courseId);
    if (courseId) sessionStorage.setItem('creator_lesson_panel', courseId);
    else sessionStorage.removeItem('creator_lesson_panel');
  }, []);


  // payout form
  const [pan, setPan] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [holder, setHolder] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [payout, setPayout] = useState<{ unsettled: number; settled: number; pending_requests: number; available: number } | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // public profile form
  const [bio, setBio] = useState('');
  const [savingPublic, setSavingPublic] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState<'avatar' | 'banner' | 'intro' | null>(null);

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
    const { data: ps2 } = await supabase.rpc('creator_payout_summary');
    if (ps2) setPayout(ps2 as unknown as { unsettled: number; settled: number; pending_requests: number; available: number });
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
    let cancelled = false;
    (async () => {
      // Only blank the page out on the very first load. A silent background refresh
      // must never unmount the upload panels (mobile fires auth/focus events when
      // returning from the file picker).
      if (!bootstrapped.current) setLoading(true);
      const { data } = await supabase
        .from('creator_profiles')
        .select('id, full_legal_name, email, phone, instagram_handle, youtube_channel, pan_masked, kyc_status, rejection_reason, avatar_url, banner_url, bio, intro_video_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const c = data as CreatorProfile | null;
      setCreator(c);
      setLegalName((prev) => prev || c?.full_legal_name || profileName || '');
      setBio((prev) => prev || c?.bio || '');
      if (c) await loadAll(c.id);
      if (cancelled) return;
      bootstrapped.current = true;
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoading]);

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
      .select('id, full_legal_name, email, phone, instagram_handle, youtube_channel, pan_masked, kyc_status, rejection_reason, avatar_url, banner_url, bio, intro_video_url')
      .single();
    setSavingProfile(false);
    if (error) {
      toast({ title: 'Could not create creator account', description: error.message, variant: 'destructive' });
      return;
    }
    setCreator(data as CreatorProfile);
    await refreshCreator();
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
        review_status: 'draft',
        is_visible: false,
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
    setLessonPanelId((data as Course).id);
    setTitle(''); setDescription(''); setCoverFile(null); setEduConfirm(false);
    toast({ title: 'Draft created', description: 'Now upload lessons, then submit for review.' });
    setTab('courses');

  };

  const uploadModule = async (courseId: string, draft: LessonDraft): Promise<boolean> => {
    if (!creator) return false;
    const course = courses.find((c) => c.id === courseId);
    const cleanTitle = sanitizeText(draft.title) || draft.file.name.replace(/\.[^.]+$/, '');
    const check = await checkUpload(draft.file, 'course-media');
    if (!check.ok) {
      toast({ title: 'File rejected', description: check.error, variant: 'destructive' });
      return false;
    }
    const isPdf = check.detected === 'application/pdf';
    if (isPdf && draft.file.size > UPLOAD_RULES.pdf.maxBytes) {
      toast({ title: 'PDF too large', description: 'E-books must be under 50MB.', variant: 'destructive' });
      return false;
    }
    const { data: liveCreator } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle();
    const creatorId = (liveCreator as { id: string } | null)?.id ?? creator.id;
    const path = `${creatorId}/${courseId}/${crypto.randomUUID()}.${check.ext}`;
    let upErr: Error | null = null;
    try {
      const result = await supabase.storage
        .from('courses-content')
        .upload(path, draft.file, { upsert: false, contentType: check.detected ?? draft.file.type });
      upErr = result.error;
    } catch (error) {
      upErr = error instanceof Error ? error : new Error('The upload was interrupted. Please try again.');
    }

    if (upErr) {
      toast({ title: 'Upload failed', description: upErr.message || 'The connection was interrupted. Please try again.', variant: 'destructive' });
      return false;
    }
    const nextOrder = modules.filter((m) => m.course_id === courseId).length;
    const { data, error } = await supabase
      .from('course_modules')
      .insert({
        course_id: courseId,
        title: cleanTitle,
        content_type: isPdf ? 'pdf_ebook' : 'video',
        file_storage_path: path,
        duration_label: draft.duration ? sanitizeText(draft.duration).slice(0, 20) : null,
        sort_order: nextOrder,
      })
      .select('id, course_id, title, content_type, duration_label, sort_order')
      .single();
    if (error) {
      toast({ title: 'Could not save lesson', description: error.message, variant: 'destructive' });
      return false;
    }
    setModules((prev) => [...prev, data as Module]);

    // Any new lesson on a live course must be re-reviewed before it goes back out.
    if (course?.review_status === 'approved') {
      await supabase
        .from('courses')
        .update({ review_status: 'pending_review', is_visible: false, rejection_reason: null })
        .eq('id', courseId);
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, review_status: 'pending_review', is_visible: false, rejection_reason: null } : c)),
      );
      toast({ title: 'Lesson uploaded', description: 'Course sent back for compliance review.' });
    } else {
      toast({ title: 'Lesson uploaded' });
    }
    return true;
  };

  const saveCourseDetails = async (courseId: string, values: CourseEditValues): Promise<boolean> => {
    const cleanTitle = sanitizeText(values.title);
    if (cleanTitle.length < 6) {
      toast({ title: 'Give your course a longer title', variant: 'destructive' });
      return false;
    }
    const patch = {
      title: cleanTitle,
      description: sanitizeTextarea(values.description),
      category: values.category,
      course_type: values.course_type,
      price: values.price,
    };
    const { error } = await supabase.from('courses').update(patch).eq('id', courseId);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return false;
    }
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, ...patch } : c)));
    toast({ title: 'Course updated' });
    return true;
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

  const deleteCourse = async (course: Course) => {
    if (!confirm(`Delete "${course.title}"? If it already has students it will be unlisted instead.`)) return;
    setDeletingId(course.id);
    const { data, error } = await supabase.rpc('creator_delete_course', { _course_id: course.id });
    setDeletingId(null);
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    if (data === 'deleted') {
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
      setModules((prev) => prev.filter((m) => m.course_id !== course.id));
      toast({ title: 'Course deleted' });
    } else {
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, is_visible: false } : c)));
      toast({ title: 'Course unlisted', description: 'It has enrolled students, so their access is preserved.' });
    }
  };

  const requestPayout = async () => {
    setRequesting(true);
    const { error } = await supabase.rpc('creator_request_payout');
    setRequesting(false);
    if (error) { toast({ title: 'Payout request failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payout requested', description: 'Our finance team settles manually within the next working days.' });
    if (creator) loadAll(creator.id);
  };

  const uploadPublicAsset = async (kind: 'avatar' | 'banner' | 'intro', file: File) => {
    if (!creator) return;
    setAvatarBusy(kind);
    const check = await checkUpload(file, kind === 'intro' ? 'course-media' : 'image');
    if (!check.ok) { setAvatarBusy(null); toast({ title: 'File rejected', description: check.error, variant: 'destructive' }); return; }
    const path = `creator-profile/${creator.id}/${kind}-${crypto.randomUUID()}.${check.ext}`;
    const { error: upErr } = await supabase.storage
      .from('group-media')
      .upload(path, file, { upsert: false, contentType: check.detected ?? file.type });
    if (upErr) { setAvatarBusy(null); toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); return; }
    const url = supabase.storage.from('group-media').getPublicUrl(path).data.publicUrl;
    const column = kind === 'avatar' ? 'avatar_url' : kind === 'banner' ? 'banner_url' : 'intro_video_url';
    const { error } = await supabase.from('creator_profiles').update({ [column]: url }).eq('id', creator.id);
    setAvatarBusy(null);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setCreator((prev) => (prev ? { ...prev, [column]: url } as CreatorProfile : prev));
    toast({ title: 'Saved' });
  };

  const savePublicProfile = async () => {
    if (!creator) return;
    setSavingPublic(true);
    const patch = {
      bio: sanitizeTextarea(bio).slice(0, 600),
      instagram_handle: instagram ? sanitizeText(instagram).slice(0, 60) : creator.instagram_handle,
      youtube_channel: youtube ? sanitizeText(youtube).slice(0, 120) : creator.youtube_channel,
    };
    const { error } = await supabase.from('creator_profiles').update(patch).eq('id', creator.id);
    setSavingPublic(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setCreator((prev) => (prev ? { ...prev, ...patch } : prev));
    toast({ title: 'Public profile updated' });
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

      {/* Overview — creator dashboard */}
      {tab === 'overview' && (() => {
        const live = courses.filter((c) => c.review_status === 'approved' && c.is_visible).length;
        const approved = courses.filter((c) => c.review_status === 'approved').length;
        const inReview = courses.filter((c) => c.review_status === 'pending_review').length;
        const drafts = courses.filter((c) => c.review_status === 'draft').length;
        const rejected = courses.filter((c) => c.review_status === 'rejected').length;

        const kycBanner =
          creator.kyc_status === 'approved'
            ? { tone: 'emerald', icon: BadgeCheck, title: 'Payouts verified', body: `Settlements run weekly${creator.pan_masked ? ` · PAN ${creator.pan_masked}` : ''}.`, cta: null as null | { label: string; onClick: () => void } }
            : creator.kyc_status === 'rejected'
              ? { tone: 'destructive', icon: XCircle, title: 'Payout verification rejected', body: creator.rejection_reason || 'Re-submit your PAN and bank details.', cta: { label: 'Retry verification', onClick: () => setTab('payouts') } }
              : approved > 0
                ? { tone: 'amber', icon: ShieldCheck, title: 'Verify your payout details', body: 'A course of yours is approved. Verify PAN + bank to start receiving money.', cta: { label: 'Verify payouts', onClick: () => setTab('payouts') } }
                : { tone: 'slate', icon: Clock, title: 'Payout verification locks until your first course is approved', body: 'Upload a course and submit it for review. Once our team approves it, PAN + bank verification unlocks here.', cta: { label: 'Create a course', onClick: () => setTab('upload') } };

        const toneClass: Record<string, string> = {
          emerald: 'border-emerald/30 bg-emerald/5 text-emerald',
          amber: 'border-amber-500/30 bg-amber-500/5 text-amber-700',
          destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
          slate: 'border-border bg-muted/30 text-muted-foreground',
        };

        return (
          <div className="mt-4 space-y-4">
            {/* KYC / next-step banner */}
            <div className={`rounded-2xl border p-4 ${toneClass[kycBanner.tone]}`}>
              <div className="flex flex-wrap items-start gap-3">
                <kycBanner.icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-extrabold">{kycBanner.title}</p>
                  <p className="mt-0.5 text-[12.5px] opacity-90">{kycBanner.body}</p>
                </div>
                {kycBanner.cta && (
                  <Button size="sm" className="rounded-lg" onClick={kycBanner.cta.onClick}>{kycBanner.cta.label}</Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Courses', value: String(courses.length), icon: BookOpen },
                { label: 'Live on marketplace', value: String(live), icon: BadgeCheck },
                { label: 'Under review', value: String(inReview), icon: Clock },
                { label: 'Drafts', value: String(drafts), icon: Upload },
                { label: 'Students', value: String(sales.count), icon: Users },
                { label: 'Gross sales', value: formatINR(sales.gross), icon: IndianRupee },
                { label: 'Net earnings', value: formatINR(netEarnings), icon: Wallet },
                { label: 'Awaiting settlement', value: formatINR(pendingPayout), icon: Clock },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-3.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <s.icon className="h-3.5 w-3.5" />
                    <p className="text-[10.5px] font-bold uppercase tracking-wide">{s.label}</p>
                  </div>
                  <p className="mt-1.5 text-[19px] font-extrabold leading-none text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[13px] font-extrabold text-foreground">Quick actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-lg" onClick={() => setTab('upload')}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> New course
                </Button>
                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setTab('courses')}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Manage lessons
                </Button>
                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setTab('payouts')}>
                  <Wallet className="mr-1.5 h-3.5 w-3.5" /> Earnings & payouts
                </Button>
              </div>
              {rejected > 0 && (
                <p className="mt-3 flex gap-2 text-[12px] text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {rejected} course{rejected === 1 ? '' : 's'} rejected — open <b>My courses</b> to fix and resubmit.
                </p>
              )}
            </div>

            {/* Recent settlements */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[13px] font-extrabold text-foreground">Recent settlements</p>
              {ledger.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-muted-foreground">No sales settled yet. Earnings appear here after your first purchase.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {ledger.slice(0, 5).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-[12.5px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString('en-IN')}</span>
                      <span className="text-[13px] font-bold text-foreground">{formatINR(Number(l.amount))}</span>
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{l.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })()}

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
                  <Button
                    size="sm"
                    variant={lessonPanelId === c.id ? 'default' : 'outline'}
                    className="rounded-lg"
                    onClick={() => { setLessonPanelId(lessonPanelId === c.id ? null : c.id); setEditPanelId(null); }}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> {lessonPanelId === c.id ? 'Close' : 'Add lesson'}
                  </Button>
                  {c.review_status !== 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => { setEditPanelId(editPanelId === c.id ? null : c.id); setLessonPanelId(null); }}
                    >
                      {editPanelId === c.id ? 'Close editor' : 'Edit details'}
                    </Button>
                  )}
                  {c.review_status !== 'approved' && c.review_status !== 'pending_review' && (
                    <Button size="sm" className="rounded-lg" onClick={() => submitForReview(c)} disabled={mods.length === 0}>
                      Submit for review
                    </Button>
                  )}
                  {c.review_status === 'approved' && (
                    <Button size="sm" variant={c.is_visible ? 'outline' : 'default'} className="rounded-lg" onClick={() => toggleVisibility(c)}>
                      {c.is_visible ? 'Unlist from marketplace' : 'Publish to marketplace'}
                    </Button>
                  )}
                  {mods.length > 0 && (
                    <Link to={`/courses/${c.id}/learn`}>
                      <Button size="sm" variant="outline" className="rounded-lg">
                        <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Preview my course
                      </Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deletingId === c.id}
                    onClick={() => deleteCourse(c)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>

                {lessonPanelId === c.id && (
                  <LessonUploader
                    courseId={c.id}
                    courseTitle={c.title}
                    approved={c.review_status === 'approved'}
                    onUpload={(draft) => uploadModule(c.id, draft)}
                  />
                )}

                {editPanelId === c.id && (
                  <CourseEditor
                    initial={{
                      title: c.title,
                      description: c.description ?? '',
                      category: c.category ?? '',
                      price: c.price,
                      course_type: c.course_type,
                    }}
                    onSave={(values) => saveCourseDetails(c.id, values)}
                    onCancel={() => setEditPanelId(null)}
                  />
                )}


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

          <p className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-[12.5px] text-muted-foreground">
            Lessons are added per course. Save this draft first, then open <b>My courses</b> and use
            <b> Add lesson</b> on the course you want to build.
          </p>
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

          {/* Weekly payout request */}
          {(() => {
            const dow = new Date().getDay(); // 0 Sun, 6 Sat
            const windowOpen = dow === 0 || dow === 6;
            const available = Number(payout?.available ?? 0);
            const kycOk = creator.kyc_status === 'approved';
            const canRequest = windowOpen && kycOk && available >= 500;
            return (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-foreground">
                  <Banknote className="h-4 w-4" /> Request a payout
                </h2>
                <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                  Settlement week runs Sunday to Saturday. Requests open every <b>Saturday and Sunday</b> and
                  are paid manually by our finance team. Minimum balance {formatINR(500)}.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    { l: 'Available now', v: formatINR(available) },
                    { l: 'Already requested', v: formatINR(Number(payout?.pending_requests ?? 0)) },
                    { l: 'Paid to date', v: formatINR(Number(payout?.settled ?? 0)) },
                  ].map((x) => (
                    <div key={x.l} className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{x.l}</p>
                      <p className="mt-0.5 text-[16px] font-extrabold text-foreground">{x.v}</p>
                    </div>
                  ))}
                </div>
                <Button className="mt-4 h-11 w-full rounded-xl" disabled={!canRequest || requesting} onClick={requestPayout}>
                  {requesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Request payout
                </Button>
                {!kycOk && <p className="mt-2 text-[12px] text-amber-700">Verify your PAN and bank details above to enable payouts.</p>}
                {kycOk && !windowOpen && <p className="mt-2 text-[12px] text-muted-foreground">The request window opens on Saturday.</p>}
                {kycOk && windowOpen && available < 500 && <p className="mt-2 text-[12px] text-muted-foreground">You need at least {formatINR(500)} available.</p>}
              </div>
            );
          })()}
        </div>
      )}

      {/* Public profile */}
      {tab === 'profile' && (
        <div className="mt-4 space-y-4">
          {creator.kyc_status !== 'approved' && (
            <p className="flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-[12.5px] text-amber-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Your public creator page goes live on the marketplace once verification is approved. You can prepare it now.
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative h-28 bg-muted">
              {creator.banner_url && <img src={creator.banner_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="px-4 pb-4">
              <div className="-mt-8 flex items-end gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-card bg-muted">
                  {creator.avatar_url
                    ? <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-[20px] font-extrabold text-muted-foreground">{creator.full_legal_name[0]}</div>}
                </div>
                <p className="pb-1 text-[15px] font-extrabold text-foreground">{creator.full_legal_name}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[12.5px] font-semibold">Profile photo</Label>
                  <Input type="file" accept={acceptFor('image')} disabled={avatarBusy !== null}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadPublicAsset('avatar', f); }}
                    className="mt-1.5 h-11 rounded-xl" />
                </div>
                <div>
                  <Label className="text-[12.5px] font-semibold">Banner image</Label>
                  <Input type="file" accept={acceptFor('image')} disabled={avatarBusy !== null}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadPublicAsset('banner', f); }}
                    className="mt-1.5 h-11 rounded-xl" />
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-[12.5px] font-semibold">Short intro video (optional)</Label>
                <Input type="file" accept={acceptFor('course-media')} disabled={avatarBusy !== null}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadPublicAsset('intro', f); }}
                  className="mt-1.5 h-11 rounded-xl" />
                {creator.intro_video_url && (
                  <video src={creator.intro_video_url} controls className="mt-3 w-full rounded-xl border border-border" />
                )}
              </div>

              <div className="mt-4">
                <Label className="text-[12.5px] font-semibold">Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={600}
                  className="mt-1.5 rounded-xl" placeholder="Tell learners who you are and what you teach. Education only — no calls or return claims." />
                <p className="mt-1 text-[11px] text-muted-foreground">{bio.length}/600</p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[12.5px] font-semibold">Instagram</Label>
                  <Input value={instagram || creator.instagram_handle || ''} onChange={(e) => setInstagram(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="@handle" />
                </div>
                <div>
                  <Label className="text-[12.5px] font-semibold">YouTube</Label>
                  <Input value={youtube || creator.youtube_channel || ''} onChange={(e) => setYoutube(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Channel URL" />
                </div>
              </div>

              <Button className="mt-4 h-11 w-full rounded-xl" disabled={savingPublic || avatarBusy !== null} onClick={savePublicProfile}>
                {(savingPublic || avatarBusy) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save public profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

