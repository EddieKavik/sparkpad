import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
// import { Notifications } from "@mantine/notifications";
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@mantine/core/styles.css';
// import '@mantine/notifications/styles.css';
import { NavigationBar } from "@/components/NavigationBar";
import { AppHeader } from '@/components/Header';
// import FloatingAssistant from "@/components/FloatingAssistant";
// import { AppHeader } from '@/components/Header';

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata = {
  title: 'SparkPad',
  description: 'Welcome to SparkPad!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        <title>SparkPad</title>
      </head>
      <body
        className={`${inter.variable} antialiased`}
        style={{ background: '#f5f7fa', fontFamily: 'var(--font-inter)', color: '#1a1b1e' }}
      >
        <ThemeProvider>
          <MantineProvider>
            {/* <Notifications /> */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                <AppHeader />
              </div>
              <main style={{ flex: 1, padding: '1rem' }}>
                {children}
              </main>
            </div>
            {/* <FloatingAssistant /> */}
          </MantineProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 