import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EDU_DISCLAIMER, formatINR, PLATFORM_COMMISSION_PERCENT } from '@/lib/courses';
import { setMetaTags } from '@/lib/seo';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  PlayCircle,
  ShieldCheck,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number;
  cover_image_url: string | null;
  course_type: string;
  creator_id: string;
  creator_name: string;
  instagram_handle: string | null;
  youtube_channel: string | null;
};

type Lesson = {
  id: string;
  title: string;
  content_type: string;
  duration_label: string | null;
  sort_order: number;
};

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: l }] = await Promise.all([
        supabase.rpc('get_public_course', { _course_id: id }),
        supabase.rpc('get_course_syllabus', { _course_id: id }),
      ]);
      const record = (c as Course[])?.[0] ?? null;
      setCourse(record);
      setLessons((l as Lesson[]) ?? []);
      if (record) {
        setMetaTags({
          title: `${record.title} | RA Circle Courses`,
          description: (record.description ?? EDU_DISCLAIMER).slice(0, 155),
        });
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !id) { setOwned(false); return; }
    (async () => {
      const { data } = await supabase
        .from('course_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .eq('payment_status', 'captured')
        .maybeSingle();
      setOwned(!!data);
    })();
  }, [user, id]);

  const handleBuy = async () => {
    if (!user) {
      navigate(`/login?redirect=/courses/${id}`);
      return;
    }
    setBuying(true);
    const { data, error } = await supabase.functions.invoke('course-checkout-split', {
      body: { course_id: id },
    });
    setBuying(false);
    if (error || (data as { error?: string })?.error) {
      toast({
        title: 'Purchase failed',
        description: (data as { error?: string })?.error ?? error?.message ?? 'Please try again.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Enrolled', description: 'Your course is unlocked. Happy learning.' });
    setOwned(true);
    navigate(`/courses/${id}/learn`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-4 animate-pulse">
        <div className="h-48 rounded-2xl bg-muted" />
        <div className="h-5 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-[16px] font-bold text-foreground">Course not available</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          It may still be under review or has been taken down.
        </p>
        <Link to="/courses">
          <Button variant="outline" className="mt-5 rounded-xl">Back to marketplace</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="h-44 md:h-56 bg-muted">
            {course.cover_image_url ? (
              <img
                src={course.cover_image_url}
                alt={`${course.title} course cover`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <BookOpen className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {course.category || 'General'}
            </p>
            <h1 className="mt-1 text-[22px] md:text-[26px] font-extrabold leading-tight text-foreground">
              {course.title}
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              by <span className="font-semibold text-foreground">{course.creator_name}</span>
            </p>

            {course.description && (
              <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
                {course.description}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="text-[24px] font-extrabold text-foreground">
                {course.price === 0 ? 'Free' : formatINR(course.price)}
              </span>
              {owned ? (
                <Button className="rounded-xl h-11 px-5" onClick={() => navigate(`/courses/${course.id}/learn`)}>
                  <PlayCircle className="mr-2 h-4 w-4" /> Start learning
                </Button>
              ) : (
                <Button className="rounded-xl h-11 px-5" onClick={handleBuy} disabled={buying}>
                  {buying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {buying ? 'Processing' : 'Buy this course'}
                </Button>
              )}
              {owned && (
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald">
                  <CheckCircle2 className="h-4 w-4" /> Enrolled
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              RA Circle retains a {PLATFORM_COMMISSION_PERCENT}% marketplace fee on course sales.
            </p>
          </div>
        </div>

        {/* Syllabus */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-[15px] font-extrabold text-foreground">What's inside</h2>
          <ul className="mt-3 divide-y divide-border">
            {lessons.length === 0 && (
              <li className="py-3 text-[13px] text-muted-foreground">Syllabus coming soon.</li>
            )}
            {lessons.map((l, i) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <span className="w-5 text-[12px] font-bold text-muted-foreground">{i + 1}</span>
                {l.content_type === 'pdf_ebook' ? (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="flex-1 text-[13.5px] font-medium text-foreground">{l.title}</span>
                {l.duration_label && (
                  <span className="text-[11px] text-muted-foreground">{l.duration_label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-bold text-foreground">Educational purpose only — no live tips. </span>
              {EDU_DISCLAIMER}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
