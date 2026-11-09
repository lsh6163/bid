import path from 'node:path';

const ALLOWED_EXT = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'zip', 'png', 'jpg', 'jpeg', 'gif', 'webp',
]);

export function decodeOriginalName(originalname: string): string {
  const restored = Buffer.from(originalname, 'latin1').toString('utf8');
  const candidate = restored || originalname;
  const base = path.basename(candidate).replace(/[\r\n"'\\/]/g, '_').replace(/\.\./g, '_');
  return base.trim() || 'download';
}

export function fileExtension(originalName: string): string {
  const ext = path.extname(originalName).replace('.', '').toLowerCase();
  return ext;
}

export function isAllowedExtension(originalName: string): boolean {
  return ALLOWED_EXT.has(fileExtension(originalName));
}

export function contentDisposition(originalName: string): string {
  const safe = originalName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename="${safe || 'download'}"; filename*=UTF-8''${encoded}`;
}
