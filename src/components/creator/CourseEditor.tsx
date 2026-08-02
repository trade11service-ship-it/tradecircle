import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, IndianRupee, Loader2 } from 'lucide-react';
import { COURSE_CATEGORIES, findBannedWords, formatINR, PLATFORM_COMMISSION_PERCENT, splitAmount } from '@/lib/courses';

export type CourseEditValues = {
  title: string;
  description: string;
  category: string;
  price: number;
  course_type: string;
};

/** Inline editor for an existing course's details (drafts and rejected courses). */
export default function CourseEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: CourseEditValues;
  onSave: (values: CourseEditValues) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category || COURSE_CATEGORIES[0]);
  const [courseType, setCourseType] = useState(initial.course_type || 'video');
  const [price, setPrice] = useState(String(initial.price ?? 0));
  const [busy, setBusy] = useState(false);

  const banned = useMemo(() => findBannedWords(title, description), [title, description]);

  const save = async () => {
    setBusy(true);
    const ok = await onSave({
      title,
      description,
      category,
      course_type: courseType,
      price: Math.max(0, parseInt(price.replace(/[^\d]/g, ''), 10) || 0),
    });
    setBusy(false);
    if (ok) onCancel();
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <Label className="text-[12px] font-semibold">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
      </div>
      <div>
        <Label className="text-[12px] font-semibold">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1.5 rounded-xl" />
      </div>
      {banned.length > 0 && (
        <p className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-[12px] text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Non-compliant wording: <b>{banned.join(', ')}</b>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-[12px] font-semibold">Category</Label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-[14px]">
            {COURSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-[12px] font-semibold">Format</Label>
          <select value={courseType} onChange={(e) => setCourseType(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-[14px]">
            <option value="video">Video course</option>
            <option value="ebook">E-book / PDF</option>
            <option value="hybrid">Video + PDF</option>
          </select>
        </div>
      </div>
      <div>
        <Label className="text-[12px] font-semibold">Price (INR)</Label>
        <div className="relative mt-1.5">
          <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" className="h-11 rounded-xl pl-9" />
        </div>
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">
          You receive {formatINR(splitAmount(parseInt(price || '0', 10)).creatorNet)} per sale after the {PLATFORM_COMMISSION_PERCENT}% platform fee.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" className="h-11 flex-1 rounded-xl" disabled={busy || banned.length > 0} onClick={save}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
