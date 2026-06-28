/**
 * DESIGN SYSTEM & STYLING GUIDE — v2
 * Injected into the Builder Agent prompt on every generation.
 * Target bar: the output must look like a $5,000 custom-designed landing page.
 */

export const STYLING_GUIDE = `
╔══════════════════════════════════════════════════════╗
║  PREMIUM LANDING PAGE DESIGN SYSTEM — FOLLOW EXACTLY ║
╚══════════════════════════════════════════════════════╝

The goal is a FINISHED, SHIPPABLE product — indistinguishable from pages
built by a senior designer + engineer team. Every section must be polished,
every word intentional, every interaction delightful.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§1  CSS ANIMATIONS — USE THIS EXACT PATTERN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Inject a <style> tag as the FIRST child of your return statement so custom
keyframe animations are available everywhere on the page.

\`\`\`tsx
export default function LandingPage() {
  return (
    <>
      <style>{\`
        @keyframes float    { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-14px)} }
        @keyframes marquee  { 0%{transform:translateX(0)}          100%{transform:translateX(-50%)} }
        @keyframes fade-up  { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fade-in  { from{opacity:0} to{opacity:1} }
        @keyframes glow-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes gradient-x { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes scale-in { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }

        .anim-float       { animation: float 5s ease-in-out infinite }
        .anim-marquee     { animation: marquee 28s linear infinite }
        .anim-fade-up     { animation: fade-up .65s cubic-bezier(.22,1,.36,1) both }
        .anim-fade-in     { animation: fade-in .5s ease both }
        .anim-glow        { animation: glow-pulse 3s ease-in-out infinite }
        .anim-gradient-x  { animation: gradient-x 5s ease infinite; background-size: 200% 200% }
        .anim-scale-in    { animation: scale-in .5s cubic-bezier(.22,1,.36,1) both }

        .delay-1 { animation-delay: .1s }
        .delay-2 { animation-delay: .2s }
        .delay-3 { animation-delay: .3s }
        .delay-4 { animation-delay: .4s }
        .delay-5 { animation-delay: .55s }

        .shimmer-btn {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.18) 50%, transparent 100%);
          background-size: 200% auto;
        }
        .shimmer-btn:hover { animation: shimmer 1.6s linear infinite }

        .glass-card {
          background: rgba(255,255,255,.04);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,.09);
        }
        .glow-border {
          box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 0 30px rgba(139,92,246,.15);
        }
      \`}</style>

      {/* rest of page */}
    </>
  );
}
\`\`\`

Use these classes throughout: anim-float on hero visuals, anim-marquee on logo strips,
anim-fade-up + delay-* on text/card reveals, glass-card on feature cards.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§2  MANDATORY SECTIONS — MINIMUM 8 SECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every page MUST contain ALL of these in a logical order:

1. NAVIGATION         — sticky, blurred, with CTA button
2. HERO               — headline + sub + dual CTA + social proof micro-element + visual
3. LOGO / TRUST STRIP — "Trusted by teams at [logos]" or "As seen in [press]"
4. PRIMARY FEATURES   — 3-col icon cards or alternating side-by-side
5. HOW IT WORKS       — numbered 3-step process with brief descriptions
6. SOCIAL PROOF       — 3 testimonial cards with photo placeholder, name, title, company
7. STATS STRIP        — 4 specific numbers with labels (animated counters)
8. CTA SECTION        — standalone, visually distinct, repeated value prop
9. FOOTER             — multi-column links + social + copyright

Optional but strongly recommended if applicable:
- PRICING             — 3-tier cards with feature comparison
- FAQ ACCORDION       — 5-6 Q&A pairs with expand/collapse
- INTEGRATIONS        — icon grid of compatible tools

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§3  PRODUCT CATEGORY → LAYOUT ARCHETYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Identify the product type and apply the correct layout, hero style, and tone.

▸ B2B SaaS / Productivity / Team Tools
  Hero: Centered or left-split, dark bg, gradient headline, no full-bleed image
  Sections: logo marquee → alternating features → how it works → testimonials → pricing → FAQ → CTA
  CTA pair: "Start free →" (filled, primary) + "Book a demo" (ghost)
  Tone: confident, outcome-driven, professional

▸ Developer Tools / API / CLI
  Hero: Dark terminal aesthetic, monospace code snippet in hero, syntax highlighting via colored spans
  Sections: code demo → integration logos → performance stats table → testimonials (engineers) → pricing → CTA
  CTA pair: "Get API key →" + "Read docs"
  Tone: precise, technical, efficient

▸ Consumer Mobile App
  Hero: Emotional headline, large phone mockup image (use anim-float), gradient bg
  Sections: app store badges + stats → benefits 3-col → how-it-works steps → reviews wall → download CTA
  CTA pair: "Download free →" + "No credit card · Works on iOS & Android"
  Tone: friendly, benefit-first, aspirational

▸ Marketplace / Two-sided Platform
  Hero: Dual value props side by side, or single powerful unified benefit
  Sections: stat strip (volume, sellers, buyers) → how it works → testimonials from both sides → CTA
  CTA pair: Two CTAs — one per audience
  Tone: trustworthy, community-driven, growth-focused

▸ E-commerce / Product Brand
  Hero: Full-bleed product photography + overlay text, strong visual impact
  Sections: feature grid → lifestyle imagery → social proof (UGC + reviews) → urgency CTA
  CTA pair: "Shop now →" + "Free shipping over $X"
  Tone: aspirational, direct, sensory

▸ Agency / Creative / Studio
  Hero: Full-viewport typographic, minimal, high contrast
  Sections: selected work cards → about/team → client logos → process steps → contact CTA
  CTA pair: "Start a project →" + "See our work"
  Tone: confident, craft-focused, premium

▸ Health / Wellness / Coaching
  Hero: Warm photography + emotional headline
  Sections: transformation story → how it works → science/trust signals → community testimonials → pricing → CTA
  CTA pair: "Start your journey →" + "Free first session"
  Tone: empathetic, empowering, science-backed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§4  NAVIGATION — EXACT IMPLEMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`tsx
