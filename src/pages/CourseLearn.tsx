import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DynamicWatermark, WatermarkMesh } from '@/components/courses/DynamicWatermark';
import { EDU_DISCLAIMER } from '@/lib/courses';
import { ArrowLeft, FileText, PlayCircle, Loader2, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

type Lesson = {
  id: string;
  title: string;
  content_type: string;
  duration_label: string | null;
  sort_order: number;
};

/** Canvas-only PDF viewer — no download control, no text layer to copy. */
function ProtectedPdf({ url, watermark }: { url: string; watermark: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const docRef = useRef<{ numPages: number; getPage: (n: number) => Promise<unknown> } | null>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRendering(true);
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      const doc = await pdfjs.getDocument({ url }).promise;
      if (cancelled) return;
      docRef.current = doc as never;
      setPages(doc.numPages);
      setPage(1);
    })();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = docRef.current as never as { getPage: (n: number) => Promise<never> } | null;
      const canvas = canvasRef.current;
      if (!doc || !canvas) return;
      setRendering(true);
      const pdfPage = (await doc.getPage(page)) as never as {
        getViewport: (o: { scale: number }) => { width: number; height: number };
        render: (o: unknown) => { promise: Promise<void> };
      };
      if (cancelled) return;
      const containerWidth = canvas.parentElement?.clientWidth ?? 800;
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(2, containerWidth / base.width);
      const viewport = pdfPage.getViewport({ scale });
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
      if (!cancelled) setRendering(false);
    })();
    return () => { cancelled = true; };
  }, [page, pages]);

  return (
    <div className="relative rounded-xl border border-border bg-muted/30 p-3">
      <div className="relative mx-auto w-full overflow-hidden">
        <canvas ref={canvasRef} className="mx-auto block w-full select-none" />
        <WatermarkMesh label={watermark} />
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-[12px] font-semibold text-muted-foreground">
          Page {page} of {pages || '—'}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          disabled={pages === 0 || page >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CourseLearn() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [active, setActive] = useState<Lesson | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const watermark = profile?.email || user?.email || 'RA Circle member';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate(`/login?redirect=/courses/${id}/learn`, { replace: true }); return; }
    if (!id) return;
    (async () => {
      const [{ data: c }, { data: purchase }, { data: mods }] = await Promise.all([
        supabase.rpc('get_public_course', { _course_id: id }),
        supabase
          .from('course_purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .eq('payment_status', 'captured')
          .maybeSingle(),
        supabase
          .from('course_modules')
          .select('id, title, content_type, duration_label, sort_order')
          .eq('course_id', id)
          .order('sort_order', { ascending: true }),
      ]);
      let courseTitle = (c as { title: string }[])?.[0]?.title ?? '';
      if (!courseTitle) {
        // Creators previewing their own unpublished course: the public RPC returns nothing,
        // but RLS still lets the owner read their row.
        const { data: own } = await supabase.from('courses').select('title').eq('id', id).maybeSingle();
        courseTitle = (own as { title: string } | null)?.title ?? 'Course';
      }
      setTitle(courseTitle);
      const list = (mods as Lesson[]) ?? [];
      setLessons(list);
      setAllowed(!!purchase || list.length > 0);
      setActive(list[0] ?? null);
    })();
  }, [id, user, authLoading, navigate]);

  useEffect(() => {
    if (!active) { setMediaUrl(null); return; }
    let cancelled = false;
    (async () => {
      setMediaLoading(true);
      setMediaUrl(null);
      const { data, error } = await supabase.functions.invoke('get-course-video-url', {
        body: { module_id: active.id },
      });
      if (cancelled) return;
      setMediaLoading(false);
      const payload = data as { url?: string; error?: string } | null;
      if (error || !payload?.url) {
        toast({
          title: 'Cannot open lesson',
          description: payload?.error ?? error?.message ?? 'Access denied.',
          variant: 'destructive',
        });
        return;
      }
      setMediaUrl(payload.url);
    })();
    return () => { cancelled = true; };
  }, [active, toast]);

  if (allowed === false) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-[16px] font-bold text-foreground">You don't have access to this course</p>
        <Link to={`/courses/${id}`}>
          <Button className="mt-5 rounded-xl">View course details</Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-5xl px-4 py-4 pb-12 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Link
        to={`/courses/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {title}
      </Link>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_290px]">
        {/* Player */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-foreground">
            {mediaLoading && (
              <div className="flex aspect-video items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-background/60" />
              </div>
            )}
            {!mediaLoading && mediaUrl && active?.content_type !== 'pdf_ebook' && (
              <div className="relative">
                <video
                  key={mediaUrl}
                  src={mediaUrl}
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  className="aspect-video w-full bg-black"
                />
                <DynamicWatermark primary={watermark} secondary={profile?.phone} />
              </div>
            )}
            {!mediaLoading && !mediaUrl && (
              <div className="flex aspect-video items-center justify-center text-[13px] text-background/70">
                Select a lesson to begin
              </div>
            )}
          </div>

          {!mediaLoading && mediaUrl && active?.content_type === 'pdf_ebook' && (
            <div className="mt-4">
              <ProtectedPdf url={mediaUrl} watermark={watermark} />
            </div>
          )}

          {active && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <h1 className="text-[16px] font-extrabold text-foreground">{active.title}</h1>
              <p className="mt-1 text-[12px] text-muted-foreground">
                This stream is watermarked with your account identity. Sharing or recording is traceable and
                will terminate access.
              </p>
            </div>
          )}

          <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground">{EDU_DISCLAIMER}</p>
        </div>

        {/* Playlist */}
        <aside className="rounded-2xl border border-border bg-card p-3 h-fit lg:sticky lg:top-4">
          <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Lessons
          </p>
          <ul className="space-y-1">
            {lessons.map((l, i) => {
              const isActive = active?.id === l.id;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => setActive(l)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-foreground text-background' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="w-4 text-[11px] font-bold opacity-70">{i + 1}</span>
                    {l.content_type === 'pdf_ebook' ? (
                      <FileText className="h-4 w-4 shrink-0" />
                    ) : (
                      <PlayCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 text-[13px] font-medium leading-snug">{l.title}</span>
                    {l.duration_label && (
                      <span className="text-[10.5px] opacity-70">{l.duration_label}</span>
                    )}
                  </button>
                </li>
              );
            })}
            {lessons.length === 0 && (
              <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                No lessons published yet.
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
