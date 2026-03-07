// // "use client";

// // import { useLocale } from "next-intl";
// // import { usePathname, useRouter } from "next/navigation";
// // import { Select } from "antd";
// // import styles from "./styles.module.scss";

// // export default function LanguageSwitcher() {
// //   const locale = useLocale();
// //   const router = useRouter();
// //   const pathname = usePathname();

// //   const setLang = (nextLocale: string) => {
// //     const parts = pathname.split("/").filter(Boolean);

// //     if (parts.length === 0) {
// //       router.push(`/${nextLocale}`);
// //       return;
// //     }

// //     parts[0] = nextLocale;
// //     router.push("/" + parts.join("/"));
// //   };

// //   return (
// //     <Select
// //       getPopupContainer={() => document.body}
// //       value={locale}
// //       onChange={setLang}
// //       className={styles.selectionWrapper}
// //       popupClassName={styles.langDropdown}
// //       defaultValue={"ka"}
// //       options={[
// //         { value: "ka", label: "🇬🇪 ქართული" },
// //         { value: "en", label: "🇬🇧 English" },
// //         { value: "ru", label: "🇷🇺 Русский" },
// //       ]}
// //       size="middle"
// //     />
// //   );
// // }

// "use client";

// import { useLocale } from "next-intl";
// import { usePathname, useRouter } from "next/navigation";
// import { Select } from "antd";
// import styles from "./styles.module.scss";

// const LOCALES = ["ka", "en", "ru"] as const;
// type Locale = (typeof LOCALES)[number];

// function isLocale(value: string | undefined): value is Locale {
//   return LOCALES.includes(value as Locale);
// }

// export default function LanguageSwitcher() {
//   const locale = useLocale();
//   const router = useRouter();
//   const pathname = usePathname();

//   const setLang = (nextLocale: string) => {
//     const parts = pathname.split("/").filter(Boolean);

//     if (isLocale(parts[0])) {
//       parts.shift();
//     }

//     const newPath = "/" + [nextLocale, ...parts].join("/");
//     router.push(newPath);
//   };

//   return (
//     <Select
//       getPopupContainer={() => document.body}
//       value={locale}
//       onChange={setLang}
//       className={styles.selectionWrapper}
//       popupClassName={styles.langDropdown}
//       options={[
//         { value: "ka", label: "🇬🇪 ქართული" },
//         { value: "en", label: "🇬🇧 English" },
//         { value: "ru", label: "🇷🇺 Русский" }
//       ]}
//       size="middle"
//     />
//   );
// }



"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { DownOutlined } from "@ant-design/icons";
import styles from "./styles.module.scss";

const SUPPORTED = ["ka", "en", "ru"] as const;
type Locale = (typeof SUPPORTED)[number];

function isLocale(value: string | undefined): value is Locale {
  return !!value && SUPPORTED.includes(value as Locale);
}

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "ka", label: "🇬🇪 ქართული" },
  { value: "en", label: "🇬🇧 English" },
  { value: "ru", label: "🇷🇺 Русский" },
];

export default function LanguageSwitcher() {
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
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      router.push(`/${nextLocale}`);
      return;
    }

    if (isLocale(parts[0])) {
      parts[0] = nextLocale;
      router.push(`/${parts.join("/")}`);
      return;
    }

    router.push(`/${nextLocale}/${parts.join("/")}`);
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