import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');
const assetsDir = path.resolve(distDir, 'assets');

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist. Please run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.startsWith('index') && f.endsWith('.css')) || files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.startsWith('index') && f.endsWith('.js')) || files.find(f => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  console.error('Could not find CSS or JS bundle in dist/assets');
  process.exit(1);
}

// Preserve existing legacy css asset name expected by Git/GitHub sync
try {
  fs.copyFileSync(path.join(assetsDir, cssFile), path.join(assetsDir, 'index-DWEo1j6q.css'));
} catch {}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');

// Safely escape any internal closing script tags to prevent premature parser termination
const safeJsContent = jsContent.replace(/<\/script/gi, '<\\/script');

const standaloneHtml = `<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE html>
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

  <!-- Google Analytics (GA4) -->
  <script async="async" src="https://www.googletagmanager.com/gtag/js?id=G-5MV7RJX0DN"></script>
  <script>
//<![CDATA[
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-5MV7RJX0DN');
//]]>
  </script>

  <!-- Schema.org JSON-LD Structured Data -->
  <script type="application/ld+json">
//<![CDATA[
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Funshann",
    "url": "https://funshann.blogspot.com/",
    "description": "Funshann is a social platform to connect with people, share posts, discover content and chat with your community.",
    "applicationCategory": "SocialNetworkingApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires JavaScript. Requires HTML5."
  }
//]]>
  </script>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&amp;family=Outfit:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet" />
  
  <!-- Blogger required skin tag (empty/minimal to prevent default blogger overrides) -->
  <b:skin><![CDATA[
    /* Reset Blogger default styles */
    body, html { margin:0; padding:0; width:100%; height:100%; }
    .navbar, .header, .footer, .widget, .post-feeds, .feed-links, .blog-pager { display:none !important; }
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

  <div id="root">
    <!-- High-performance splash placeholder matching the Funshann splash screen -->
    <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(to bottom, #F2F6FC, #EDF3FA, #E5EEF9); font-family: sans-serif; padding: 20px; text-align: center;">
      <div style="width: 140px; height: 140px; border-radius: 50%; background: #ffffff; box-shadow: 0 20px 40px rgba(100,116,139,0.25); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.8); overflow: hidden; padding: 6px;">
        <img src="https://harwinderbangaz97-wq.github.io/funshann/logo.png" alt="Funshann Official Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Ccircle cx=\\'50\\' cy=\\'50\\' r=\\'50\\' fill=\\'%23ffffff\\'/%3E%3Ctext x=\\'50\\' y=\\'68\\' font-size=\\'55\\' font-weight=\\'bold\\' text-anchor=\\'middle\\' fill=\\'%23000000\\' font-family=\\'sans-serif\\'%3EF%3C/text%3E%3C/svg%3E'" />
      </div>
      <h2 style="margin: 0 0 8px 0; color: #1E293B; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; font-family: 'Outfit', sans-serif;">Funshann</h2>
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #2F7CF6; animation: bounce 1.4s infinite ease-in-out both;"></div>
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #2F7CF6; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.16s;"></div>
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #2F7CF6; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.32s;"></div>
      </div>
      <style>@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }</style>
    </div>
  </div>
  <div id="recaptcha-container"></div>

  <script>
//<![CDATA[
${safeJsContent}
//]]>
  </script>
</body>
</html>`;

const outPathDist = path.join(distDir, 'standalone.html');
fs.writeFileSync(outPathDist, standaloneHtml, 'utf-8');

// Ensure root standalone.html
const outPathRoot = path.resolve(process.cwd(), 'standalone.html');
fs.writeFileSync(outPathRoot, standaloneHtml, 'utf-8');

// Ensure blogger_standalone_funshann.html is populated with the complete direct-rendering application
const outPathBlogger = path.resolve(process.cwd(), 'blogger_standalone_funshann.html');
fs.writeFileSync(outPathBlogger, standaloneHtml, 'utf-8');
const outPathBloggerDist = path.join(distDir, 'blogger_standalone_funshann.html');
fs.writeFileSync(outPathBloggerDist, standaloneHtml, 'utf-8');

// Ensure .nojekyll in dist, root, and public to prevent GitHub Pages Jekyll processing
fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf-8');
fs.writeFileSync(path.resolve(process.cwd(), '.nojekyll'), '', 'utf-8');

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const outPathPublic = path.join(publicDir, 'standalone.html');
fs.writeFileSync(outPathPublic, standaloneHtml, 'utf-8');
const outPathPublicBlogger = path.join(publicDir, 'blogger_standalone_funshann.html');
fs.writeFileSync(outPathPublicBlogger, standaloneHtml, 'utf-8');
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
  if (!fs.existsSync(rootAssetsDir)) {
    fs.mkdirSync(rootAssetsDir, { recursive: true });
  }
  fs.cpSync(assetsDir, rootAssetsDir, { recursive: true });
  // Ensure legacy assets required by repository sync are preserved if present in dist
  const legacyCssDist = path.join(assetsDir, 'index-DWEo1j6q.css');
  if (fs.existsSync(legacyCssDist)) {
    fs.copyFileSync(legacyCssDist, path.join(rootAssetsDir, 'index-DWEo1j6q.css'));
  }
} catch (e) {
  console.warn('Could not sync assets to root:', e);
}

// Sync to docs/ directory for GitHub Pages "Deploy from branch (/docs)" support
const docsDir = path.resolve(process.cwd(), 'docs');
try {
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.cpSync(distDir, docsDir, { recursive: true });
  const legacyCssDist = path.join(assetsDir, 'index-DWEo1j6q.css');
  if (fs.existsSync(legacyCssDist)) {
    const docsAssetsDir = path.join(docsDir, 'assets');
    if (!fs.existsSync(docsAssetsDir)) {
      fs.mkdirSync(docsAssetsDir, { recursive: true });
    }
    fs.copyFileSync(legacyCssDist, path.join(docsAssetsDir, 'index-DWEo1j6q.css'));
  }
  console.log(' - ' + docsDir + ' (Synced for GitHub Pages /docs deploy)');
} catch (e) {
  console.warn('Could not sync to docs directory:', e);
}

console.log('Successfully created standalone HTML bundle at:');
console.log(' - ' + outPathDist);
console.log(' - ' + outPathRoot);
console.log(' - ' + outPathPublic);
console.log('File size: ' + (Buffer.byteLength(standaloneHtml, 'utf-8') / (1024 * 1024)).toFixed(2) + ' MB');
