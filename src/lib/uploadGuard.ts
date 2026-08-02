/**
 * Upload safety guard.
 *
 * Every file the user hands us is validated here before it reaches storage:
 *  - extension + MIME allowlist (SVG is always rejected — it can carry scripts)
 *  - magic-byte sniffing so a renamed .exe/.zip/.html cannot pose as media
 *  - active-content scan for PDFs (JavaScript / Launch / embedded files)
 *  - script markers in the file head
 *  - hard size caps
 *
 * The same checks are mirrored server-side in the course-content-scan
 * edge function, since anything client-side can be bypassed.
 */

export type UploadKind = 'image' | 'pdf' | 'video' | 'course-media';

export interface UploadRules {
  exts: string[];
  mimes: string[];
  maxBytes: number;
  label: string;
}

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<UploadKind, UploadRules> = {
  image: {
    exts: ['jpg', 'jpeg', 'png', 'webp'],
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * MB,
    label: 'JPG, PNG or WEBP up to 5MB',
  },
  pdf: {
    exts: ['pdf'],
    mimes: ['application/pdf'],
    maxBytes: 50 * MB,
    label: 'PDF up to 50MB',
  },
  video: {
    exts: ['mp4', 'm4v', 'webm', 'mov'],
    mimes: ['video/mp4', 'video/x-m4v', 'video/webm', 'video/quicktime'],
    maxBytes: 500 * MB,
    label: 'MP4, M4V, WEBM or MOV up to 500MB',
  },
  // Course lessons accept either a PDF e-book or a video file
  'course-media': {
    exts: ['pdf', 'mp4', 'm4v', 'webm', 'mov'],
    mimes: ['application/pdf', 'video/mp4', 'video/x-m4v', 'video/webm', 'video/quicktime'],
    maxBytes: 500 * MB,
    label: 'PDF (50MB) or MP4/M4V/WEBM/MOV video (500MB)',
  },
};

export interface UploadCheckResult {
  ok: boolean;
  error?: string;
  /** Normalised, safe extension to use when building the storage path. */
  ext: string;
  /** Detected true type from magic bytes. */
  detected: string | null;
}

function hasPrefix(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  for (let i = 0; i < sig.length; i++) if (bytes[offset + i] !== sig[i]) return false;
  return true;
}

function ascii(bytes: Uint8Array, start: number, len: number): string {
  let out = '';
  for (let i = start; i < start + len && i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Identify the real file type from its leading bytes. */
export function sniffType(bytes: Uint8Array): string | null {
  if (hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf'; // %PDF
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  if (hasPrefix(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (brand.startsWith('qt')) return 'video/quicktime';
    return 'video/mp4';
  }
  return null;
}

const SCRIPT_MARKERS = ['<script', '<?php', '<!doctype html', '<html', '<svg', '#!/bin/', '<%@'];
const PDF_ACTIVE_MARKERS = ['/javascript', '/js ', '/js/', '/launch', '/embeddedfile', '/openaction', '/aa '];
/** MZ (windows exe), ELF (linux bin), PK (zip/office), Rar!, 7z */
const EXECUTABLE_SIGS: number[][] = [
  [0x4d, 0x5a],
  [0x7f, 0x45, 0x4c, 0x46],
  [0x50, 0x4b, 0x03, 0x04],
  [0x52, 0x61, 0x72, 0x21],
  [0x37, 0x7a, 0xbc, 0xaf],
  [0xca, 0xfe, 0xba, 0xbe],
];

async function readHead(file: File, length: number): Promise<Uint8Array> {
  const buf = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Validate a file against a profile. Returns a friendly error message when the
 * file must be rejected.
 */
export async function checkUpload(file: File, kind: UploadKind): Promise<UploadCheckResult> {
  const rules = UPLOAD_RULES[kind];
  const rawExt = (file.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const fail = (error: string): UploadCheckResult => ({ ok: false, error, ext: rawExt, detected: null });

  if (!file.size) return fail('That file is empty.');
  if (file.size > rules.maxBytes) {
    return fail(`File is too large. Allowed: ${rules.label}.`);
  }
  if (!rules.exts.includes(rawExt)) {
    return fail(`Unsupported file type ".${rawExt || 'unknown'}". Allowed: ${rules.label}.`);
  }
  const declaredMime = (file.type || '').toLowerCase();
  // Mobile pickers sometimes report a genuine MP4/M4V as a generic binary.
  // Treat the declaration only as a hint in that case; magic bytes below remain mandatory.
  const genericMime = declaredMime === 'application/octet-stream' || declaredMime === 'binary/octet-stream';
  if (declaredMime && !genericMime && !rules.mimes.includes(declaredMime)) {
    return fail(`Unsupported file type "${declaredMime}". Allowed: ${rules.label}.`);
  }
  if (declaredMime.includes('svg') || rawExt === 'svg') {
    return fail('SVG files are not allowed for security reasons. Use JPG, PNG or WEBP.');
  }

  const head = await readHead(file, 8192);

  for (const sig of EXECUTABLE_SIGS) {
    if (hasPrefix(head, sig)) {
      return fail('This file looks like an archive or program, not media. Upload rejected.');
    }
  }

  const detected = sniffType(head);
  if (!detected || !rules.mimes.includes(detected)) {
    return fail('File contents do not match its extension. Upload a genuine image, PDF or video file.');
  }
  const compatibleIsoVideoMime = detected === 'video/mp4'
    && ['video/mp4', 'video/x-m4v', 'video/quicktime'].includes(declaredMime);
  if (declaredMime && !genericMime && detected !== declaredMime && !compatibleIsoVideoMime) {
    return fail('File contents do not match its extension. Upload rejected.');
  }

  const headText = ascii(head, 0, Math.min(head.length, 4096)).toLowerCase();
  if (SCRIPT_MARKERS.some((m) => headText.includes(m))) {
    return fail('This file contains embedded web/script content and cannot be uploaded.');
  }

  if (detected === 'application/pdf') {
    // Scan a larger window for active content in PDFs
    const pdfWindow = await readHead(file, Math.min(file.size, 2 * MB));
    const pdfText = ascii(pdfWindow, 0, pdfWindow.length).toLowerCase();
    if (PDF_ACTIVE_MARKERS.some((m) => pdfText.includes(m))) {
      return fail('This PDF contains scripts or embedded files. Please export a clean, flattened PDF.');
    }
  }

  // Normalise extension from the detected type so the stored path can be trusted
  const extByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };

  return { ok: true, ext: extByType[detected] ?? rawExt, detected };
}

/** Convenience accept attribute for <input type="file"> */
export function acceptFor(kind: UploadKind): string {
  const rules = UPLOAD_RULES[kind];
  return [...rules.mimes, ...rules.exts.map((ext) => `.${ext}`)].join(',');
}
