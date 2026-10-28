import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper Studio • AI Storyboard & Video Reel Creator",
  description:
    "Generate studio-grade 9:16 mobile paper card storyboard reels with physics, typography and voiceover dubbing.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-[#F5F1E8] text-[#111] antialiased selection:bg-[#FFE9DC]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