<nav className="fixed top-0 inset-x-0 z-50 glass-card border-b border-white/8 transition-all duration-300">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2.5 font-bold text-white text-lg">
      {/* logo mark: small colored rounded square with initials */}
      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[primaryColor] to-[accentColor] flex items-center justify-center text-white text-sm font-black">
        {brandInitials}
      </div>
      {brandName}
    </div>

    {/* Links — hidden on mobile */}
    <div className="hidden md:flex items-center gap-8">
      {navLinks.map(link => (
        <a key={link} href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-150">{link}</a>
      ))}
    </div>

    {/* CTA */}
    <button className="px-4 py-2 rounded-lg bg-[primaryColor] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
      Get started free
    </button>
  </div>
</nav>
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§5  HERO — CHOOSE ONE VARIANT PER GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Never default to the same hero layout. Rotate based on product category:

▸ Variant A — Centered Typographic (B2B / SaaS)
\`\`\`tsx
<section className="relative pt-32 pb-24 overflow-hidden">
  {/* Gradient mesh background */}
  <div className="absolute inset-0 -z-10">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-225 h-150 rounded-full bg-[primaryColor]/20 blur-[120px] anim-glow" />
    <div className="absolute top-1/3 right-0 w-100 h-100 rounded-full bg-[accentColor]/10 blur-[100px]" />
    {/* grid texture */}
    <div className="absolute inset-0 opacity-[0.03]"
      style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'60px 60px'}} />
  </div>

  <div className="max-w-4xl mx-auto text-center px-4">
    {/* Badge */}
    <div className="anim-fade-in inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[primaryColor]/30 bg-[primaryColor]/10 text-[primaryColor] text-xs font-semibold mb-8 tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-[primaryColor] animate-pulse" />
      {badgeText}
    </div>

    {/* H1 — outcome/transformation in ≤10 words */}
    <h1 className="anim-fade-up text-6xl md:text-8xl font-black tracking-tight leading-[.92] mb-6">
      <span className="text-white">{line1}</span>
      <br />
      <span className="anim-gradient-x bg-linear-to-r from-[primaryColor] via-[accentColor] to-[primaryColor] bg-clip-text text-transparent">
        {line2}
      </span>
    </h1>

    {/* Sub-headline — who it's for + specific outcome */}
    <p className="anim-fade-up delay-2 text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
      {specificSubHeadline}
    </p>

    {/* CTAs */}
    <div className="anim-fade-up delay-3 flex flex-col sm:flex-row gap-4 justify-center mb-12">
      <button className="shimmer-btn px-8 py-4 rounded-2xl bg-[primaryColor] text-white font-bold text-base shadow-[0_0_30px_rgba(VAR,.45)] hover:shadow-[0_0_50px_rgba(VAR,.65)] transition-shadow">
        {primaryCTA} →
      </button>
      <button className="px-8 py-4 rounded-2xl border border-white/15 text-zinc-300 hover:text-white hover:border-white/30 font-semibold text-base transition-all">
        {secondaryCTA}
      </button>
    </div>

    {/* Micro social proof */}
    <div className="anim-fade-up delay-4 flex items-center justify-center gap-3 text-zinc-500 text-sm">
      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {["#7c3aed","#2563eb","#059669","#dc2626"].map((c,i) => (
          <div key={i} className="w-7 h-7 rounded-full border-2 border-[bgColor] flex items-center justify-center text-white text-[9px] font-bold" style={{background:c}}>{initials[i]}</div>
        ))}
      </div>
      <span>Loved by <strong className="text-white">12,400+</strong> teams worldwide</span>
      <span className="text-amber-400">★★★★★</span>
    </div>
  </div>
</section>
\`\`\`

▸ Variant B — Split Layout (product-focused, feature-rich)
- Left half: headline + sub + CTAs + social proof element
- Right half: product screenshot or lifestyle Pexels image with anim-float + glow
- H1: text-5xl md:text-6xl font-black text-left leading-tight

▸ Variant C — Full-bleed Image Hero (consumer, lifestyle, brand)
- Background: Pexels image as absolute fill, bg-black/55 overlay gradient
- Text centered over image, text-white
- H1: text-5xl md:text-7xl font-black

▸ Variant D — Terminal / Code Hero (dev tools)
- Dark bg, monospace code block with colored spans for syntax highlighting
- Command prompt aesthetic: text-green-400 font-mono
- Headline above block, npm/curl command in a styled pre

▸ Variant E — Stats-Forward Hero (marketplace, scale)
- Giant numbers in hero: text-7xl md:text-8xl font-black
- Each stat with a one-line description below
- Grid of 3-4 stats, then CTAs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§6  PREMIUM VISUAL TECHNIQUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GLASS CARD (use for feature cards, testimonials, pricing):
\`\`\`tsx
<div className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300 cursor-default">
  {content}
</div>
\`\`\`

GRADIENT BORDER (premium feature card):
\`\`\`tsx
<div className="p-px rounded-2xl bg-linear-to-b from-white/20 to-white/5 hover:from-[primaryColor]/40 hover:to-[primaryColor]/5 transition-all duration-300">
  <div className="rounded-2xl bg-zinc-900 p-6 h-full">
    {content}
  </div>
</div>
\`\`\`

GLOW BUTTON (primary CTA):
\`\`\`tsx
<button className="shimmer-btn relative px-8 py-4 rounded-2xl bg-[primaryColor] text-white font-bold
  shadow-[0_0_25px_rgba(VAR,.4)] hover:shadow-[0_0_45px_rgba(VAR,.65)]
  active:scale-95 transition-all duration-200">
  {ctaText}
</button>
\`\`\`

GRADIENT MESH BG (behind any section):
\`\`\`tsx
<div className="absolute inset-0 -z-10 overflow-hidden">
  <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-200 h-200 rounded-full bg-[primaryColor]/15 blur-[130px]" />
  <div className="absolute bottom-0 right-0 w-125 h-125 rounded-full bg-[accentColor]/10 blur-[100px]" />
</div>
\`\`\`

LOGO MARQUEE (infinite scroll, no JS required):
\`\`\`tsx
<div className="overflow-hidden py-4">
  <div className="flex anim-marquee gap-16 whitespace-nowrap w-max">
    {/* Render the logo list TWICE so the scroll is seamless */}
    {[...logos, ...logos].map((logo, i) => (
      <span key={i} className="text-zinc-500 font-semibold text-sm tracking-widest uppercase opacity-50 hover:opacity-100 transition-opacity">
        {logo}
      </span>
    ))}
  </div>
</div>
\`\`\`

ANIMATED COUNTER (for stats section):
\`\`\`tsx
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let current = 0;
      const step = end / 60;
      const t = setInterval(() => {
        current = Math.min(current + step, end);
        setCount(Math.floor(current));
        if (current >= end) clearInterval(t);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}
\`\`\`

FAQ ACCORDION:
\`\`\`tsx
function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-white/8 max-w-3xl mx-auto">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full py-5 flex items-center justify-between text-left gap-4 group">
            <span className="font-semibold text-white group-hover:text-[primaryColor] transition-colors">{item.q}</span>
            <span className={\`text-zinc-500 text-xl transition-transform duration-200 \${open === i ? "rotate-45" : ""}\`}>+</span>
          </button>
          {open === i && (
            <p className="pb-6 text-zinc-400 leading-relaxed anim-fade-in">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§7  COPY WRITING — ZERO TOLERANCE FOR GENERIC TEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every word on the page must feel written by a world-class copywriter.

H1 FORMULA: [Transformation] + [Time/Method] — NOT a product description
  ✓ "Ship your product strategy in 2 minutes, not 2 weeks"
  ✓ "Turn any idea into a funded startup — before lunch"
  ✗ "The best project management tool for teams"
  ✗ "Welcome to {BrandName}"

SUBHEADLINE FORMULA: [Who] + [Specific outcome] + [Differentiator]
  ✓ "Built for solo founders and early-stage teams who need investor-ready docs fast — no designer, no agency."
  ✗ "We help startups grow faster with our innovative platform."

FEATURE TITLES: outcome-framed, not feature-named
  ✓ "Close deals 3× faster" (not "CRM module")
  ✓ "Never miss a deadline" (not "Task management")
  ✗ "Advanced analytics dashboard"

STATISTICS: always specific, never round
  ✓ "14,283 teams" — ✓ "47% faster" — ✓ "$2.4M saved"
  ✗ "thousands of teams" — ✗ "50% faster" — ✗ "save money"

TESTIMONIALS — must include ALL of:
  - Specific outcome they achieved (numbers preferred)
  - Author full name (realistic, not "John D.")
  - Job title (specific: "Head of Product" not "Manager")
  - Company name (realistic startup or company name)
  - Avatar: colored circle with initials (no broken image links)
  Example: "We cut our onboarding time from 3 weeks to 4 days. Absolutely remarkable."
           — Sarah Chen, Head of Product at Runway AI

CTA BUTTON TEXT: action verb + benefit, never generic
  ✓ "Start building free →"
  ✓ "Get my free strategy doc"
  ✓ "See it live in 60 seconds"
  ✗ "Get started" — ✗ "Learn more" — ✗ "Click here" — ✗ "Submit"

SECTION HEADLINES: benefit-framed, not label-based
  ✓ "Everything you need to go from idea to launch"
  ✓ "Stop losing time to tools that don't talk to each other"
  ✗ "Features" — ✗ "Our Product" — ✗ "What we offer"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§8  TYPOGRAPHY — EXACT SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
H1: text-6xl md:text-[5.5rem] lg:text-[7rem] font-black tracking-tight leading-[.90] (tight, display-style)
H2: text-3xl md:text-5xl font-bold tracking-tight leading-tight
H3: text-xl md:text-2xl font-semibold leading-snug
Body: text-base md:text-lg leading-[1.75] text-zinc-400 max-w-2xl
Label: text-xs font-mono uppercase tracking-[.15em] text-zinc-500
Stat number: text-5xl md:text-7xl font-black tracking-tighter tabular-nums
Testimonial quote: text-lg md:text-xl italic leading-relaxed text-zinc-200

GRADIENT TEXT PATTERN (headlines only):
\`\`\`tsx
<span className="anim-gradient-x bg-linear-to-r from-[primary] via-[accent] to-[primary] bg-clip-text text-transparent">
  {headlineText}
</span>
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§9  COLOR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use brand colors from brandIdentity. Apply as Tailwind arbitrary values: bg-[#hex] text-[#hex] border-[#hex]/30.

Dark mode (preferred for tech/SaaS):
  Base bg:    bg-[#09090b] (never pure #000)
  Surface 1:  bg-[#111115] or bg-zinc-900
  Surface 2:  bg-white/4 to bg-white/8
  Border:     border-white/8 to border-white/15
  Text P:     text-white
  Text S:     text-zinc-400
  Text T:     text-zinc-600
  Primary:    bg-[brandPrimary] — used for CTAs, active states, highlights
  Accent:     bg-[brandAccent] — used for badges, gradient endpoints, icons

Light mode (consumer/lifestyle/health):
  Base bg:    bg-white or bg-[#fafafa]
  Surface:    bg-gray-50 or bg-[#f4f4f5]
  Border:     border-gray-200
  Text P:     text-gray-900
  Text S:     text-gray-600
  Primary:    bg-[brandPrimary] — same rule

60 / 30 / 10 rule: 60% base, 30% surfaces, 10% brand color.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§10  SPACING & LAYOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Content shell: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Text-heavy sections: max-w-4xl mx-auto
Centered prose: max-w-2xl mx-auto

Section padding (vary — NEVER identical throughout):
  Hero:          pt-32 pb-24
  Feature/proof: py-24
  Stats/CTA:     py-20
  Footer:        pt-16 pb-10

Grid gaps: gap-6 (tight cards) / gap-8 (feature grid) / gap-12 (major sections)
Card padding: p-6 (compact) / p-8 (feature) / p-10 (hero CTA card)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§11  FEATURE SECTIONS — ROTATE PATTERNS, NEVER REPEAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use at least 2 of the following across the page (never the same layout twice):

A) 3-column glass cards — grid md:grid-cols-3 gap-6
   Each card: gradient border + icon (emoji or simple SVG) + title + 2-line description

B) Alternating side-by-side — even rows: image left / odd rows: image right
   Image: rounded-2xl overflow-hidden aspect-video / Text: headline + bullets with ✓

C) Large screenshot + feature list
   Full-width section, 50/50 split: Pexels image with rounded-3xl + drop-shadow | bullet list

D) Numbered How It Works — 3 steps
   Large muted step number (text-8xl font-black opacity-10) behind card
   Step title + description + optional icon

E) Metrics / Impact strip
   4 stats in a row, each: <Counter> number + suffix + label, separated by subtle dividers

F) Comparison (Us vs Them) — works for B2B
   Two columns, feature rows, checkmarks vs X marks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§12  SOCIAL PROOF — MANDATORY, SPECIFIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Include ALL of these somewhere on the page:

LOGO STRIP (immediately below hero or above footer):
  "Trusted by teams at" + 6-8 company name text pills using anim-marquee (double the list)

TESTIMONIAL CARDS (3 minimum):
  Each card must have:
  - Opening strong quote line in larger italic text
  - Full testimonial in body text
  - Colored circle avatar with real initials (NOT broken img tags)
  - Full name, exact job title, company name

STAR RATING somewhere on page:
  ★★★★★ in text-amber-400 + "4.9 / 5 from 2,300+ reviews"

STAT STRIP:
  4 specific, credible numbers with Counter animation:
  e.g. 14283 teams, 47% faster, $2.4M saved, 99.9% uptime

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§13  IMAGES & VISUAL ASSETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Always use object-cover with explicit aspect ratios: aspect-video or aspect-square
- Wrap images in rounded-2xl or rounded-3xl overflow-hidden
- Use group/group-hover for image zoom on card hover:
  <div className="overflow-hidden rounded-2xl group">
    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
  </div>
- Apply a subtle gradient overlay on hero background images:
  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
- Hero visual (Variant A/B): add anim-float class for depth
- NEVER use a Pexels photo that's clearly "people in a generic meeting room" for the HERO —
  use it for interior sections only. Pick the most relevant photo from the provided list.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§14  PRICING SECTION (if applicable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 3-tier cards: Free / Pro / Enterprise (or equivalent)
- Middle card "Most Popular": highlighted border, glow-border class, scale-[1.02]
- Each card: price + billing period + tagline + feature list + CTA button
- Feature list: ✓ / ✗ checkmarks, specific feature names (not generic)
- Monthly / Annual toggle (useState, show savings % on annual)
- Reassurance below cards: "No credit card · Cancel anytime · SOC 2 compliant"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§15  CTA SECTION — BOTTOM OF PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Visually distinct from everything above: use gradient bg, radial glow, or bordered card
- Repeat the core value proposition — do NOT just say "Get started"
- Primary CTA button: large (px-10 py-5 text-lg), shimmer-btn, glow shadow
- 3-4 reassurance micro-copies below button:
  "No credit card required · Setup in 2 minutes · Cancel anytime · SOC 2 Type II"
- Optional: input field for email capture in the CTA section

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§16  FOOTER — COMPLETE, PROFESSIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`tsx
<footer className="border-t border-white/8 bg-[#09090b]">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
    <div className="grid md:grid-cols-5 gap-12 mb-12">
      {/* Brand column — 2 of 5 */}
      <div className="md:col-span-2">
        <div className="flex items-center gap-2 font-bold text-white mb-4">{brandMark}</div>
        <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">{oneSentenceDescription}</p>
        {/* Social icons */}
        <div className="flex gap-4 mt-6 text-zinc-600">
          {["Twitter/X","LinkedIn","GitHub"].map(s => (
            <a key={s} href="#" className="hover:text-white transition-colors text-sm">{s}</a>
          ))}
        </div>
      </div>
      {/* Link columns — 3 of 5 */}
      {[
        { title: "Product", links: ["Features","Pricing","Changelog","Roadmap"] },
        { title: "Company", links: ["About","Blog","Careers","Press"] },
        { title: "Legal",   links: ["Privacy","Terms","Security","Cookies"] },
      ].map(col => (
        <div key={col.title}>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">{col.title}</h4>
          <ul className="space-y-3">
            {col.links.map(l => <li key={l}><a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">{l}</a></li>)}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-white/6 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
      <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
      <span>Made with care · {tagline}</span>
    </div>
  </div>
</footer>
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§17  MICRO-INTERACTIONS — NON-NEGOTIABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every interactive element MUST have a visible hover/active state:
- Buttons: hover:opacity-90 OR hover:scale-105 + active:scale-95
- Cards: hover:-translate-y-1 hover:glow-border transition-all duration-300
- Nav links: hover:text-white transition-colors duration-150
- Images in cards: group + group-hover:scale-105 transition-transform duration-500
- CTA primary: shimmer-btn + glow shadow on hover
- Accordion: smooth open/close (conditional render with anim-fade-in)
- Logo strip: anim-marquee (never static)
- Stats: Counter animated on scroll into view

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
§18  HARD ANTI-PATTERNS — ZERO TOLERANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Lorem ipsum or placeholder text of ANY kind
✗ "Company 1", "Feature A", "John D." — use realistic, specific names
✗ Same hero layout generated twice (must vary per brand)
✗ CTA text: "Get started", "Click here", "Learn more", "Submit"
✗ H1 that is ONLY the brand name: "Welcome to BrandName"
✗ Generic feature names: "Analytics", "Dashboard", "Settings" with no benefit context
✗ "Meeting room with laptops" as the hero image — save for interior sections
✗ Centered body text over 2 lines
✗ Pure #000000 backgrounds — use bg-[#09090b]
✗ Missing hover states on any interactive element
✗ More than 3 font sizes in body text within one section
✗ All sections with identical padding — vary deliberately
✗ Testimonials without full name + title + company
✗ Statistics that are round numbers: "50%", "1000 users" — use "47%", "1,283 users"
✗ Carousel/slider as FIRST visible section
✗ Broken image tags — only use the Pexels URLs provided, always with object-cover
✗ Inline styles for layout (use Tailwind classes)
✗ Forgetting to add pt-16 or pt-20 to the first section after the sticky nav

╔══════════════════════════════════════════════════════╗
║  FINAL CHECK BEFORE RETURNING CODE:                  ║
║  □ <style> tag with all keyframe animations present  ║
║  □ 8+ sections implemented                           ║
║  □ Counter() component defined and used in stats     ║
║  □ Accordion() component defined and used in FAQ     ║
║  □ anim-marquee on logo strip                        ║
║  □ anim-float on hero visual                         ║
║  □ glass-card class on feature/testimonial cards     ║
║  □ shimmer-btn + glow shadow on primary CTA          ║
║  □ All testimonials have name + title + company      ║
║  □ All stats are specific non-round numbers          ║
║  □ Zero generic placeholder text                     ║
╚══════════════════════════════════════════════════════╝
`;
