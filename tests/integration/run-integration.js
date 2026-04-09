import fs from 'fs';

// Load .env
const envPath = new URL('../../.env', import.meta.url).pathname;
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

// Ensure process.env is injected before actual tests load.
import('./supabase-flow.test.js')
  .then(() => {
    console.log('Integration tests complete.');
  })
  .catch((err) => {
    console.error('Integration tests failed:');
    console.error(err);
    process.exit(1);
  });
