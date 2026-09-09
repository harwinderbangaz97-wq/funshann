export interface ChatWallpaper {
  id: string;
  name: string;
  category: 'doodle' | 'whatsapp' | 'minimal' | 'solid' | 'gradient' | 'nature' | 'dark' | 'custom';
  thumbnail: string;
  type: 'image' | 'gradient' | 'pattern' | 'solid' | 'doodle';
  value: string; // url, gradient css, or color
  description: string;
  doodleColor?: string;
}

// Doodle SVG repeating pattern (url-encoded SVG with classic chat & lifestyle doodle icons)
export const CHAT_DOODLE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.16">
  <!-- Coffee Cup -->
  <path d="M25 35h18v14a9 9 0 0 1-9 9h0a9 9 0 0 1-9-9V35z"/>
  <path d="M43 40h4a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-4"/>
  <path d="M21 62h26"/>

  <!-- Chat Bubble -->
  <path d="M110 30h24a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-16l-8 7v-7h-0a8 8 0 0 1-0-16z"/>
  <circle cx="120" cy="44" r="1.5" fill="currentColor"/>
  <circle cx="126" cy="44" r="1.5" fill="currentColor"/>
  <circle cx="132" cy="44" r="1.5" fill="currentColor"/>

  <!-- Camera -->
  <path d="M210 32h8l3 5h14a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5h-25a5 5 0 0 1-5-5V42a5 5 0 0 1 5-5z"/>
  <circle cx="225" cy="49" r="6"/>

  <!-- Heart -->
  <path d="M40 120 C 40 108, 20 108, 20 125 C 20 138, 40 152, 40 152 C 40 152, 60 138, 60 125 C 60 108, 40 108, 40 120 Z"/>

  <!-- Headphones -->
  <path d="M115 130a15 15 0 0 1 30 0v12h-4v-8h4"/>
  <rect x="111" y="136" width="6" height="12" rx="3"/>
  <rect x="143" y="136" width="6" height="12" rx="3"/>

  <!-- Rocket -->
  <path d="M225 115c5 5 15 8 20 5-3-5-0-15-5-20-8 8-15 15-15 15z"/>
  <path d="M220 120l-8 8 5 2 2 5 8-8"/>
  <circle cx="232" cy="108" r="2"/>

  <!-- Sparkle Star -->
  <path d="M65 80 L67 86 L73 88 L67 90 L65 96 L63 90 L57 88 L63 86 Z"/>
  <path d="M185 85 L186 89 L190 90 L186 91 L185 95 L184 91 L180 90 L184 89 Z"/>

  <!-- Clock / Watch -->
  <circle cx="215" cy="195" r="14"/>
  <polyline points="215 186 215 195 221 198"/>
  <path d="M208 181h14M208 209h14"/>

  <!-- Gamepad -->
  <rect x="30" y="200" width="34" height="20" rx="8"/>
  <line x1="39" y1="206" x2="39" y2="214"/>
  <line x1="35" y1="210" x2="43" y2="210"/>
  <circle cx="53" cy="207" r="1.5" fill="currentColor"/>
  <circle cx="57" cy="212" r="1.5" fill="currentColor"/>

  <!-- Music Note -->
  <path d="M125 215v-16l14-4v16"/>
  <circle cx="120" cy="216" r="4"/>
  <circle cx="134" cy="211" r="4"/>

  <!-- Fruit / Avocado -->
  <ellipse cx="120" cy="100" rx="10" ry="14"/>
  <circle cx="120" cy="104" r="5"/>

  <!-- Message Bubble 2 -->
  <path d="M165 170h18a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6h-12l-6 5v-5h-0a6 6 0 0 1-0-12z"/>

  <!-- Sun / Flower -->
  <circle cx="250" cy="250" r="5"/>
  <path d="M250 240v3M250 257v3M240 250h3M257 250h3"/>
