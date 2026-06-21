// scripts/upload-volunteer-images.js
// Scarica le immagini da Google Drive e le carica su Supabase Storage
// Uso: node scripts/upload-volunteer-images.js

const SUPABASE_URL = 'https://ladbcsmweykcpilyesxh.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZGJjc213ZXlrY3BpbHllc3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzk3NDQsImV4cCI6MjA5NzYxNTc0NH0.zki0I9FH3xGj_xhC9uLlzfFZwj5LmZITmv0F88eithc';
const BUCKET = 'volunteer-images';

const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

async function getVolunteers() {
  // Target volunteers with a Drive URL whose upload hasn't been confirmed yet
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/volunteers?url_immagini=not.is.null&ha_immagini=eq.false&select=slug,cognome,nome,url_immagini`,
    { headers: HEADERS }
  );
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${await res.text()}`);
  return res.json();
}

function extractFileId(url) {
  const m = url.match(/[?&]id=([^&]+)/);
  return m ? m[1] : null;
}

async function downloadImage(fileId) {
  // Prova prima il thumbnail ad alta risoluzione (funziona per file pubblici)
  const urls = [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FuoriCampo/1.0)' },
      });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.startsWith('image/')) continue; // Google ha restituito HTML (login / warning)
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 1000) continue; // troppo piccolo, probabilmente errore
      return { buffer, contentType: ct };
    } catch {
      // prova il prossimo URL
    }
  }
  return null;
}

function getExtension(contentType) {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

async function uploadToStorage(slug, buffer, contentType) {
  const ext = getExtension(contentType);
  const path = `${slug}/main.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload fallito (${res.status}): ${text}`);
  }

  return path;
}

async function updateImagePath(slug, imagePath) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/volunteers?slug=eq.${slug}`, {
    method: 'PATCH',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ image_path: imagePath, ha_immagini: true }),
  });
  if (!res.ok) throw new Error(`DB update fallito: ${res.status}`);
}

async function main() {
  console.log('Recupero volontari con immagini da Supabase...');
  const volunteers = await getVolunteers();
  console.log(`Trovati ${volunteers.length} volontari con link Google Drive\n`);

  let ok = 0;
  let skip = 0;
  let fail = 0;
  const sqlUpdates = [];

  for (const vol of volunteers) {
    const label = `${vol.cognome} ${vol.nome}`;
    const fileId = extractFileId(vol.url_immagini);

    if (!fileId) {
      console.log(`  SKIP  ${label} — ID file non trovato nell'URL`);
      skip++;
      continue;
    }

    process.stdout.write(`  ↓     ${label} ... `);

    try {
      const result = await downloadImage(fileId);
      if (!result) {
        console.log('PRIVATO (il file Drive non è pubblico — scaricalo manualmente)');
        fail++;
        continue;
      }

      const imagePath = await uploadToStorage(vol.slug, result.buffer, result.contentType);
      // Try DB update; if it silently fails (no UPDATE policy), collect SQL for manual run
      await updateImagePath(vol.slug, imagePath);
      sqlUpdates.push(`UPDATE volunteers SET image_path = '${imagePath}', ha_immagini = true WHERE slug = '${vol.slug}';`);
      console.log(`OK → ${imagePath} (${Math.round(result.buffer.byteLength / 1024)} KB)`);
      ok++;
    } catch (err) {
      console.log(`ERRORE: ${err.message}`);
      fail++;
    }

    // piccola pausa per evitare rate limiting
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Caricati: ${ok}  |  Falliti: ${fail}  |  Saltati: ${skip}`);
  if (sqlUpdates.length > 0) {
    console.log(`\nSQL per aggiornare il DB (esegui in Supabase SQL Editor se i path non si aggiornano):`);
    console.log(sqlUpdates.join('\n'));
  }
  if (fail > 0) {
    console.log(`\nI file "PRIVATO" devono essere scaricati manualmente da Google Drive`);
    console.log(`e caricati su Supabase Storage in: ${BUCKET}/{slug}/main.jpg`);
  }
}

main().catch((err) => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
