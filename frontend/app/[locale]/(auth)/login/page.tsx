// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import styles from "./login.module.scss";
// import axios from "axios";
// import { usePathname, useRouter } from "next/navigation";
// import Cookies from "cookies-js";
// import { useTranslations } from "next-intl";
// import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";

// const REMEMBER_EMAIL_KEY = "rememberedEmail";

// const Login = () => {
//   const t = useTranslations("Login");

//   const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/back/api";

//   const [step, setStep] = useState<"email" | "otp">("email");
//   const [email, setEmail] = useState("");
//   const [rememberMe, setRememberMe] = useState(false);

//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   const router = useRouter();
//   const pathname = usePathname();

//   const locale = useMemo(() => {
//     const seg = (pathname ?? "").split("/")[1];
//     return seg || "en";
//   }, [pathname]);

//   useEffect(() => {
//     try {
//       const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
//       if (savedEmail) {
//         setEmail(savedEmail);
//         setRememberMe(true);
//       }
//     } catch {
//       // ignore
//     }
//   }, []);

//   const onEmailFinish = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     try {
//       setError(null);
//       setSuccess(null);

//       try {
//         if (rememberMe) {
//           window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
//         } 
//         else {
//           window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
//         }
//       } 
//       catch {
//         // ignore
//       }

//       await axios.post(`${API_BASE_URL}/otp/request/`, {
//         email: email.trim(),
//       });

//       setSuccess(t("otpSent"));
//       setStep("otp");
//     } 
//     catch (err) {
//       setError(t("sendOtpFailed"));
//       console.error(err);
//     }
//   };

//   const onOtpFinish = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     const formData = new FormData(e.currentTarget);
//     const otp = String(formData.get("otp") ?? "");

//     try {
//       setError(null);
//       setSuccess(null);

//       const res = await axios.post(`${API_BASE_URL}/otp/verify/`, {
//         email: email.trim(),
//         otp: otp.trim(),
//       });

//       setSuccess(t("loginSuccess"));
//       Cookies.set("access", res.data.access);
//       Cookies.set("refresh", res.data.refresh);

//       router.push(`/${locale}/home`);
//     } 
//     catch (err) {
//       setError(t("invalidOtp"));
//       console.error(err);
//     }
//   };

//   return (
//     <div className={styles.loginPageMainContainer}>
//       <div className={styles.loginCard}>
//         <div className={styles.welcomeWrapper}>
//           <h2 className={styles.title}>{t("title")}</h2>
//           <p className={styles.subtitle}>{t("subtitle")}</p>
//         </div>

//         {error && <div className={styles.errorMessage}>{error}</div>}
//         {success && <div className={styles.successMessage}>{success}</div>}

//         {step === "email" && (
//           <form className={styles.form} onSubmit={onEmailFinish}>
//             <label className={styles.label} htmlFor="username">
//               {t("emailLabel")}
//             </label>

//             <input
//               id="username"
//               name="username"
//               type="email"
//               className={styles.input}
//               placeholder={t("emailPlaceholder")}
//               required
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//             />

//             <div className={styles.checkboxWrapper}>
//               <input
//                 type="checkbox"
//                 id="remember"
//                 name="remember"
//                 checked={rememberMe}
//                 onChange={(e) => setRememberMe(e.target.checked)}
//               />
//               <label htmlFor="remember">{t("rememberMe")}</label>
//             </div>

//             <button type="submit" className={styles.submitButton}>
//               {t("sendOtp")}
//             </button>
//             <LanguageSwitcher />
//           </form>
//         )}

//         {step === "otp" && (
//           <form className={styles.form} onSubmit={onOtpFinish}>
//             <label className={styles.label} htmlFor="otp">
//               {t("otpLabel")}
//             </label>
//             <input
//               id="otp"
//               name="otp"
//               type="text"
//               className={styles.input}
//               placeholder={t("otpPlaceholder")}
//               required
//               inputMode="numeric"
//               autoComplete="one-time-code"
//             />

//             <button type="submit" className={styles.submitButton}>
//               {t("verifyOtp")}
//             </button>

//             <button
//               type="button"
//               className={styles.backButton}
//               onClick={() => setStep("email")}
//             >
//               {t("backToEmail")}
//             </button>
//           </form>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Login;






"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./login.module.scss";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "cookies-js";
import { useTranslations } from "next-intl";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";

const REMEMBER_EMAIL_KEY = "rememberedEmail";
const THEME_KEY = "theme";

const Login = () => {
  const t = useTranslations("Login");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/back/api";

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const locale = useMemo(() => {
    const seg = (pathname ?? "").split("/")[1];
    return seg || "en";
  }, [pathname]);

  useEffect(() => {
    try {
      const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }

      const savedTheme =
        (window.localStorage.getItem(THEME_KEY) as "dark" | "light" | null) || "dark";

      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } catch {
      // ignore
    }
  }, []);

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // ignore
    }

    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const onEmailFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setError(null);
      setSuccess(null);

      try {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        // ignore
      }

      await axios.post(`${API_BASE_URL}/otp/request/`, {
        email: email.trim(),
      });

      setSuccess(t("otpSent"));
      setStep("otp");
    } catch (err) {
      setError(t("sendOtpFailed"));
      console.error(err);
    }
  };

  const onOtpFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const otp = String(formData.get("otp") ?? "");

    try {
      setError(null);
      setSuccess(null);

      const res = await axios.post(`${API_BASE_URL}/otp/verify/`, {
        email: email.trim(),
        otp: otp.trim(),
      });

      setSuccess(t("loginSuccess"));
      Cookies.set("access", res.data.access);
      Cookies.set("refresh", res.data.refresh);

      router.push(`/${locale}/home`);
    } catch (err) {
      setError(t("invalidOtp"));
      console.error(err);
    }
  };

  return (
    <div className={styles.loginPageMainContainer}>
      <div className={styles.loginCard}>
        <div className={styles.welcomeWrapper}>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        {step === "email" && (
          <form className={styles.form} onSubmit={onEmailFinish}>
            <label className={styles.label} htmlFor="username">
              {t("emailLabel")}
            </label>

            <input
              id="username"
              name="username"
              type="email"
              className={styles.input}
              placeholder={t("emailPlaceholder")}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                id="remember"
                name="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember">{t("rememberMe")}</label>
            </div>

            <button type="submit" className={styles.submitButton}>
              {t("sendOtp")}
            </button>

            <div className={styles.languageSwitcherAndThemeWrapper} style={{display: 'flex', gap: '5px'}} >
              <LanguageSwitcher />
              <div className={styles.topControls}>
                <button
                  type="button"
                  className={styles.themeToggle}
                  onClick={handleThemeToggle}
                  aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                  title={theme === "dark" ? "Light mode" : "Dark mode"}
                >
                  {theme === "dark" ? <SunOutlined /> : <MoonOutlined />}
                </button>
              </div>
            </div>
          </form>
        )}

        {step === "otp" && (
          <form className={styles.form} onSubmit={onOtpFinish}>
            <label className={styles.label} htmlFor="otp">
              {t("otpLabel")}
            </label>

            <input
              id="otp"
              name="otp"
              type="text"
              className={styles.input}
              placeholder={t("otpPlaceholder")}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
            />

            <button type="submit" className={styles.submitButton}>
              {t("verifyOtp")}
            </button>

            <button
              type="button"
              className={styles.backButton}
              onClick={() => setStep("email")}
            >
              {t("backToEmail")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;