import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { findBannedWords, formatINR } from '@/lib/courses';
import { AlertTriangle, BookOpen, CheckCircle2, FileText, Loader2, PlayCircle, XCircle } from 'lucide-react';

type PendingCourse = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number;
  course_type: string;
  cover_image_url: string | null;
  creator_id: string;
  created_at: string;
};

type Module = { id: string; course_id: string; title: string; content_type: string };

export function CourseReviewTab() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<PendingCourse[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [creators, setCreators] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_pending_courses');
    if (error) {
      toast({ title: 'Could not load review queue', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const list = (data as PendingCourse[]) ?? [];
    setCourses(list);
    if (list.length) {
      const [{ data: mods }, { data: profs }] = await Promise.all([
        supabase.from('course_modules').select('id, course_id, title, content_type').in('course_id', list.map((c) => c.id)),
        supabase.from('creator_profiles').select('id, full_legal_name').in('id', [...new Set(list.map((c) => c.creator_id))]),
      ]);
      setModules((mods as Module[]) ?? []);
      setCreators(Object.fromEntries(((profs as { id: string; full_legal_name: string }[]) ?? []).map((p) => [p.id, p.full_legal_name])));
    } else {
      setModules([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const review = async (course: PendingCourse, approve: boolean) => {
    const reason = reasons[course.id]?.trim();
    if (!approve && !reason) {
      toast({ title: 'Add a rejection reason', variant: 'destructive' });
      return;
    }
    setBusy(course.id);
    const { error } = await supabase.rpc('admin_review_course', {
      _course_id: course.id,
      _approve: approve,
      _reason: reason ?? null,
    });
    setBusy(null);
    if (error) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
      return;
    }
    setCourses((prev) => prev.filter((c) => c.id !== course.id));
    toast({ title: approve ? 'Course approved' : 'Course rejected' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald" />
        <p className="mt-3 text-[15px] font-bold text-foreground">Review queue is clear</p>
        <p className="mt-1 text-[13px] text-muted-foreground">New course submissions will land here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((c) => {
        const mods = modules.filter((m) => m.course_id === c.id);
        const hits = findBannedWords(c.title, c.description);
        return (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap gap-4">
              <div className="h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-muted">
                {c.cover_image_url ? (
                  <img src={c.cover_image_url} alt={`${c.title} cover`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><BookOpen className="h-6 w-6" /></div>
                )}
              </div>
              <div className="min-w-[220px] flex-1">
                <h3 className="text-[15.5px] font-extrabold leading-snug text-foreground">{c.title}</h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {creators[c.creator_id] ?? 'Creator'} \u00b7 {c.category || 'General'} \u00b7 {c.price === 0 ? 'Free' : formatINR(c.price)} \u00b7 {mods.length} lesson{mods.length === 1 ? '' : 's'}
                </p>
                {c.description && (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">{c.description}</p>
                )}
              </div>
            </div>

            {hits.length > 0 && (
              <p className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-[12px] text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Flagged wording: <b>{hits.join(', ')}</b>
              </p>
            )}

            {mods.length > 0 && (
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                {mods.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="w-4 text-[11px] font-bold text-muted-foreground">{i + 1}</span>
                    {m.content_type === 'pdf_ebook' ? <FileText className="h-3.5 w-3.5 text-muted-foreground" /> : <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="flex-1 truncate text-[13px] text-foreground">{m.title}</span>
                  </li>
                ))}
              </ul>
            )}

            <Textarea
              value={reasons[c.id] ?? ''}
              onChange={(e) => setReasons((r) => ({ ...r, [c.id]: e.target.value }))}
              rows={2}
              placeholder="Rejection reason (required when rejecting)"
              className="mt-3 rounded-xl"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="rounded-lg" disabled={busy === c.id} onClick={() => review(c, true)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve & publish
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg text-destructive" disabled={busy === c.id} onClick={() => review(c, false)}>
                <XCircle className="mr-1.5 h-4 w-4" /> Reject
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
