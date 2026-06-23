import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk, Noto_Nastaliq_Urdu } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { MotionProvider } from "@/components/motion-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const urdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Manzil One — منزل ون | Premium revenue platform",
  description:
    "Manzil One — لیڈ سے کامیابی کی منزل تک. A premium CRM for consulting, staffing and licensing: leads, opportunities, RFQ, quotation and approvals in one elegant workspace.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${urdu.variable}`}>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SessionProvider>
            <TooltipProvider delayDuration={120}>
              <MotionProvider>{children}</MotionProvider>
            </TooltipProvider>
          </SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
