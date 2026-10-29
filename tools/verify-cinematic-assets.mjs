// Pacote VALE GAMES — somente Node.js built-ins; execute na raiz do pacote/projeto
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const root = path.resolve(process.argv[2] || '.');
const manifestLocation = path.join(root, 'public', 'assets', 'cinematic-scenes.manifest.json');
const errors = [];
if (!fs.existsSync(manifestLocation)) {
  process.stderr.write(`Manifesto não encontrado: ${manifestLocation}\n`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestLocation,'utf8'));
if (manifest.assetCount !== 9 || manifest.assets.length !== 9) errors.push('manifesto precisa conter exatamente nove cenas');
const seenIds = new Set();
const seenPaths = new Set();
const pngSig = Buffer.from([137,80,78,71,13,10,26,10]);
for (const entry of manifest.assets) {
  if (seenIds.has(entry.id)) errors.push(`${entry.id}: id duplicado`);
  if (seenPaths.has(entry.repoPath)) errors.push(`${entry.id}: caminho duplicado`);
  seenIds.add(entry.id); seenPaths.add(entry.repoPath);
  const abs = path.resolve(root,entry.repoPath);
  if (!abs.startsWith(root+path.sep)) { errors.push(`${entry.id}: caminho inseguro`); continue; }
  if (!fs.existsSync(abs)) { errors.push(`${entry.id}: ausente ${entry.repoPath}`); continue; }
  const buf = fs.readFileSync(abs);
  if (buf.length < 33 || !buf.subarray(0,8).equals(pngSig)) { errors.push(`${entry.id}: não é PNG`); continue; }
  const width = buf.readUInt32BE(16),height=buf.readUInt32BE(20),colorType=buf[25];
  if (width !== entry.pixelSize.width || height !== entry.pixelSize.height) errors.push(`${entry.id}: dimensões divergentes`);
  if (colorType !== 2) errors.push(`${entry.id}: PNG não RGB`);
  if (buf.length !== entry.sizeBytes) errors.push(`${entry.id}: bytes divergentes`);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  if (hash !== entry.sha256) errors.push(`${entry.id}: SHA-256 divergente`);
  const expectedRuntime = entry.repoPath.replace(/^public\//, '');
  if (entry.runtimePath !== expectedRuntime) errors.push(`${entry.id}: runtimePath incompatível com GitHub Pages`);
  if (!errors.some(e=>e.startsWith(`${entry.id}:`))) console.log(`OK  ${entry.id}  ${width}x${height}  ${hash.slice(0,14)}…`);
}
if (errors.length) { for(const err of errors) console.error('FALHA:',err); process.exit(1); }
console.log(`PASSOU: ${manifest.assets.length} imagens originais verificadas, SHA-256 intactos.`);
