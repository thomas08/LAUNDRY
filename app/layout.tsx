import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "LinenFlow™ - Management Dashboard",
  description: "Professional laundry management system",
  generator: "v0.app",
}

type Props = {
  children: React.ReactNode;
};

export default function RootLayout({
  children
}: Props) {
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}