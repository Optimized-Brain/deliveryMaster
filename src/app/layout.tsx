import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google'; // Using Inter as a clean, modern font
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: 'SwiftRoute App', // Updated title
  description: 'Efficient Delivery Management Platform', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        {children}
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}
