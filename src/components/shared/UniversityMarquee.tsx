"use client";

import { useState } from "react";
import Image from "next/image";

type LogoTheme = "dark" | "light";

const UNIVERSITIES: { name: string; file: string; short: string; color: string; theme: LogoTheme }[] = [
  { name: "東京大学", file: "u-tokyo.ac.jp.svg", short: "東大", color: "#003F8E", theme: "dark" },
  { name: "京都大学", file: "kyoto-u.ac.jp.svg", short: "京大", color: "#00205B", theme: "dark" },
  { name: "北海道大学", file: "hokudai.ac.jp.png", short: "北大", color: "#006633", theme: "dark" },
  { name: "東北大学", file: "tohoku.ac.jp.svg", short: "東北", color: "#1B1464", theme: "dark" },
  { name: "名古屋大学", file: "nagoya-u.ac.jp.svg", short: "名大", color: "#006B3F", theme: "dark" },
  { name: "大阪大学", file: "osaka-u.ac.jp.svg", short: "阪大", color: "#003366", theme: "light" },
  { name: "九州大学", file: "kyushu-u.ac.jp.png", short: "九大", color: "#6E1E3A", theme: "dark" },
  { name: "早稲田大学", file: "waseda.jp.svg", short: "早稲", color: "#8C1515", theme: "dark" },
  { name: "慶應義塾大学", file: "keio.ac.jp.png", short: "慶應", color: "#00338D", theme: "dark" },
  { name: "上智大学", file: "sophia.ac.jp.svg", short: "上智", color: "#6E1E3A", theme: "dark" },
  { name: "明治大学", file: "meiji.ac.jp.png", short: "明治", color: "#5C068C", theme: "dark" },
  { name: "青山学院大学", file: "aoyama.ac.jp.svg", short: "青学", color: "#003F72", theme: "dark" },
  { name: "立教大学", file: "rikkyo.ac.jp.png", short: "立教", color: "#5C2D91", theme: "dark" },
  { name: "中央大学", file: "chuo-u.ac.jp.svg", short: "中央", color: "#C41E3A", theme: "dark" },
  { name: "法政大学", file: "hosei.ac.jp.png", short: "法政", color: "#E95504", theme: "dark" },
  { name: "関西大学", file: "kansai-u.ac.jp.svg", short: "関大", color: "#6E1E3A", theme: "dark" },
  { name: "関西学院大学", file: "kwansei.ac.jp.svg", short: "関学", color: "#003366", theme: "dark" },
  { name: "同志社大学", file: "doshisha.ac.jp.svg", short: "同大", color: "#5C2D91", theme: "dark" },
  { name: "立命館大学", file: "ritsumei.ac.jp.png", short: "立命", color: "#8E0028", theme: "dark" },
  { name: "京都産業大学", file: "kyoto-su.ac.jp.svg", short: "京産", color: "#C41E3A", theme: "dark" },
  { name: "近畿大学", file: "kindai.ac.jp.svg", short: "近大", color: "#003F8E", theme: "dark" },
  { name: "甲南大学", file: "konan-u.ac.jp.png", short: "甲南", color: "#006B3F", theme: "dark" },
  { name: "龍谷大学", file: "ryukoku.ac.jp.svg", short: "龍谷", color: "#5C2D91", theme: "dark" },
];

function UniversityItem({ name, file, short, color, theme }: { name: string; file: string; short: string; color: string; theme: LogoTheme }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center px-3 lg:px-5 shrink-0 select-none" title={name}>
      {imgError ? (
        <div
          className="flex items-center justify-center h-9 w-9 lg:h-12 lg:w-12 rounded-lg lg:rounded-xl text-white text-xs lg:text-sm font-bold shrink-0"
          style={{ backgroundColor: color }}
        >
          {short.slice(0, 2)}
        </div>
      ) : (
        <Image
          src={`/universities/${file}`}
          alt={name}
          width={120}
          height={56}
          className={`h-10 lg:h-14 w-auto shrink-0 object-contain transition-opacity ${
            theme === "dark"
              ? "brightness-0 invert opacity-50 hover:opacity-80"
              : "opacity-60 hover:opacity-90"
          }`}
          onError={() => setImgError(true)}
          unoptimized
        />
      )}
    </div>
  );
}

export default function UniversityMarquee() {
  const items = [...UNIVERSITIES, ...UNIVERSITIES];

  return (
    <div className="w-full overflow-hidden py-2">
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[oklch(0.15_0.02_260)] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[oklch(0.15_0.02_260)] to-transparent z-10 pointer-events-none" />
        <div className="flex animate-marquee">
          {items.map((u, i) => (
            <UniversityItem key={`${u.file}-${i}`} {...u} />
          ))}
        </div>
      </div>
    </div>
  );
}
