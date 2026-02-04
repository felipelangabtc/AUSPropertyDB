import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Header, Footer } from '../src/components';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'AUS Property Intelligence - Find Your Perfect Property',
  description: 'Search Australian properties with smart alerts and insights powered by AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased w-full`}>
        <div className="flex flex-col min-h-screen w-full">
          <Header />
          <main className="flex-grow w-full">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
