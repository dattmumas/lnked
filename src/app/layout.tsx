import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import SmoothScroll from "@/components/app/SmoothScroll";
import RouteProgress from "@/components/app/nav/RouteProgress";
import Footer from "@/components/ui/Footer";
import { headers } from "next/headers";


export const metadata: Metadata = {
  title: "Lnked - Collaborative Newsletters",
  description: "Create, share, and subscribe to newsletters together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = headers().get("next-url") || "";
  const isEditorPage =
    pathname.startsWith("/posts/") &&
    (pathname.endsWith("/edit") || pathname === "/posts/new");
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground font-sans antialiased min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SmoothScroll />
          <RouteProgress />
          {!isEditorPage && (
            <header className="bg-background border-b border-border py-4 px-4 md:px-6 sticky top-0 z-50">
              <div className="container mx-auto flex items-center justify-between">
                <span className="text-2xl md:text-3xl font-serif font-extrabold text-foreground tracking-tight flex items-center">
                  Lnked
                  <span
                    className="ml-1 text-primary text-3xl md:text-4xl leading-none self-center"
                    aria-hidden="true"
                  >
                    .
                  </span>
                </span>
                <Navbar />
              </div>
            </header>
          )}
          <main
            className={
              isEditorPage ? "flex-1" : "flex-1 container mx-auto px-4 md:px-6 py-8"
            }
          >
            {children}
          </main>
          {!isEditorPage && <Footer />}
        </ThemeProvider>
      </body>
    </html>
  );
}
