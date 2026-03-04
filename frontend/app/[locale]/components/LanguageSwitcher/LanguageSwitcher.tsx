"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Select } from "antd";
import styles from "./styles.module.scss";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const setLang = (nextLocale: string) => {
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      router.push(`/${nextLocale}`);
      return;
    }

    parts[0] = nextLocale;
    router.push("/" + parts.join("/"));
  };

  return (
    <Select
      getPopupContainer={() => document.body}
      value={locale}
      onChange={setLang}
      className={styles.selectionWrapper}
      popupClassName={styles.langDropdown}
      defaultValue={"ka"}
      options={[
        {
          value: "ka",
          label: "🇬🇪 ქართული",
        },
        {
          value: "en",
          label: "🇬🇧 English",
        },
      ]}
      size="middle"
    />
  );
}
