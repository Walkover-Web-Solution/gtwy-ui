import "./globals.css";
import "../styles/performance-optimizations.css";
import Wrapper from "@/wrapper/Wrapper";
import { GoogleTagManager } from "@next/third-parties/google";
import { DM_Sans } from "next/font/google";
import NetworkStatus from "@/components/NetworkStatus";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "GTWY AI | Connect 5000+ apps in just 1 click",
  description: "Simplified AI & chatbot integration",
  category: "technology",
  generator: "GTWY AI",
  keywords:
    "gtwy ai, ai middleware, ai integration platform, ai chatbot service, openai integration, anthropic api, groq ai, o1 ai, ai automation tools, ai api gateway, large language model integration, llm api, ai software solutions, ai-powered chatbot, ai model deployment, machine learning api, enterprise ai solutions, ai infrastructure, artificial intelligence services, custom ai development, ai orchestration, ai cloud services, multi-ai platform, ai business solutions, ai developer tools, ai framework, gpt integration, ai tools for business, llm deployment, ai model hosting, ai tech stack, ai-powered applications, smart ai assistant, best ai middleware, chatbot development platform, ai-powered automation",
  alternates: {
    canonical: "https://gtwy.ai",
  },
};

export const runtime = "edge";

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <GoogleTagManager gtmId="GTM-PXRN8T45" />
      <body suppressHydrationWarning className={dmSans.className}>
        <Wrapper>{children}</Wrapper>
        <NetworkStatus />
      </body>
    </html>
  );
}
