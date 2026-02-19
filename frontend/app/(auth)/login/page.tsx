
// "use client";

// import React, { useEffect, useState } from "react";
// import styles from "./login.module.scss";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import Cookies from "cookies-js";

// const REMEMBER_EMAIL_KEY = "rememberedEmail";

// const Login = () => {
//   const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

//   const [step, setStep] = useState<"email" | "otp">("email");
//   const [email, setEmail] = useState("");
//   const [rememberMe, setRememberMe] = useState(false);

//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   const router = useRouter();

//   // Load remembered email (if any)
//   useEffect(() => {
//     try {
//       const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
//       if (savedEmail) {
//         setEmail(savedEmail);
//         setRememberMe(true);
//       }
//     } catch (e) {
//       // ignore (storage may be blocked)
//     }
//   }, []);

//   const onEmailFinish = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     try {
//       setError(null);
//       setSuccess(null);

//       // Persist or clear remembered email (UI-only feature, no logic change)
//       try {
//         if (rememberMe) {
//           window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
//         } 
//         else {
//           window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
//         }
//       } catch (e) {
//         // ignore
//       }

//       await axios.post(`${API_BASE_URL}/otp/request/`, {
//         email: email.trim(),
//       });

//       setSuccess("OTP sent to your school bot!");
//       setStep("otp");
//     } 
//     catch (err) {
//       setError("Failed to send OTP. Try again.");
//       console.error(err);
//     }
//   };

//   const onOtpFinish = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     const formData = new FormData(e.currentTarget);
//     const otp = (formData.get("otp") as string) ?? "";

//     try {
//       setError(null);
//       setSuccess(null);

//       const res = await axios.post(`${API_BASE_URL}/otp/verify/`, {
//         email: email.trim(),
//         otp: otp.trim(),
//       });

//       setSuccess("Login successful!");
//       Cookies.set("access", res.data.access);
//       Cookies.set("refresh", res.data.refresh);
//       router.push("/home");
//     } 
//     catch (err) {
//       setError("Invalid OTP. Try again.");
//       console.error(err);
//     }
//   };

//   return (
//     <div className={styles.loginPageMainContainer}>
//       <div className={styles.loginCard}>
//         <div className={styles.welcomeWrapper}>
//           <h2 className={styles.title}>Welcome Back</h2>
//           <p className={styles.subtitle}>Sign in to continue your journey</p>
//         </div>

//         {error && <div className={styles.errorMessage}>{error}</div>}
//         {success && <div className={styles.successMessage}>{success}</div>}

//         {step === "email" && (
//           <form className={styles.form} onSubmit={onEmailFinish}>
//             <label className={styles.label} htmlFor="username">
//               Email
//             </label>

//             <input
//               id="username"
//               name="username"
//               type="email"
//               className={styles.input}
//               placeholder="Enter your email"
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
//               <label htmlFor="remember">Remember me</label>
//             </div>

//             <button type="submit" className={styles.submitButton}>
//               Send OTP
//             </button>
//           </form>
//         )}

//         {step === "otp" && (
//           <form className={styles.form} onSubmit={onOtpFinish}>
//             <label className={styles.label} htmlFor="otp">
//               OTP
//             </label>
//             <input
//               id="otp"
//               name="otp"
//               type="text"
//               className={styles.input}
//               placeholder="Enter OTP"
//               required
//               inputMode="numeric"
//               autoComplete="one-time-code"
//             />

//             <button type="submit" className={styles.submitButton}>
//               Verify OTP
//             </button>

//             <button
//               type="button"
//               className={styles.backButton}
//               onClick={() => setStep("email")}
//             >
//               Back to email
//             </button>
//           </form>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Login;





"use client";

import React, { useEffect, useState } from "react";
import styles from "./login.module.scss";
import axios from "axios";
import { useRouter } from "next/navigation";
import Cookies from "cookies-js";

const REMEMBER_EMAIL_KEY = "rememberedEmail";

const Login = () => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();

  // Load remembered email (if any)
  useEffect(() => {
    try {
      const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // ignore (storage may be blocked)
    }
  }, []);

  const onEmailFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setError(null);
      setSuccess(null);

      // Persist or clear remembered email (UI-only feature, no logic change)
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

      setSuccess("OTP sent to your school bot!");
      setStep("otp");
    } catch (err) {
      setError("Failed to send OTP. Try again.");
      console.error(err);
    }
  };

  const onOtpFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const otp = (formData.get("otp") as string) ?? "";

    try {
      setError(null);
      setSuccess(null);

      const res = await axios.post(`${API_BASE_URL}/otp/verify/`, {
        email: email.trim(),
        otp: otp.trim(),
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
        <div className={styles.welcomeWrapper}>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Sign in to continue your journey</p>
        </div>

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
              inputMode="numeric"
              autoComplete="one-time-code"
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