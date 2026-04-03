/**
 * 수동 테스트 스크립트
 * Usage: npx tsx scripts/test-post.ts [platform] [--dry-run]
 *
 * Examples:
 *   npx tsx scripts/test-post.ts threads --dry-run
 *   npx tsx scripts/test-post.ts x --dry-run
 *   npx tsx scripts/test-post.ts medium --dry-run
 */

import { generateContent } from '../lib/content/generator';
import { getThreadsContentType, formatThreadsContent } from '../lib/content/threads-format';
import { getXContentType, formatXContent } from '../lib/content/x-format';
import { getMediumContentType, parseMediumContent } from '../lib/content/medium-format';
import type { Platform, Slot } from '../lib/db/posts';

async function main() {
  const args = process.argv.slice(2);
  const platform = (args[0] || 'threads') as Platform;
  const dryRun = args.includes('--dry-run');

  console.log(`\n🧪 Testing ${platform} post generation${dryRun ? ' (DRY RUN)' : ''}\n`);
  console.log('='.repeat(50));

  const slot: Slot = 'morning';

  let contentType;
  switch (platform) {
    case 'threads':
      contentType = getThreadsContentType(slot);
      break;
    case 'x':
      contentType = getXContentType(slot);
      break;
    case 'medium':
      contentType = getMediumContentType() || 'insight';
      break;
    default:
      console.error(`Unknown platform: ${platform}`);
      process.exit(1);
  }

  console.log(`Content type: ${contentType}`);
  console.log(`Slot: ${slot}`);
  console.log('');

  // Generate content
  console.log('Generating content via Claude API...');
  const generated = await generateContent(platform, contentType, {
    includeLink: false,
  });

  // Format
  let formatted = generated.text;
  if (platform === 'threads') {
    formatted = formatThreadsContent(generated.text);
  } else if (platform === 'x') {
    formatted = formatXContent(generated.text);
  } else if (platform === 'medium') {
    const parsed = parseMediumContent(generated.text);
    console.log(`Title: ${parsed.title}`);
    console.log(`Tags: ${parsed.tags.join(', ')}`);
    formatted = parsed.content;
  }

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
