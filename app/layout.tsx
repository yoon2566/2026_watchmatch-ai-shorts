import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "localhost";
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : host.startsWith("localhost")
      ? "http"
      : "https";
  let metadataBase = new URL("https://watchmatch.invalid");

  try {
    metadataBase = new URL(`${protocol}://${host}`);
  } catch {
    // Keep a valid non-routable fallback if an invalid Host header is supplied.
  }

  return {
    metadataBase,
    title: "WatchMatch | 실제 OTT 작품 추천",
    description:
      "OTT, 영화·TV, 장르를 세 번 누르면 대한민국 구독형 데이터에서 실제 작품 3편을 추천하는 WatchMatch 서비스입니다.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "WatchMatch | 실제 OTT 작품 추천",
      description: "세 번 누르면 Watchmode 대한민국 데이터에서 실제 작품을 추천합니다.",
      type: "website",
      locale: "ko_KR",
      images: [
        {
          url: "/og-watchmatch.png",
          width: 1731,
          height: 909,
          alt: "WatchMatch 3클릭 OTT 작품 추천",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "WatchMatch | 실제 OTT 작품 추천",
      description: "OTT·영화/TV·장르를 고르면 실제 작품 세 편.",
      images: ["/og-watchmatch.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
