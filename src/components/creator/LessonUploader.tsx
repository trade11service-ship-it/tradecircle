import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { acceptFor, UPLOAD_RULES } from '@/lib/uploadGuard';

export type LessonDraft = { title: string; duration: string; file: File };

/**
 * Self-contained lesson uploader. All field state lives here so typing or
 * picking a file never re-renders (or scroll-jumps) the whole Studio page.
 */
export default function LessonUploader({
  courseTitle,
  approved,
  onUpload,
}: {
  courseTitle: string;
  approved: boolean;
  onUpload: (draft: LessonDraft) => Promise<boolean>;
}) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    const ok = await onUpload({ title, duration, file });
    setBusy(false);
    if (ok) {
      setTitle('');
      setDuration('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-[13px] font-bold text-foreground">Add a lesson to “{courseTitle}”</p>
      <p className="mt-1 text-[11.5px] text-muted-foreground">
        Files are stored privately and streamed through expiring, watermarked links only.
      </p>
      {approved && (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11.5px] text-amber-700">
          This course is live. Adding a new lesson sends the course back to compliance review and
          temporarily unlists it until approved again.
        </p>
      )}

      <div className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[12px] font-semibold">Lesson title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 h-11 rounded-xl"
              placeholder="Module 1 — Market structure"
            />
          </div>
          <div>
            <Label className="text-[12px] font-semibold">Duration (optional)</Label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1.5 h-11 rounded-xl"
              placeholder="12 min"
            />
          </div>
        </div>
        <div>
          <Label className="text-[12px] font-semibold">Video (MP4) or PDF</Label>
          <Input
            ref={fileRef}
            type="file"
            accept={acceptFor('course-media')}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 h-11 rounded-xl"
          />
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">
            {UPLOAD_RULES['course-media'].label}. Every file is scanned for scripts and disguised executables.
          </p>
          {file && (
            <p className="mt-1 truncate text-[11.5px] font-semibold text-foreground">Selected: {file.name}</p>
          )}
        </div>
        <Button type="button" className="h-11 w-full rounded-xl" disabled={busy || !file} onClick={submit}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {busy ? 'Uploading' : 'Upload lesson'}
        </Button>
      </div>
    </div>
  );
}
