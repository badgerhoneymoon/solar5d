import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PalmPauseDebugOverlay from '../components/PalmPauseDebugOverlay';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Solar5D – 3D Solar System Powered by AI & Computer Vision",
  description: "Explore a real-time 3D solar system, interact with AI voice and hand gestures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <PalmPauseDebugOverlay />
      </body>
    </html>
  );
}
