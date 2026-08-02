import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { acceptFor, checkUpload, UPLOAD_RULES } from '@/lib/uploadGuard';

export type LessonDraft = { title: string; duration: string; file: File };

/**
 * Self-contained lesson uploader. All field state lives here so typing or
 * picking a file never re-renders (or scroll-jumps) the whole Studio page.
 */
export default function LessonUploader({
  courseId,
  courseTitle,
  approved,
  onUpload,
}: {
  courseId: string;
  courseTitle: string;
  approved: boolean;
  onUpload: (draft: LessonDraft) => Promise<boolean>;
}) {
  // Mobile browsers can discard and reload the page while the native file picker
  // is open (memory pressure). Persisting the text fields means the section is
  // still filled in when the user comes back — only the file has to be re-picked.
  const storeKey = `creator_lesson_draft_${courseId}`;
  const stored = (() => {
    try { return JSON.parse(sessionStorage.getItem(storeKey) || '{}') as { title?: string; duration?: string }; }
    catch { return {}; }
  })();

  const [title, setTitle] = useState(stored.title ?? '');
  const [duration, setDuration] = useState(stored.duration ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!title && !duration) { sessionStorage.removeItem(storeKey); return; }
    sessionStorage.setItem(storeKey, JSON.stringify({ title, duration }));
  }, [title, duration, storeKey]);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const ok = await onUpload({ title, duration, file });
      if (ok) {
        setTitle('');
        setDuration('');
        setFile(null);
        setFileError(null);
        sessionStorage.removeItem(storeKey);
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally {
      setBusy(false);
    }
  };

  const selectFile = async (nextFile: File | null) => {
    setFile(null);
    setFileError(null);
    if (!nextFile) return;
    setChecking(true);
    try {
      const check = await checkUpload(nextFile, 'course-media');
      if (!check.ok) {
        setFileError(check.error ?? 'This file cannot be uploaded.');
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      setFile(nextFile);
    } catch {
      setFileError('Could not read this file. Try exporting it as MP4, M4V, WEBM, MOV, or PDF.');
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setChecking(false);
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
          <Label className="text-[12px] font-semibold">Lesson file</Label>
          <Input
            ref={fileRef}
            type="file"
            accept={acceptFor('course-media')}
            onChange={(e) => { void selectFile(e.target.files?.[0] ?? null); }}
            disabled={busy || checking}
            className="mt-1.5 h-11 rounded-xl"
          />
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">
            {UPLOAD_RULES['course-media'].label}. Every file is scanned for scripts and disguised executables.
          </p>
          {checking && <p className="mt-1.5 text-[11.5px] font-semibold text-muted-foreground">Checking file…</p>}
          {fileError && <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-destructive">{fileError}</p>}
          {file && (
            <p className="mt-1 truncate text-[11.5px] font-semibold text-foreground">
              Selected: {file.name} · {(file.size / (1024 * 1024)).toFixed(1)}MB
            </p>
          )}
        </div>
        <Button type="button" className="h-11 w-full rounded-xl" disabled={busy || checking || !file} onClick={submit}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {busy ? 'Uploading' : 'Upload lesson'}
        </Button>
      </div>
    </div>
  );
}
