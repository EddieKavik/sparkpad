import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sparkpad",
  description: "A modern workspace for collaborative innovation and project management",
  keywords: ["project management", "collaboration", "workspace", "innovation"],
  authors: [{ name: "SparkPad Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#181c2b" },
  ],
}; 