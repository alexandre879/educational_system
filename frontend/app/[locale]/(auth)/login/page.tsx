"use client";

import React, { useEffect, useState } from "react";
import styles from "./login.module.scss";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  GraduationCap,
  Mail,
  Moon,
  RotateCw,
  ScrollText,
  ShieldCheck,
  Sun,
  Timer,
} from "lucide-react";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import { API_BASE_URL } from "@/interceptors";
import { setTokens } from "@/lib/auth";
import { resolvedTheme, toggleTheme, useAppearance } from "@/lib/appearance";
import OtpInput from "./OtpInput";

const REMEMBER_EMAIL_KEY = "rememberedEmail";
const RESEND_SECONDS = 30;
const EMPTY_CODE = ["", "", "", "", "", ""];
const FEATURE_ICONS = [ScrollText, CalendarDays, Timer];

const Login = () => {
  const t = useTranslations("Login");
  const tg = useTranslations("Glass");
  const tLayout = useTranslations("Layout");

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const locale = useLocale();
  const theme = resolvedTheme(useAppearance());
  const features = tg.raw("login.features") as string[];

  const errorMessage = (err: unknown, fallback: string) =>
    axios.isAxiosError(err) && err.response?.status === 429 ? t("tooManyRequests") : fallback;

  useEffect(() => {
    try {
      const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
    catch {
      // ignore
    }
  }, []);

  // Count down until another code may be requested.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const requestOtp = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        }
        else {
          window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      }
      catch {
        // ignore
      }

      await axios.post(`${API_BASE_URL}/otp/request/`, {
        email: email.trim(),
      });

      setSuccess(t("otpSent"));
      setCode(EMPTY_CODE);
      setCooldown(RESEND_SECONDS);
      setStep("otp");
    } catch (err) {
      setError(errorMessage(err, t("sendOtpFailed")));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onEmailFinish = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    requestOtp();
  };

  const verifyOtp = async (otp: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const res = await axios.post(`${API_BASE_URL}/otp/verify/`, {
        email: email.trim(),
        otp: otp.trim(),
      });

      setSuccess(t("loginSuccess"));
      setTokens(res.data.access, res.data.refresh);

      router.push(`/${locale}/home`);
    } catch (err) {
      setError(errorMessage(err, t("invalidOtp")));
      setCode(EMPTY_CODE);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onOtpFinish = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    verifyOtp(code.join(""));
  };

  const handleBackToEmail = () => {
    setError(null);
    setSuccess(null);
    setStep("email");
  };

  return (
    <div className={styles.loginPageMainContainer}>
      <div className={styles.controls}>
        <div className={styles.languageWrap}>
          <LanguageSwitcher />
        </div>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={theme === "dark" ? tg("header.toLight") : tg("header.toDark")}
          title={theme === "dark" ? tg("header.toLight") : tg("header.toDark")}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <section className={styles.showcase} aria-hidden="true">
        <span className={styles.brandMark}>
          <GraduationCap size={34} strokeWidth={2} />
        </span>
        <h1 className={styles.showcaseTitle}>{tLayout("school")}</h1>
        <p className={styles.tagline}>{tg("login.tagline")}</p>
        <ul className={styles.features}>
          {features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
            return (
              <li key={feature} style={{ animationDelay: `${240 + index * 110}ms` }}>
                <span className={styles.featureIcon}>
                  <Icon size={18} />
                </span>
                {feature}
              </li>
            );
          })}
        </ul>
      </section>

      <div className={`${styles.loginCard} lg-rim`}>
        <div className={styles.welcomeWrapper}>
          <span className={styles.cardMark}>
            <GraduationCap size={26} />
          </span>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>

        <div
          className={styles.steps}
          data-step={step}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={step === "email" ? 1 : 2}
          aria-label={tg("login.step", { current: step === "email" ? 1 : 2, total: 2 })}
        >
          <span />
          <span />
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        {step === "email" && (
          <form className={styles.form} onSubmit={onEmailFinish} key="email">
            <label className={styles.label} htmlFor="username">
              {t("emailLabel")}
            </label>

            <div className={styles.inputWrap}>
              <Mail size={17} className={styles.inputIcon} aria-hidden="true" />
              <input
                id="username"
                name="username"
                type="email"
                className={styles.input}
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

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

            <button type="submit" className={styles.submitButton} disabled={submitting} data-loading={submitting}>
              {submitting ? <span className={styles.buttonSpinner} aria-hidden="true" /> : null}
              {t("sendOtp")}
              {!submitting ? <ArrowRight size={17} /> : null}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form className={styles.form} onSubmit={onOtpFinish} key="otp">
            <button type="button" className={styles.emailChip} onClick={handleBackToEmail} title={t("backToEmail")}>
              <Mail size={14} />
              <span>{email.trim()}</span>
            </button>

            <span className={styles.label}>{tg("login.codeHint")}</span>

            <OtpInput
              digits={code}
              onChange={setCode}
              onComplete={verifyOtp}
              label={t("otpLabel")}
              digitLabel={(index) => tg("login.digit", { index })}
              disabled={submitting}
            />

            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting || code.some((digit) => !digit)}
              data-loading={submitting}
            >
              {submitting ? <span className={styles.buttonSpinner} aria-hidden="true" /> : null}
              {t("verifyOtp")}
            </button>

            <div className={styles.otpActions}>
              <button type="button" className={styles.backButton} onClick={handleBackToEmail}>
                <ArrowLeft size={15} />
                {t("backToEmail")}
              </button>
              <button
                type="button"
                className={styles.resendButton}
                onClick={requestOtp}
                disabled={cooldown > 0 || submitting}
              >
                <RotateCw size={14} />
                {cooldown > 0 ? tg("login.resendIn", { seconds: cooldown }) : tg("login.resend")}
              </button>
            </div>
          </form>
        )}

        <p className={styles.secureNote}>
          <ShieldCheck size={14} />
          {tg("login.secure")}
        </p>
      </div>
    </div>
  );
};

export default Login;
