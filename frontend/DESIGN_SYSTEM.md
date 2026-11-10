# TrustPay "Liquid Glass" Design System (iOS 26 Inspired)

## 1. Design Language Overview
TrustPay's interface is built on **Liquid Glass**: translucent, softly blurred, light-bending surfaces floating over a rich, calmly animated background. Glass is reserved for floating and navigation surfaces (headers, stat cards, modals, popovers, tabs, toasts), while dense reading areas and data tables remain solid for maximum contrast and legibility (WCAG AA compliant).

### Glass Recipe (`globals.css`)
- **Fill**: Light theme `rgba(255, 255, 255, 0.55)` / Dark theme `rgba(28, 32, 44, 0.45)`
- **Backdrop Filter**: `blur(22px) saturate(180%)` (Strong variant: `blur(34px) saturate(200%)`)
- **Border**: 1px gradient highlight (Light: white/70 top edge to white/20; Dark: white/18 to white/05)
- **Inner Highlight**: `inset 0 1px 0 rgba(255, 255, 255, 0.60)`
- **Outer Shadow**: Soft layered shadow `0 8px 32px rgba(15, 23, 42, 0.10)` / Dark: `rgba(0,0,0,0.45)`
- **Specular Sheen**: Diagonal gradient sheen on hover (`.glass::before`)
- **Fallbacks**: Solid surfaces when `backdrop-filter` is unsupported or `prefers-reduced-transparency` is active.

### Background Aurora
A fixed mesh background composed of four large blurred color blobs drifting in 45–60s loops:
- **Light Theme**: Sky Blue `#BFD9FF`, Mint `#BFEBDD`, Lavender `#D9D0FF`, Warm Peach `#FFE2C7` at 55–70% opacity.
- **Dark Theme**: Deep Indigo `#2A3A8F`, Teal `#0F6E69`, Violet `#5B3FA6` at 30–45% opacity.

---

## 2. Design Tokens
Theme switching is managed via `[data-theme="dark"]` with no flash on load.

| Token | Light Theme | Dark Theme |
|---|---|---|
| `--bg-canvas` | `#F4F7FB` | `#0A0F1C` |
| `--bg-surface` | `#FFFFFF` | `#111827` |
| `--bg-subtle` | `#F1F5FA` | `#0F1F3A` |
| `--text-primary` | `#0F172A` | `#F1F5F9` |
| `--text-secondary` | `#475569` | `#CBD5E1` |
| `--text-muted` | `#64748B` | `#94A3B8` |
| `--accent-blue` | `#2563EB` | `#6EA8FF` |
| `--accent-emerald` | `#0E9F6E` | `#34D399` |
| `--accent-gold` | `#B7791F` | `#F4C25B` |
| `--accent-danger` | `#D14343` | `#FF7A7A` |

### Typography
- **UI & Body**: `Inter` (16px default, 1.5 line height, minimum 14px)
- **Display & Headings**: `Fraunces` serif
- **Technical & Codes**: `JetBrains Mono`

---

## 3. Plain Language Glossary
All technical jargon is translated to transparent, plain language throughout the user interface:

| Technical / Internal Term | User-Facing Plain Language |
|---|---|
| `escrow` | **safe hold** / **money held safely by PayPal** |
| `authorization` / `authorize` | **money held safely** |
| `capture` / `captured` | **payment released** |
| `milestone` | **payment stage** |
| `acceptance criteria` | **what must be delivered** |
| `Judge verdict` | **work check result** |
| `AI Judge` | **automated work checker** |
| `PayPal authorization ID` / `Capture ID` | Hidden under collapsible **Technical Details** |

---

## 4. Role-Aware Status & Guidance
Status chips and "What to do now" cards provide distinct, tailored perspectives:

| Lifecycle State | Client View | Freelancer View |
|---|---|---|
| `negotiating` | **Autonomous Negotiation Active** | **Terms Under Negotiation** |
| `awaiting_approval` | **Needs Your Decision** | **Agreement Reached · Pending Client** |
| `approved` | **Approved · Ready to Hold Funds** | **Approved · Awaiting Safe Hold** |
| `funded` | **Money Held Safely · In Progress** | **Money Secured · Work in Progress** |
| `in_progress` | **Work Underway** | **Active Delivery** |
| `under_review` | **Work Being Checked by AI** | **Under Automated Verification** |
| `verified` / `pass` | **Work Passed · Payment Releasing** | **Verified Passed · Payout Queued** |
| `paid` / `completed` | **Payment Released & Completed** | **Payment Released to You** |
| `disputed` | **Under Arbitration** | **In Dispute Review** |
| `refunded` | **Funds Returned** | **Refund Issued** |

---

## 5. Component Library
1. `GlassCard` (`src/components/glass/GlassCard.tsx`): Variants subtle/default/strong, hover lift and specular sheen.
2. `GlassNav` (`src/components/glass/GlassNav.tsx`): Sticky header, blur, active pill indicator, responsive mobile drawer.
3. `GlassButton` (`src/components/glass/GlassButton.tsx`): Primary, glass, secondary, ghost, and danger variants.
4. `ThemeToggle` (`src/components/glass/GlassNav.tsx`): Smooth animated Sun/Moon toggle using `next-themes`.
5. `AuroraBackground` (`src/components/glass/AuroraBackground.tsx`): Hardware-accelerated CSS animated blobs.
6. `WhatToDoNow` (`src/components/glass/WhatToDoNow.tsx`): Top-level guided action card driven by role and state.
7. `ProgressTracker` (`src/components/glass/ProgressTracker.tsx`): 7-step guided visual roadmap.
8. `HowItWorksDrawer` (`src/components/glass/HowItWorksDrawer.tsx`): Slide-over educational guide with 4 plain-language pillars.
9. `InfoPopover` (`src/components/glass/InfoPopover.tsx`): Floating help popovers for context.
10. `StatusChip` (`src/components/ui/StatusChip.tsx`): 100% Lucide icons, role-aware labels, zero emojis.
