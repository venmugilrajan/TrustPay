import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "TrustPay — Autonomous AI Escrow & Milestone Verification",
  description: "AI-negotiated freelance contracts secured with PayPal payment authorizations and automated AI milestone judging.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </body>
    </html>
  );
}

