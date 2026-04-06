/**
 * 수동 테스트 스크립트
 * Usage: npx tsx scripts/test-post.ts x --dry-run
 */

import { generateContent } from '../lib/content/generator';
import { getXContentType, formatXContent } from '../lib/content/x-format';
import type { Slot } from '../lib/db/posts';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log(`\n🧪 Testing x post generation${dryRun ? ' (DRY RUN)' : ''}\n`);
  console.log('='.repeat(50));

  const slot: Slot = 'morning';
  const contentType = getXContentType(slot);

  console.log(`Content type: ${contentType}`);
  console.log(`Slot: ${slot}`);
  console.log('');

  console.log('Generating content via Claude API...');
  const generated = await generateContent('x', contentType, {
    includeLink: false,
  });

  const formatted = formatXContent(generated.text);

  console.log('\n--- Generated Content ---');
  console.log(formatted);
  console.log('--- End ---\n');
  console.log(`Length: ${formatted.length} chars`);
  console.log(`Brand: ${generated.brand}`);
  console.log(`Has link: ${generated.hasLink}`);

  if (!dryRun) {
    console.log('\n⚠️  To actually post, remove --dry-run flag');
    console.log('⚠️  Make sure API tokens are configured in .env.local');
  }
}

main().catch(console.error);
