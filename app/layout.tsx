import type { Metadata } from "next";
import { Gowun_Dodum } from "next/font/google";
import "./globals.css";

// 🔤 5·6주차와 같은 글꼴
const 고운돋움 = Gowun_Dodum({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-고운돋움",
  display: "swap",
});

export const metadata: Metadata = {
  title: "번역 리서치 에이전트",
  description: "용어집에 없는 표현을 스스로 조사하고 지역까지 확인하는 AI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${고운돋움.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
