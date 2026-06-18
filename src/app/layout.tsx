import type { Metadata } from 'next';
import type React from 'react';
import './globals.css';

import { ThemeProvider } from 'next-themes';

export const metadata: Metadata = {
  title: 'Kanban Board',
  description: 'Kanban board app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
