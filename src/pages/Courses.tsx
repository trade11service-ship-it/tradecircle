import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { COURSE_CATEGORIES, EDU_DISCLAIMER, formatINR } from '@/lib/courses';
import { BookOpen, PlayCircle, FileText, Search, ShieldCheck, GraduationCap } from 'lucide-react';
import { setSeo } from '@/lib/seo';

type PublicCourse = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number;
  cover_image_url: string | null;
  course_type: string;
  creator_name: string;
  module_count: number;
  purchase_count: number;
};

const PRICE_BANDS = [
  { key: 'all', label: 'Any price', test: () => true },
  { key: 'free', label: 'Free', test: (p: number) => p === 0 },
  { key: 'low', label: 'Under \u20B91,000', test: (p: number) => p > 0 && p < 1000 },
  { key: 'mid', label: '\u20B91,000 \u2013 \u20B95,000', test: (p: number) => p >= 1000 && p <= 5000 },
  { key: 'high', label: 'Above \u20B95,000', test: (p: number) => p > 5000 },
];

export default function Courses() {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [band, setBand] = useState('all');

  useEffect(() => {
    setSeo({
      title: 'Trading Courses by Verified Educators | RA Circle',
      description:
        'Browse structured, education-only trading and markets courses from verified educators on RA Circle. No live tips, no investment advice.',
    });
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('list_public_courses');
      setCourses((data as PublicCourse[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const priceTest = PRICE_BANDS.find((b) => b.key === band)?.test ?? (() => true);
    return courses.filter(
      (c) =>
        (category === 'all' || c.category === category) &&
        priceTest(c.price) &&
        (!q ||
          c.title.toLowerCase().includes(q) ||
          (c.description ?? '').toLowerCase().includes(q) ||
          c.creator_name.toLowerCase().includes(q)),
    );
  }, [courses, query, category, band]);

  return (
    <div className="w-full">
      {/* Header */}
      <header className="bg-foreground text-background">
        <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-background/60">
            Education marketplace
          </p>
          <h1 className="mt-2 text-[26px] md:text-[34px] font-extrabold leading-tight">
            Learn the craft before you risk the capital
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-background/70">
            Structured video and e-book courses from verified market educators. Reviewed by RA Circle before
            they go live.
          </p>
          <div className="mt-5 flex items-center gap-2 text-[12px] text-background/70">
            <ShieldCheck className="h-4 w-4" />
            Every course is manually screened for compliance
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses or educators"
              className="pl-9 h-10 rounded-xl"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {[{ key: 'all', label: 'All topics' }, ...COURSE_CATEGORIES.map((c) => ({ key: c, label: c }))].map(
              (c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    category === c.key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              ),
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {PRICE_BANDS.map((b) => (
              <button
                key={b.key}
                onClick={() => setBand(b.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  band === b.key
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="h-36 bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-[15px] font-bold text-foreground">No courses here yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Courses appear once an educator completes review and payout verification.
            </p>
            <Link to="/creator-studio">
              <Button className="mt-5 rounded-xl">Publish your course</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.id}`}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-foreground/30 transition-colors"
              >
                <div className="relative h-36 bg-muted overflow-hidden">
                  {c.cover_image_url ? (
                    <img
                      src={c.cover_image_url}
                      alt={`${c.title} course cover`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-foreground/85 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-background">
                    {c.course_type === 'ebook' ? <FileText className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
                    {c.course_type === 'ebook' ? 'E-book' : c.course_type === 'hybrid' ? 'Video + PDF' : 'Video'}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {c.category || 'General'}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-foreground">
                    {c.title}
                  </h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">by {c.creator_name}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-[15px] font-extrabold text-foreground">
                      {c.price === 0 ? 'Free' : formatINR(c.price)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {c.module_count} lesson{c.module_count === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Compliance banner */}
        <div className="mt-8 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            <span className="font-bold text-foreground">Educational purpose only \u2014 no live tips. </span>
            {EDU_DISCLAIMER}
          </p>
        </div>
      </main>
    </div>
  );
}
