// Checks everything the contact form needs and prints a plain report that is safe to share (no password is printed).
// Run: npm run doctor
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { cleanMailEnv, createMailer, explainMailError } from '../server/app';

const lines: string[] = [];
let failed = false;
const ok = (msg: string) => lines.push(`  OK    ${msg}`);
const warn = (msg: string) => lines.push(`  WARN  ${msg}`);
const bad = (msg: string) => {
  failed = true;
  lines.push(`  FAIL  ${msg}`);
};
const root = process.cwd();

lines.push('Portfolio doctor');
lines.push(`Folder: ${root}`);
lines.push(`Node: ${process.version}  Platform: ${process.platform}`);

const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if ((nodeMajor === 20 && nodeMinor >= 19) || (nodeMajor === 22 && nodeMinor >= 12) || nodeMajor > 22) ok('Node.js version is new enough (20.19+ or 22.12+)');
else bad('Node.js is too old for this project (needs 20.19 or newer, or 22.12 or newer). Install the current LTS version from nodejs.org.');

if (fs.existsSync(path.join(root, 'package.json'))) ok('package.json found (this is the project folder)');
else bad('package.json not found. Open PowerShell in the folder that contains package.json.');
if (fs.existsSync(path.join(root, 'node_modules'))) ok('node_modules found (npm install was done)');
else bad('node_modules not found. Run: npm install');

const envPath = path.join(root, '.env');
let env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  ok('.env file found');
  const raw = fs.readFileSync(envPath);
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) warn('.env starts with a hidden BOM mark (some editors add it). If the first setting is ignored, re-save the file as plain UTF-8 without BOM.');
  env = cleanMailEnv(dotenv.parse(raw)) as Record<string, string>;
} else {
  warn('.env file not found in this folder. The site still runs, but the contact form cannot e-mail you until you create it (see README).');
  const wrong = ['.env.txt', 'env.txt', 'env-for-you.txt', '.env.example', 'env.example'].filter((f) => fs.existsSync(path.join(root, f)));
  if (wrong.length) lines.push(`        Found instead: ${wrong.join(', ')}. The settings file must be named exactly ".env" (no .txt). In File Explorer open View > Show > File name extensions to see the real name.`);
}

const hasEnvFile = fs.existsSync(envPath);
const need = ['CONTACT_RECIPIENT_EMAIL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
for (const key of need) {
  const v = env[key];
  if (!hasEnvFile) continue; // already reported above
  if (!v) bad(`${key} is missing or empty in .env`);
  else if (/example\.(com|org)|your-app-password|you@/i.test(v)) bad(`${key} still has the example value from env.example`);
  else if (key === 'SMTP_PASS') ok(`SMTP_PASS is set (${v.replace(/\s/g, '').length} characters without spaces; a Gmail App Password has 16)`);
  else ok(`${key} = ${v}`);
}
if (env.SMTP_PASS && env.SMTP_PASS.replace(/\s/g, '').length !== 16 && /gmail/i.test(env.SMTP_HOST ?? '')) warn('For Gmail the App Password should have exactly 16 letters. A normal Google password will not work.');
if (env.ALLOWED_ORIGINS) ok(`ALLOWED_ORIGINS = ${env.ALLOWED_ORIGINS}`);
else warn('ALLOWED_ORIGINS is not set. Open the site at http://localhost:3000 (same address as the server).');

if (!failed && hasEnvFile) {
  const mailer = createMailer({ ...process.env, ...env });
  if (!mailer) bad('The mail settings are incomplete.');
  else {
    try {
      await mailer.verify?.();
      ok('The mail server accepted the login');
      try {
        await mailer.sendMail({
          from: env.SMTP_FROM || env.SMTP_USER,
          to: env.CONTACT_RECIPIENT_EMAIL,
          subject: 'Portfolio contact form: doctor test message',
          text: 'If you can read this, the contact form can e-mail you. You can delete this message.'
        });
        ok(`A test e-mail was accepted for ${env.CONTACT_RECIPIENT_EMAIL}. Check that inbox and Spam.`);
      } catch (err) {
        bad(`Sending the test e-mail failed. ${explainMailError(err)}`);
      }
    } catch (err) {
      bad(`Mail login failed. ${explainMailError(err)}`);
    }
  }
}

lines.push(failed ? 'RESULT: something needs fixing (see FAIL lines above).' : 'RESULT: all checks passed.');
lines.push('You can copy everything above and send it to whoever is helping you. No password is shown.');
console.log(lines.join('\n'));
process.exit(failed ? 1 : 0);
