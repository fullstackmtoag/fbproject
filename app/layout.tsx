import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mtoag Insights",
    template: "%s · Mtoag Insights",
  },
  description: "Facebook and Instagram performance dashboard for Mtoag.",
  icons: {
    icon: "/Mtoag_logo.png",
    shortcut: "/Mtoag_logo.png",
    apple: "/Mtoag_logo.png",
  },
};

// Applies the saved theme (or the OS preference) before first paint so there
// is no light->dark flash. Runs synchronously while the HTML is parsed.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
