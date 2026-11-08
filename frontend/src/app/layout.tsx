import "./globals.css";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

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
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-cream text-content-primary font-sans antialiased selection:bg-primary-subtle selection:text-primary">
        {children}
      </body>
    </html>
  );
}
