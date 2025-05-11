import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { Inter } from 'next/font/google';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <MantineProvider>
              <Notifications />
              {children}
            </MantineProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
