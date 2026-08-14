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
    title: "WatchMatch | 25초 무스포 추천 쇼츠",
    description:
      "장르와 분위기를 고르고 작품 3편 추천부터 25초 쇼츠 완성까지 체험하는 WatchMatch 공개 데모입니다.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "WatchMatch | 25초 무스포 추천 쇼츠",
      description: "볼까 말까, 25초면 충분해. AI 무스포 작품 추천 쇼츠 공개 데모.",
      type: "website",
      locale: "ko_KR",
      images: [
        {
          url: "/og-watchmatch.png",
          width: 1731,
          height: 909,
          alt: "WatchMatch AI 무스포 작품 추천 공개 데모",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "WatchMatch | 25초 무스포 추천 쇼츠",
      description: "볼까 말까, 25초면 충분해.",
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
