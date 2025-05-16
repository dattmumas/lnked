import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import SmoothScroll from "@/components/app/SmoothScroll";
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Lnked - Collaborative Newsletters",
  description: "Create, share, and subscribe to newsletters together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-[#F7F7F7] text-[#1F1F1F] font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SmoothScroll />
          <header className="bg-[#1F1F1F] border-b-2 border-[#E50914] px-4 h-20 flex items-center justify-between sticky top-0 z-50">
            <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center h-full">
              Lnked
              <span
                className="ml-1 text-[#E50914] text-3xl md:text-4xl leading-none self-center"
                style={{ fontWeight: 900 }}
              >
                .
              </span>
            </span>
            <div className="flex-1 flex justify-end items-center h-full">
              <Navbar />
            </div>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
