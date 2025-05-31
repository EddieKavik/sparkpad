import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";
import FloatingAssistant from '@/components/FloatingAssistant';
import SparkAgent from '@/components/SparkAgent';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Sparkpad</title>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: '#f5f7fa', fontFamily: 'Inter, Roboto, Arial, sans-serif', color: '#1a1b1e' }}
      >
        <ThemeProvider>
          <MantineProvider>
            <Notifications />
            <NavigationBar />
            {children}
            <FloatingAssistant />
            <SparkAgent />
          </MantineProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
