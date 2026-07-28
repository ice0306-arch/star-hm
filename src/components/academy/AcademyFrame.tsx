"use client";

import { useState } from "react";
import type { ReactNode } from "react";

const BRAND_EMBLEM_SRC = "/brand/hm-emblem.png";

const academyNav = [
  { label: "HOME", href: "/" },
  { label: "대학티어", href: "/university-tiers" },
  { label: "FA현황", href: "/free-agents" },
  { label: "ROOKIE", href: "/academy/rookie" },
  { label: "PLAYBOOK", href: "/academy/playbook" },
];

export function AcademyFrame({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <main className="site-shell academy-shell min-h-screen overflow-hidden text-silver">
      <header className="academy-header fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-carbon/82 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="HM 아카데미 내비게이션">
          <a className="flex items-center gap-3 text-white" href="/" onClick={() => setIsMenuOpen(false)}>
            <img className="h-12 w-12 object-contain" src={BRAND_EMBLEM_SRC} alt="THE HM emblem" width={48} height={48} />
            <span className="text-sm font-black uppercase tracking-[0.24em]">THE HM</span>
          </a>

          <button
            className="menu-button md:hidden"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="academy-mobile-menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="sr-only">아카데미 메뉴 열기</span>
            <span />
            <span />
            <span />
          </button>

          <div className="hidden items-center gap-7 md:flex">
            {academyNav.map((item) => (
              <a key={item.href} className="nav-link" href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div id="academy-mobile-menu" className={isMenuOpen ? "mobile-menu is-open" : "mobile-menu"} aria-hidden={!isMenuOpen}>
          {academyNav.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <div className="academy-mobile-subnav">
            <a href="/academy/rookie" onClick={() => setIsMenuOpen(false)}>
              입문 훈련
            </a>
            <a href="/academy/playbook" onClick={() => setIsMenuOpen(false)}>
              실전 플레이북
            </a>
          </div>
        </div>
      </header>

      {children}

      <footer className="academy-footer border-t border-white/10 px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-steel sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-black uppercase tracking-[0.2em] text-white">STAR HM ACADEMY</div>
            <p className="mt-2">입문 훈련과 실전 플레이북을 THE HM 지휘 센터 안에서 연결합니다.</p>
          </div>
          <a className="replay-button" href="/">
            Back to THE HM
          </a>
        </div>
      </footer>
    </main>
  );
}
