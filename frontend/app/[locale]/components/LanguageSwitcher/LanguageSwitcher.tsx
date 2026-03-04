// "use client";

// import { useLocale } from "next-intl";
// import { usePathname, useRouter } from "next/navigation";
// import { Select } from "antd";
// import styles from "./styles.module.scss";

// export default function LanguageSwitcher() {
//   const locale = useLocale();
//   const router = useRouter();
//   const pathname = usePathname();

//   const setLang = (nextLocale: string) => {
//     const parts = pathname.split("/").filter(Boolean);

//     if (parts.length === 0) {
//       router.push(`/${nextLocale}`);
//       return;
//     }

//     parts[0] = nextLocale;
//     router.push("/" + parts.join("/"));
//   };

//   return (
//     <Select
//       getPopupContainer={() => document.body}
//       value={locale}
//       onChange={setLang}
//       className={styles.selectionWrapper}
//       popupClassName={styles.langDropdown}
//       defaultValue={"ka"}
//       options={[
//         { value: "ka", label: "🇬🇪 ქართული" },
//         { value: "en", label: "🇬🇧 English" },
//         { value: "ru", label: "🇷🇺 Русский" },
//       ]}
//       size="middle"
//     />
//   );
// }

"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Select } from "antd";
import styles from "./styles.module.scss";

const LOCALES = ["ka", "en", "ru"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const setLang = (nextLocale: string) => {
    const parts = pathname.split("/").filter(Boolean);

    if (isLocale(parts[0])) {
      parts.shift();
    }

    const newPath = "/" + [nextLocale, ...parts].join("/");
    router.push(newPath);
  };

  return (
    <Select
      getPopupContainer={() => document.body}
      value={locale}
      onChange={setLang}
      className={styles.selectionWrapper}
      popupClassName={styles.langDropdown}
      options={[
        { value: "ka", label: "🇬🇪 ქართული" },
        { value: "en", label: "🇬🇧 English" },
        { value: "ru", label: "🇷🇺 Русский" }
      ]}
      size="middle"
    />
  );
}