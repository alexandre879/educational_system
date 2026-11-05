"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { DownOutlined } from "@ant-design/icons";
import defaultStyles from "./styles.module.scss";
import sidebarStyles from "./sidebar.module.scss";

const SUPPORTED = ["ka", "en", "ru"] as const;
type Locale = (typeof SUPPORTED)[number];

function isLocale(value: string | undefined): value is Locale {
  return !!value && SUPPORTED.includes(value as Locale);
}

export const LANGUAGE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "ka", label: "🇬🇪 ქართული" },
  { value: "en", label: "🇬🇧 English" },
  { value: "ru", label: "🇷🇺 Русский" },
];
const OPTIONS = LANGUAGE_OPTIONS;

/** The same page in another language. */
export function pathForLocale(pathname: string, nextLocale: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return `/${nextLocale}`;
  if (isLocale(parts[0])) {
    parts[0] = nextLocale;
    return `/${parts.join("/")}`;
  }
  return `/${nextLocale}/${parts.join("/")}`;
}

export default function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const styles = variant === "sidebar" ? sidebarStyles : defaultStyles;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const currentOption = useMemo(() => {
    return OPTIONS.find((item) => item.value === locale) ?? OPTIONS[0];
  }, [locale]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const setLang = (nextLocale: Locale) => {
    router.push(pathForLocale(pathname, nextLocale));
  };

  const handleSelect = (nextLocale: Locale) => {
    setOpen(false);
    if (nextLocale !== locale) {
      setLang(nextLocale);
    }
  };

  return (
    <div className={styles.languageSelect} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.triggerText}>{currentOption.label}</span>
        <DownOutlined className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`} />
      </button>

      {open && (
        <div className={styles.dropdown} role="listbox">
          {OPTIONS.map((option) => {
            const active = option.value === locale;

            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${active ? styles.optionActive : ""}`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}