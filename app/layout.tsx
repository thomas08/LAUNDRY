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
    // `dark` must live on <html>, not on a div inside <body>: `body` itself is
    // styled `bg-background text-foreground`, and Radix/sonner portals mount
    // straight onto document.body. With the class any lower, both resolved the
    // light palette — which is why outline buttons rendered black-on-black and
    // dialogs came out light against a dark app.
    <html className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}