</svg>`;

// Alias for backwards compatibility
export const WHATSAPP_DOODLE_SVG = CHAT_DOODLE_SVG;

export const CHAT_WALLPAPERS: ChatWallpaper[] = [
  // --- 1. CHAT DOODLE CLASSICS ---
  {
    id: 'doodle-beige',
    name: 'Classic Chat Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#efeae2',
    doodleColor: '#7a6e5d',
    description: 'Timeless warm cream beige doodle pattern',
  },
  {
    id: 'whatsapp-doodle-beige', // Kept for saved storage compatibility
    name: 'Classic Chat Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#efeae2',
    doodleColor: '#7a6e5d',
    description: 'Timeless warm cream beige doodle pattern',
  },
  {
    id: 'doodle-dark',
    name: 'Midnight Dark Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#0b141a',
    doodleColor: '#3c4e5a',
    description: 'Sleek OLED dark mode doodle theme',
  },
  {
    id: 'whatsapp-doodle-dark', // Kept for saved storage compatibility
    name: 'Midnight Dark Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#0b141a',
    doodleColor: '#3c4e5a',
    description: 'Sleek OLED dark mode doodle theme',
  },
  {
    id: 'doodle-mint',
    name: 'Mint Meadow Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#d8f3dc',
    doodleColor: '#40916c',
    description: 'Refreshing pistachio & mint green doodle',
  },
  {
    id: 'whatsapp-doodle-mint', // Kept for saved storage compatibility
    name: 'Mint Meadow Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#d8f3dc',
    doodleColor: '#40916c',
    description: 'Refreshing pistachio & mint green doodle',
  },
  {
    id: 'doodle-sky',
    name: 'Cerulean Sky Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#dcebfa',
    doodleColor: '#4361ee',
    description: 'Gentle cerulean sky doodle pattern',
  },
  {
    id: 'whatsapp-doodle-sky', // Kept for saved storage compatibility
    name: 'Cerulean Sky Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#dcebfa',
    doodleColor: '#4361ee',
    description: 'Gentle cerulean sky doodle pattern',
  },
  {
    id: 'doodle-rose',
    name: 'Rosé Petal Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#fce4ec',
    doodleColor: '#c2185b',
    description: 'Soft rose blush doodle theme',
  },
  {
    id: 'whatsapp-doodle-rose', // Kept for saved storage compatibility
    name: 'Rosé Petal Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#fce4ec',
    doodleColor: '#c2185b',
    description: 'Soft rose blush doodle theme',
  },
  {
    id: 'doodle-lavender',
    name: 'Lavender Mist Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#ede7f6',
    doodleColor: '#673ab7',
    description: 'Soft lavender violet doodle background',
  },
  {
    id: 'doodle-peach',
    name: 'Peach Sunset Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#ffe0b2',
    doodleColor: '#e65100',
    description: 'Warm pastel peach doodle backdrop',
  },
  {
    id: 'doodle-sage',
    name: 'Sage Botanical Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#e8f5e9',
    doodleColor: '#2e7d32',
    description: 'Calm organic sage leaf doodle',
  },
  {
    id: 'doodle-espresso',
    name: 'Espresso Mocha Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#1c1917',
    doodleColor: '#78716c',
    description: 'Rich dark roasted cocoa & mocha doodle',
  },
  {
    id: 'doodle-teal',
    name: 'Ocean Teal Doodle',
    category: 'doodle',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80',
    type: 'doodle',
    value: '#e0f2f1',
    doodleColor: '#00695c',
    description: 'Serene coastal aqua marine doodle',
  },

  // --- 2. SOLID COLORS ---
  {
    id: 'solid-beige',
    name: 'Warm Cream Solid',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#efeae2',
    description: 'Classic warm cream chat background',
  },
  {
    id: 'solid-whatsapp-beige', // Kept for saved storage compatibility
    name: 'Warm Cream Solid',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#efeae2',
    description: 'Classic warm cream chat background',
  },
  {
    id: 'solid-emerald',
    name: 'Emerald Forest',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#075e54',
    description: 'Signature deep emerald shade',
  },
  {
    id: 'solid-dark-charcoal',
    name: 'Midnight Charcoal',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#121b22',
    description: 'Dark OLED solid background',
  },
  {
    id: 'solid-soft-lavender',
    name: 'Soft Lavender',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#ece7f6',
    description: 'Gentle pastel lavender solid',
  },
  {
    id: 'solid-clean-gray',
    name: 'Nordic Mist',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#f1f5f9',
    description: 'Clean balanced light neutral backdrop',
  },
  {
    id: 'solid-sapphire',
    name: 'Deep Sapphire',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#0f172a',
    description: 'Midnight navy blue solid',
  },
  {
    id: 'solid-sage',
    name: 'Muted Sage',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#e2ebd8',
    description: 'Relaxing earthy sage green solid',
  },
  {
    id: 'solid-terracotta',
    name: 'Terracotta Clay',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#c86446',
    description: 'Warm Mediterranean clay earth tone',
  },
  {
    id: 'solid-dune',
    name: 'Sand Dune',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#f5ebe0',
    description: 'Warm desert silk sand solid',
  },
  {
    id: 'solid-powder-blue',
    name: 'Powder Sky',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#e0f2fe',
    description: 'Soft powder blue peaceful backdrop',
  },
  {
    id: 'solid-pure-black',
    name: 'Pure OLED Black',
    category: 'solid',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: '#000000',
    description: 'True battery-saving zero-black',
  },

  // --- 3. MINIMAL & PATTERNS ---
  {
    id: 'clean-default',
    name: 'Clean Neumorphic',
    category: 'minimal',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
    type: 'solid',
    value: 'transparent',
    description: 'Default clean tactile backdrop',
  },
  {
    id: 'dot-grid',
    name: 'Zen Dot Matrix',
    category: 'minimal',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    type: 'pattern',
    value: 'radial-gradient(rgba(91, 157, 255, 0.25) 1.5px, transparent 1.5px)',
    description: 'Subtle geometric dot array',
  },
  {
    id: 'architect-grid',
    name: 'Architect Grid',
    category: 'minimal',
    thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop&q=80',
    type: 'pattern',
    value: 'linear-gradient(to right, rgba(91, 157, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(91, 157, 255, 0.1) 1px, transparent 1px)',
    description: 'Clean drafting coordinates',
  },
  {
    id: 'diagonal-stripe',
    name: 'Soft Pinstripe',
    category: 'minimal',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    type: 'pattern',
    value: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(148, 163, 184, 0.08) 12px, rgba(148, 163, 184, 0.08) 13px)',
    description: 'Minimal diagonal fine stripes',
  },
  {
    id: 'isometric-cube',
    name: 'Isometric Blueprint',
    category: 'minimal',
    thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop&q=80',
    type: 'pattern',
    value: 'linear-gradient(60deg, rgba(99, 102, 241, 0.08) 1px, transparent 1px), linear-gradient(-60deg, rgba(99, 102, 241, 0.08) 1px, transparent 1px)',
    description: 'Modern technical blueprint mesh',
  },

  // --- 4. SOFT AESTHETIC GRADIENTS ---
  {
    id: 'pastel-aurora',
    name: 'Pastel Aurora',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    description: 'Soft lilac & sky blue wash',
  },
  {
    id: 'sunset-blush',
    name: 'Sunset Blush',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    description: 'Warm peach & rose radiance',
  },
  {
    id: 'ocean-mist',
    name: 'Ocean Mist',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    description: 'Gentle coastal morning surf',
  },
  {
    id: 'matcha-calm',
    name: 'Matcha Herb',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
    description: 'Refreshing botanical mint & matcha',
  },
  {
    id: 'northern-lights',
    name: 'Northern Lights',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    description: 'Luminous emerald & arctic teal',
  },
  {
    id: 'twilight-velvet',
    name: 'Twilight Velvet',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'Regal indigo & velvet amethyst',
  },
  {
    id: 'golden-horizon',
    name: 'Golden Horizon',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    description: 'Golden hour sunshine & amber warmth',
  },
  {
    id: 'malibu-breeze',
    name: 'Malibu Breeze',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    description: 'Crisp Pacific coast azure gradient',
  },
  {
    id: 'sakura-bloom',
    name: 'Sakura Bloom',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
    description: 'Delicate cherry blossom pastel blend',
  },
  {
    id: 'lavender-haze',
    name: 'Lavender Haze',
    category: 'gradient',
    thumbnail: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #c471ed 0%, #f64f59 100%)',
    description: 'Vibrant plum & berry radiance',
  },

  // --- 5. CALM & AESTHETIC NATURE PHOTOGRAPHY ---
  {
    id: 'alpine-fog',
    name: 'Alpine Fog',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    description: 'Misty pine forest & mountain haze',
  },
  {
    id: 'botanical-palm',
    name: 'Monstera Shadow',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&auto=format&fit=crop&q=80',
    description: 'Minimalist organic shadows & flora',
  },
  {
    id: 'desert-dune',
    name: 'Silk Dune Sand',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&auto=format&fit=crop&q=80',
    description: 'Harmonious desert curves & ripples',
  },
  {
    id: 'tokyo-rain',
    name: 'Rain Bokeh',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1200&auto=format&fit=crop&q=80',
    description: 'Warm night rain drops on window glass',
  },
  {
    id: 'kyoto-bamboo',
    name: 'Kyoto Bamboo',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80',
    description: 'Peaceful Japanese bamboo grove canopy',
  },
  {
    id: 'lake-reflection',
    name: 'Emerald Mountain Lake',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&auto=format&fit=crop&q=80',
    description: 'Pristine mountain mirror water reflection',
  },
  {
    id: 'tropical-sunset',
    name: 'Golden Shore Sunset',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    description: 'Serene ocean horizon and evening surf',
  },
  {
    id: 'cascading-waterfall',
    name: 'Cascading Falls',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&auto=format&fit=crop&q=80',
    description: 'Lush green canyon waterfall stream',
  },
  {
    id: 'sakura-spring',
    name: 'Cherry Blossom Park',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1200&auto=format&fit=crop&q=80',
    description: 'Soft pink sakura petals in spring breeze',
  },
  {
    id: 'dolomite-peaks',
    name: 'Alpine Sunlit Peaks',
    category: 'nature',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80',
    description: 'Majestic mountain sunrise ridges',
  },

  // --- 6. DARK & ATMOSPHERIC ---
  {
    id: 'midnight-obsidian',
    name: 'Midnight Obsidian',
    category: 'dark',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #090d16 100%)',
    description: 'Deep starlit midnight slate',
  },
  {
    id: 'cyber-neon-dark',
    name: 'Cyber Violet Night',
    category: 'dark',
    thumbnail: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #180d2b 0%, #2e1065 50%, #0d061a 100%)',
    description: 'Electric violet twilight ambiance',
  },
  {
    id: 'cosmos-stars',
    name: 'Cosmic Starlight',
    category: 'dark',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    description: 'Quiet starry galaxy night sky',
  },
  {
    id: 'neon-tokyo',
    name: 'Neon Metropolis',
    category: 'dark',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    description: 'Vibrant neon city reflections at midnight',
  },
  {
    id: 'deep-space-nebula',
    name: 'Orion Nebula',
    category: 'dark',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    description: 'Deep cosmic dust and stellar glow',
  },
  {
    id: 'liquid-titanium',
    name: 'Liquid Titanium',
    category: 'dark',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #1e2024 0%, #2a2d34 50%, #121316 100%)',
    description: 'Sleek brushed titanium metallic luster',
  },
  {
    id: 'abyss-deep-glow',
    name: 'Oceanic Abyss',
    category: 'dark',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #020617 0%, #0f2b48 50%, #020617 100%)',
    description: 'Mysterious midnight ocean trench blue',
  },
  {
    id: 'matrix-emerald',
    name: 'Matrix Dark Emerald',
    category: 'dark',
    thumbnail: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=200&auto=format&fit=crop&q=80',
    type: 'gradient',
    value: 'linear-gradient(135deg, #051b14 0%, #0d3829 50%, #020d0a 100%)',
    description: 'High-contrast deep cyber forest green',
  },
];
