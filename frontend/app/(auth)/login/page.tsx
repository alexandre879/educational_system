"use client";

import React, { useState } from "react";
import styles from "./login.module.scss";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "cookies-js";

const Login = () => {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();

  const onEmailFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;

    try {
      setError(null);
      setSuccess(null);
      setEmail(username);
      await axios.post("http://192.168.100.213:8000/api/otp/request/", {
        email: username,
      });

      setSuccess("OTP sent to your school bot!");
      setStep("otp");
    } 
    catch (err) {
      setError("Failed to send OTP. Try again.");
      console.error(err);
    }
  };

  const onOtpFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const otp = formData.get("otp") as string;

    try {
      setError(null);
      setSuccess(null);

      const res = await axios.post("http://192.168.100.213:8000/api/otp/verify/", {
        email: email,
        otp,
      });

      setSuccess("Login successful!");
      Cookies.set("access", res.data.access);
      Cookies.set("refresh", res.data.refresh);
      router.push("/home");
    } catch (err) {
      setError("Invalid OTP. Try again.");
      console.error(err);
    }
  };

  return (
    <div className={styles.loginPageMainContainer}>
      <div className={styles.loginCard}>
        <h2 className={styles.title}>Welcome Back</h2>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        {step === "email" && (
          <form className={styles.form} onSubmit={onEmailFinish}>
            <label className={styles.label} htmlFor="username">
              Email
            </label>
            <input
              id="username"
              name="username"
              type="email"
              className={styles.input}
              placeholder="Enter your email"
              required
            />

            <div className={styles.checkboxWrapper}>
              <input type="checkbox" id="remember" name="remember" />
              <label htmlFor="remember">Remember me</label>
            </div>

            <button type="submit" className={styles.submitButton}>
              Send OTP
            </button>
          </form>
        )}

        {step === "otp" && (
          <form className={styles.form} onSubmit={onOtpFinish}>
            <label className={styles.label} htmlFor="otp">
              OTP
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              className={styles.input}
              placeholder="Enter OTP"
              required
            />

            <button type="submit" className={styles.submitButton}>
              Verify OTP
            </button>

            <button
              type="button"
              className={styles.backButton}
              onClick={() => setStep("email")}
            >
              Back to email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;