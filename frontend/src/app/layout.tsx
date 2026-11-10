import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import { StoreProvider } from "@/store/provider";
import { storeName } from "@/lib/site";
import "./globals.css";
import "./animations.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: `${storeName} | Everyday clothing`,
    template: `%s | ${storeName}`,
  },
  description: "Explore a considered collection of everyday clothing. Discover shirts, tees, denim and more, with prices in BDT.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="html-motion" data-scroll-behavior="smooth">
      {/* Browser extensions (e.g. Grammarly) inject attributes on <body> before hydration. */}
      <body className={`${sans.variable} ${display.variable} min-h-screen bg-[linear-gradient(135deg,#f8f9f6_0%,#f0f4ef_54%,#f7f7f3_100%)] bg-fixed font-body text-sm leading-[1.55] text-foreground tracking-normal`} suppressHydrationWarning>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
