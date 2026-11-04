import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Build a color palette and check text and interface colors against WCAG 2.2. Preview the palette, share the view, and save it to a project.";

export const metadata: Metadata = {
  metadataBase: new URL("https://accessible-palette-amber.vercel.app"),
  title: "Accessible Color Palette Generator & WCAG Contrast Checker",
  description,
  openGraph: {
    title: "Accessible Color Palette Generator & WCAG Contrast Checker",
    description,
    url: "https://accessible-palette-amber.vercel.app",
    siteName: "Accessible Palette Generator",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Accessible Color Palette Generator & WCAG Contrast Checker",
    description,
  },
};

const themeScript = `(function(){try{if(localStorage.getItem("accessible-palette-theme")==="dark"){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
