import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');
const assetsDir = path.resolve(distDir, 'assets');

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist. Please run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  console.error('Could not find CSS or JS bundle in dist/assets');
  process.exit(1);
}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');

const standaloneHtml = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:b="http://www.google.com/2005/gml/b" xmlns:data="http://www.google.com/2005/gml/data" xmlns:expr="http://www.google.com/2005/gml/expr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Funshann – Connect, Share &amp; Discover</title>
  <meta name="description" content="Funshann is a social platform to connect with people, share posts, discover content and chat with your community." />
  <link rel="canonical" href="https://funshann.blogspot.com/" />

  <!-- Favicon / Brand Logo -->
  <link rel="icon" type="image/x-icon" href="https://funshann.blogspot.com/favicon.ico" />
  <link rel="shortcut icon" href="https://funshann.blogspot.com/favicon.ico" />
  <link rel="apple-touch-icon" href="https://harwinderbangaz97-wq.github.io/funshann/logo.png" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://funshann.blogspot.com/" />
  <meta property="og:title" content="Funshann – Connect, Share &amp; Discover" />
  <meta property="og:description" content="Funshann is a social platform to connect with people, share posts, discover content and chat with your community." />
  <meta property="og:image" content="https://harwinderbangaz97-wq.github.io/funshann/logo.png" />
  <meta property="og:image:secure_url" content="https://harwinderbangaz97-wq.github.io/funshann/logo.png" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:image:alt" content="Funshann – Connect, Share &amp; Discover" />
  <meta property="og:site_name" content="Funshann" />

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://funshann.blogspot.com/" />
  <meta name="twitter:title" content="Funshann – Connect, Share &amp; Discover" />
  <meta name="twitter:description" content="Funshann is a social platform to connect with people, share posts, discover content and chat with your community." />
  <meta name="twitter:image" content="https://harwinderbangaz97-wq.github.io/funshann/logo.png" />
  <meta name="twitter:image:alt" content="Funshann – Connect, Share &amp; Discover" />

  <meta name="theme-color" content="#0F172A" />
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&amp;family=Outfit:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet" />
  
  <!-- Blogger required skin tag (empty/minimal to prevent default blogger overrides) -->
  <b:skin><![CDATA[
    /* Reset Blogger default styles */
    body, html { margin:0; padding:0; width:100%; height:100%; }
    .navbar, .header, .footer, .widget { display:none !important; }
  ]]></b:skin>

  <style>
/*<![CDATA[*/
${cssContent}
/*]]>*/
  </style>
</head>
<body class="bg-[#f4f7fb] text-[#1e293b] antialiased selection:bg-[#5B9DFF]/20 selection:text-[#1d4ed8] overflow-x-hidden">
  <!-- Blogger Main Section Requirement -->
  <b:section id="main" preferred="yes" maxwidgets="1" showaddelement="no"></b:section>

  <div id="root"></div>
  <div id="recaptcha-container"></div>

  <script>
//<![CDATA[
${jsContent}
//]]>
  </script>
</body>
</html>`;

const outPathDist = path.join(distDir, 'standalone.html');
fs.writeFileSync(outPathDist, standaloneHtml, 'utf-8');

// Ensure root standalone.html
const outPathRoot = path.resolve(process.cwd(), 'standalone.html');
fs.writeFileSync(outPathRoot, standaloneHtml, 'utf-8');

// Ensure .nojekyll in dist, root, and public to prevent GitHub Pages Jekyll processing
fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf-8');
fs.writeFileSync(path.resolve(process.cwd(), '.nojekyll'), '', 'utf-8');

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const outPathPublic = path.join(publicDir, 'standalone.html');
fs.writeFileSync(outPathPublic, standaloneHtml, 'utf-8');
fs.writeFileSync(path.join(publicDir, '.nojekyll'), '', 'utf-8');

// Strip root-to-docs redirect from dist/index.html so docs/ can be served as root without redirect loops
const distIndexHtml = path.join(distDir, 'index.html');
if (fs.existsSync(distIndexHtml)) {
  let indexContent = fs.readFileSync(distIndexHtml, 'utf-8');
  indexContent = indexContent.replace(/<!-- REDIRECT_ROOT_TO_DOCS_START -->[\s\S]*?<!-- REDIRECT_ROOT_TO_DOCS_END -->/g, '');
  fs.writeFileSync(distIndexHtml, indexContent, 'utf-8');
  fs.writeFileSync(path.join(distDir, '404.html'), indexContent, 'utf-8');
}

// Sync dist/assets to root ./assets for root deployment fallback
const rootAssetsDir = path.resolve(process.cwd(), 'assets');
try {
  if (fs.existsSync(rootAssetsDir)) {
    fs.rmSync(rootAssetsDir, { recursive: true, force: true });
  }
  fs.cpSync(assetsDir, rootAssetsDir, { recursive: true });
} catch (e) {
  console.warn('Could not sync assets to root:', e);
}

// Sync to docs/ directory for GitHub Pages "Deploy from branch (/docs)" support
const docsDir = path.resolve(process.cwd(), 'docs');
try {
  if (fs.existsSync(docsDir)) {
    fs.rmSync(docsDir, { recursive: true, force: true });
  }
  fs.cpSync(distDir, docsDir, { recursive: true });
  console.log(' - ' + docsDir + ' (Synced for GitHub Pages /docs deploy)');
} catch (e) {
  console.warn('Could not sync to docs directory:', e);
}

console.log('Successfully created standalone HTML bundle at:');
console.log(' - ' + outPathDist);
console.log(' - ' + outPathRoot);
console.log(' - ' + outPathPublic);
console.log('File size: ' + (Buffer.byteLength(standaloneHtml, 'utf-8') / (1024 * 1024)).toFixed(2) + ' MB');
