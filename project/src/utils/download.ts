import JSZip from 'jszip';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadAsZip(
  title: string,
  prd: string,
  gtm: string,
  marketing: string
): Promise<void> {
  const slug = slugify(title);
  const zip = new JSZip();

  zip.file(`${slug}-prd.md`, prd);
  zip.file(`${slug}-gtm-strategy.md`, gtm);
  zip.file(`${slug}-marketing-plan.md`, marketing);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug}-complete-analysis.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getDocumentFilename(title: string, type: 'prd' | 'gtm' | 'marketing'): string {
  const slug = slugify(title);
  const typeMap = {
    prd: 'prd',
    gtm: 'gtm-strategy',
    marketing: 'marketing-plan',
  };
  return `${slug}-${typeMap[type]}.md`;
}
