# TrustPay Design System

## 1. Aesthetic Philosophy
TrustPay uses a calm, tactile, editorial fintech aesthetic inspired by Stripe Climate, Wise, and Notion. It abandons dark mode, neon accents, glowing outlines, and gradient headers in favor of a warm cream canvas, crisp paper-white cards, and deep woodland green primary actions.

---

## 2. Design Tokens

### Color Tokens
| Token | Hex | Tailwind Utility | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas** | `#F6F0E4` | `bg-cream` | Full-page warm cream background |
| **Surface** | `#FFFDF8` | `bg-surface` | Primary card and modal surfaces |
| **Subtle Surface** | `#EFE7D6` | `bg-surface-subtle` | Table headers, inset blocks, code backgrounds |
| **Subtle Border** | `#E3D8C3` | `border-border-subtle` | Card borders, table dividers |
| **Strong Border** | `#CDBFA6` | `border-border-strong` | Active input outlines, focus rings |
| **Primary Base** | `#24493D` | `bg-primary text-primary-foreground` | Main CTAs, active portal tabs |
| **Primary Hover** | `#1B3A30` | `hover:bg-primary-hover` | Button hover and pressed states |
| **Primary Subtle** | `#E4ECE8` | `bg-primary-subtle` | Selection highlights, soft focus badges |
| **Accent Base** | `#B5603D` | `text-accent bg-accent-subtle` | Terracotta highlights, escrow alerts |
| **Text Primary** | `#2A2118` | `text-content-primary` | High-contrast headings and body text |
| **Text Secondary**| `#6F6150` | `text-content-secondary` | Labels, table cells, descriptions |
| **Text Muted** | `#9A8B77` | `text-content-muted` | Placeholders, timestamps, helper text |

### Semantic State Tints
- **Success**: `#2E7D4F` text / `#E3F1E7` background / `#C2E2CB` border
- **Warning**: `#B7791F` text / `#FBEFD5` background / `#F5DC9E` border
- **Danger**: `#B3402E` text / `#F8E1DC` background / `#F0BDB3` border
- **Info**: `#2F5F8A` text / `#E1ECF5` background / `#BCD5EA` border

### Typography
- **Headings & Large Numbers**: `font-serif` (Fraunces) — warm, editorial, trustworthy.
- **UI & Prose**: `font-sans` (Inter) — highly legible across all device sizes.
- **IDs & Code**: `font-mono` (JetBrains Mono) — reserved strictly for PayPal IDs and sandbox logs.

### Metrics & Spacing
- **Corner Radii**: Cards (`12px` / `rounded-card`), Buttons/Inputs (`8px` / `rounded-btn`).
- **Shadows**:
  - `shadow-soft`: `0 1px 2px rgba(42,33,24,.06), 0 4px 16px rgba(42,33,24,.05)`
  - `shadow-elevated`: `0 4px 6px rgba(42,33,24,.05), 0 12px 28px rgba(42,33,24,.08)`
- **Content Max Width**: `1120px` (`max-w-content`).
- **Base Grid**: 8px (`8px`, `16px`, `24px`, `32px`, `48px`).

---

## 3. UI Component Inventory (`components/ui/`)
- `Button`: Solid primary (`#24493D`), outline secondary, ghost, loading states.
- `Input`, `Textarea`, `Select`: Cream-card inputs with accessible borders and error slots.
- `Card`, `StatCard`: 12px rounded cards with soft shadows and editorial metric numbers.
- `StatusChip`: Semantic badges representing all milestone and contract states.
- `DataTable`: Accessible tabular display for jobs, payments, and deliverables.
- `Stepper` / `Timeline`: Vertical milestone progress indicator.
- `ChatBubble`: AI negotiation dialogue bubble with proposal pricing tag.
- `ScoreRing`: Circular percentage display for AI Judge evaluations.
- `CriterionCard`: Granular acceptance criteria verification breakdown.
- `CodeBlock`: Collapsible monospace block for test logs and code.
- `FileDropzone`: Accessible drag-and-drop file uploader.
- `Modal`: Accessible backdrop dialog for disputes and reviews.
- `Toast`: Non-intrusive notification banner.
- `EmptyState`: Helpful illustration with explanatory copy and CTA.
- `Skeleton`: Shimmer placeholder for cream surfaces.
- `CopyableId`: Monospace transaction ID with one-click copy button.
- `PageHeader`: Breadcrumbs, title, subtitle, and primary action slot.
- `NextStepCard`: "What happens next?" explanatory card for non-technical users.

