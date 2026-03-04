// import { getRequestConfig } from "next-intl/server";

// const SUPPORTED = ["en", "ka"] as const;
// type Locale = (typeof SUPPORTED)[number];

// export default getRequestConfig(async ({ locale }) => {
//   const safeLocale: Locale = SUPPORTED.includes(locale as Locale) ? (locale as Locale) : "en";

//   return {
//     locale: safeLocale,
//     messages: (await import(`../messages/${safeLocale}.json`)).default,
//   };
// });


import { getRequestConfig } from "next-intl/server";

const SUPPORTED = ["en", "ka"] as const;
type Locale = (typeof SUPPORTED)[number];

export default getRequestConfig(async ({ locale }) => {
  const safeLocale: Locale = SUPPORTED.includes(locale as Locale) ? (locale as Locale) : "en";

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  };
});