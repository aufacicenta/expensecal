import "@/styles/globals.css";
import { StackProvider, StackTheme } from "@stackframe/stack";
import clsx from "clsx";
import { Metadata, Viewport } from "next";

import { BaseProviders } from "./BaseProviders";

import { fontSans } from "@/config/fonts";
import { siteConfig } from "@/config/site";
import { stackClientApp } from "@/stack/client";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "text-foreground bg-background min-h-screen font-sans antialiased",
          fontSans.variable,
        )}
      >
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <BaseProviders
              themeProps={{ attribute: "class", defaultTheme: "dark" }}
            >
              <div className="relative flex h-screen flex-col">
                <main className="relative mx-auto w-screen flex-grow">
                  {children}
                </main>
              </div>
            </BaseProviders>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
