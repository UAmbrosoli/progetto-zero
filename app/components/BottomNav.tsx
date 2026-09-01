"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName =
  | "home"
  | "play"
  | "ranking"
  | "stats"
  | "trophy";

const items: {
  href: string;
  label: string;
  icon: IconName;
}[] = [
  {
    href: "/",
    label: "Home",
    icon: "home",
  },
  {
    href: "/nuova-giornata",
    label: "Gioca",
    icon: "play",
  },
  {
    href: "/classifica",
    label: "Classifica",
    icon: "ranking",
  },
  {
    href: "/storico",
    label: "Statistiche",
    icon: "stats",
  },
  {
    href: "/trofei",
    label: "Trofei",
    icon: "trophy",
  },
];

function Icon({
  name,
}: {
  name: IconName;
}) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );

    case "play":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m10 8.5 5 3.5-5 3.5z" />
        </svg>
      );

    case "ranking":
      return (
        <svg {...common}>
          <path d="M6 20V10" />
          <path d="M12 20V5" />
          <path d="M18 20v-8" />
          <path d="M4 20h16" />
        </svg>
      );

    case "stats":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 3-4 3 2 4-6" />
          <path d="M16 7h1v1" />
        </svg>
      );

    case "trophy":
      return (
        <svg {...common}>
          <path d="M8 4h8v3a4 4 0 0 1-8 0z" />
          <path d="M10 15h4" />
          <path d="M12 11v4" />
          <path d="M8 6H5a3 3 0 0 0 3 3" />
          <path d="M16 6h3a3 3 0 0 1-3 3" />
          <path d="M9 20h6" />
          <path d="M10 18h4" />
        </svg>
      );
  }
}

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav
      aria-label="Navigazione principale"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        padding:
          "6px 8px calc(6px + env(safe-area-inset-bottom))",
        background: "rgba(255, 255, 255, 0.97)",
        borderTop: "1px solid #e6e6e6",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                active ? "page" : undefined
              }
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 54,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "4px 2px",
                borderRadius: 12,
                textDecoration: "none",
                color: active
                  ? "inherit"
                  : "#8a8a8a",
                fontSize: 10.5,
                fontWeight: active ? 700 : 500,
                lineHeight: 1.1,
                WebkitTapHighlightColor:
                  "transparent",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 24,
                }}
              >
                <Icon name={item.icon} />
              </span>

              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}