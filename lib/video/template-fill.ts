import fs from 'node:fs/promises';
import path from 'node:path';

export interface TemplateVars {
  [key: string]: string;
}

/**
 * Keys whose values are already markup/code (HTML, CSS, JS, SVG) and must be
 * injected verbatim. All other placeholder values are HTML-escaped before
 * insertion to keep arbitrary text safe.
 */
const RAW_KEYS = new Set<string>([
  'THEME_ROOT',
  'AMBIENT_HTML',
  'AMBIENT_CSS',
  'AUDIO_HTML',
  'CAPTIONS_HTML',
  'CAPTIONS_GSAP',
]);

/**
 * Fill placeholder tokens (__KEY__) in a composition HTML template.
 * Markup keys (see RAW_KEYS) are inserted verbatim; everything else is
 * HTML-escaped so user text never breaks the rendered DOM.
 *
 * Throws if any placeholder remains unfilled to avoid shipping broken video.
 */
export async function fillTemplate(
  templatePath: string,
  vars: TemplateVars
): Promise<string> {
  let html = await fs.readFile(templatePath, 'utf8');

  for (const [key, value] of Object.entries(vars)) {
    const token = `__${key}__`;
    const replacement = RAW_KEYS.has(key) ? value : escapeHtml(value);
    html = html.split(token).join(replacement);
  }

  const leftover = html.match(/__[A-Z_]+__/g);
  if (leftover) {
    throw new Error(`Unfilled placeholders: ${leftover.join(', ')}`);
  }

  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Stage a composition: write filled HTML as index.html into a fresh project dir.
 * Returns the project dir path that hyperframes/producer expects.
 */
export async function stageComposition(
  templatePath: string,
  vars: TemplateVars,
  workRoot: string,
  jobId: string
): Promise<string> {
  const projectDir = path.join(workRoot, jobId);
  await fs.mkdir(projectDir, { recursive: true });
  const filled = await fillTemplate(templatePath, vars);
  await fs.writeFile(path.join(projectDir, 'index.html'), filled, 'utf8');
  return projectDir;
}
