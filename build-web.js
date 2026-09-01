const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Basic .env parser
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return {};

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv();
const baseHref = env.APP_BASE_HREF || '/';

console.log(`Building web app with base-href: ${baseHref}`);

try {
  execSync(`npx nx build web --configuration=production --base-href=${baseHref}`, {
    stdio: 'inherit',
    shell: true
  });
} catch (error) {
  process.exit(1);
}
