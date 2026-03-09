// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { usePathname, useRouter } from "next/navigation";

// import api from "@/interceptors";
// import styles from "./home.module.scss";

// import {
//   Avatar,
//   Chip,
//   CircularProgress,
//   Typography,
//   useMediaQuery,
// } from "@mui/material";
// import { Modal } from "antd";
// import { FaHome } from "react-icons/fa";

// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   ArcElement,
//   Tooltip,
//   Legend,
//   Filler,
//   type ChartOptions,
// } from "chart.js";
// import { Bar, Doughnut } from "react-chartjs-2";

// import { DashboardResponse } from "./interface";
// import { useTranslations } from "next-intl";

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   ArcElement,
//   Tooltip,
//   Legend,
//   Filler
// );

// function formatTime(iso: string) {
//   const d = new Date(iso);
//   return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
// }

// function formatDayShort(iso?: string | null) {
//   if (!iso) return "";
//   const d = new Date(iso);
//   return d.toLocaleDateString([], { weekday: "short" });
// }

// function clamp(n: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, n));
// }

// export default function Home() {
//   const t = useTranslations("Home");

//   const isPhone = useMediaQuery("(max-width:600px)");
//   const isTablet = useMediaQuery("(max-width:900px)");
//   const router = useRouter();
//   const pathname = usePathname();

//   const locale = useMemo(() => {
//     const seg = (pathname ?? "").split("/")[1];
//     return seg || "en";
//   }, [pathname]);

//   const [data, setData] = useState<DashboardResponse | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isActiveExamModalOpen, setIsActiveExamModalOpen] = useState(false);
//   const [themeVersion, setThemeVersion] = useState(0);

//   useEffect(() => {
//     let mounted = true;

//     (async () => {
//       try {
//         const res = await api.get<DashboardResponse | null>("/home/");
//         if (mounted) setData(res.data);
//       } catch (err) {
//         console.error("Dashboard error:", err);
//         if (mounted) setData(null);
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   useEffect(() => {
//     if (typeof window === "undefined") return;

//     const html = document.documentElement;

//     const observer = new MutationObserver(() => {
//       setThemeVersion((prev) => prev + 1);
//     });

//     observer.observe(html, {
//       attributes: true,
//       attributeFilter: ["data-theme"],
//     });

//     return () => observer.disconnect();
//   }, []);

//   const chartTheme = useMemo(() => {
//     if (typeof window === "undefined") {
//       return {
//         text: "#b8b8b8",
//         strongText: "#f0f0f0",
//         grid: "rgba(255,255,255,0.10)",
//         border: "rgba(255,255,255,0.18)",
//       };
//     }

//     const rootStyles = getComputedStyle(document.documentElement);

//     return {
//       text:
//         rootStyles.getPropertyValue("--chart-axis-text").trim() || "#b8b8b8",
//       strongText:
//         rootStyles.getPropertyValue("--text-primary").trim() || "#f0f0f0",
//       grid:
//         rootStyles.getPropertyValue("--chart-grid").trim() ||
//         "rgba(255,255,255,0.10)",
//       border:
//         rootStyles.getPropertyValue("--chart-axis-border").trim() ||
//         "rgba(255,255,255,0.18)",
//     };
//   }, [themeVersion]);

//   const fullName = useMemo(() => {
//     const fn = data?.me?.first_name ?? "";
//     const ln = data?.me?.last_name ?? "";
//     return `${fn} ${ln}`.trim() || t("fallbackUser");
//   }, [data, t]);

//   const gradeText = useMemo(() => {
//     const g = data?.me?.grade_in;
//     if (!g) return t("noGrade");
//     const cat = g.category?.name ? ` – ${g.category.name}` : "";
//     return `${g.name}${cat}`;
//   }, [data, t]);

//   const sessions = useMemo(() => data?.sessions ?? [], [data]);

//   const activeSessions = useMemo(() => {
//     const now = new Date();
//     return sessions.filter(
//       (s) => s.is_active && s.ends_at && new Date(s.ends_at) > now
//     );
//   }, [sessions]);

//   const chartData = useMemo(() => {
//     const arr = data?.subjectPoints ?? [];
//     return arr.map((x) => ({ name: x.subject.name, points: x.points ?? 0 }));
//   }, [data]);

//   const progressMetrics = useMemo(() => {
//     const total = sessions.length;
//     const finishedSessions = sessions.filter((s) => s.finished);
//     const finished = finishedSessions.length;

//     const completionPct = total === 0 ? 0 : Math.round((finished / total) * 100);

//     const avgScore =
//       finished === 0
//         ? 0
//         : Math.round(
//             finishedSessions.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
//               finished
//           );

//     const finishedSorted = [...finishedSessions].sort((a, b) => {
//       const ta = new Date(a.started_at ?? 0).getTime();
//       const tb = new Date(b.started_at ?? 0).getTime();
//       return tb - ta;
//     });

//     const last7 = finishedSorted.slice(0, 7);
//     const prev7 = finishedSorted.slice(7, 14);

//     const lastAvg =
//       last7.length === 0
//         ? 0
//         : last7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
//           last7.length;

//     const prevAvg =
//       prev7.length === 0
//         ? 0
//         : prev7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
//           prev7.length;

//     const delta =
//       last7.length === 0 || prev7.length === 0
//         ? 0
//         : Math.round(lastAvg - prevAvg);

//     return { total, finished, completionPct, avgScore, delta };
//   }, [sessions]);

//   const weeklyActivityData = useMemo(() => {
//     const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
//     const map = new Map<string, number>(order.map((k) => [k, 0]));

//     for (const s of sessions) {
//       const day = formatDayShort(s.started_at);
//       if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
//     }

//     return order.map((day) => ({ day, sessions: map.get(day) ?? 0 }));
//   }, [sessions]);

//   const avgScoreBySubjectData = useMemo(() => {
//     const map = new Map<string, { total: number; count: number }>();

//     for (const s of sessions) {
//       if (!s.finished) continue;
//       const name = s.subject?.name ?? t("unknown");
//       const entry = map.get(name) ?? { total: 0, count: 0 };
//       entry.total += s.score_so_far ?? 0;
//       entry.count += 1;
//       map.set(name, entry);
//     }

//     return Array.from(map.entries())
//       .map(([name, v]) => ({
//         name,
//         avgScore: v.count === 0 ? 0 : Math.round(v.total / v.count),
//         attempts: v.count,
//       }))
//       .sort((a, b) => b.attempts - a.attempts)
//       .slice(0, 6);
//   }, [sessions, t]);

//   const topExamsData = useMemo(() => {
//     const map = new Map<string, number>();
//     for (const s of sessions) {
//       const title = s.exam?.title ?? t("unknown");
//       map.set(title, (map.get(title) ?? 0) + 1);
//     }

//     return Array.from(map.entries())
//       .map(([name, attempts]) => ({ name, attempts }))
//       .sort((a, b) => b.attempts - a.attempts)
//       .slice(0, 6);
//   }, [sessions, t]);

//   const chartHeight = isPhone ? 220 : isTablet ? 260 : 300;

//   const onActiveExamClick = () => {
//     if (activeSessions.length) setIsActiveExamModalOpen(true);
//   };

//   const barOptions = useMemo<ChartOptions<"bar">>(
//     () => ({
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: {
//         legend: {
//           display: false,
//           labels: {
//             color: chartTheme.strongText,
//           },
//         },
//         tooltip: {
//           enabled: true,
//         },
//       },
//       scales: {
//         x: {
//           ticks: {
//             color: chartTheme.text,
//             maxRotation: 0,
//             autoSkip: true,
//           },
//           grid: {
//             color: chartTheme.grid,
//             drawBorder: false,
//           },
//           border: {
//             color: chartTheme.border,
//           },
//         },
//         y: {
//           ticks: {
//             color: chartTheme.text,
//           },
//           grid: {
//             color: chartTheme.grid,
//             drawBorder: false,
//           },
//           border: {
//             color: chartTheme.border,
//           },
//         },
//       },
//     }),
//     [chartTheme]
//   );

//   const doughnutOptions = useMemo<ChartOptions<"doughnut">>(
//     () => ({
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: {
//         legend: {
//           display: false,
//           labels: {
//             color: chartTheme.strongText,
//           },
//         },
//         tooltip: {
//           enabled: true,
//         },
//       },
//     }),
//     [chartTheme]
//   );

//   const pointsBySubjectBar = useMemo(
//     () => ({
//       labels: chartData.map((d) => d.name),
//       datasets: [
//         {
//           label: t("pointsLabel"),
//           data: chartData.map((d) => d.points),
//           backgroundColor: "rgba(59,130,246,0.70)",
//           borderColor: "rgba(96,165,250,1)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [chartData, t]
//   );

//   const weeklyActivityBar = useMemo(
//     () => ({
//       labels: weeklyActivityData.map((d) => d.day),
//       datasets: [
//         {
//           label: t("sessionsLabel"),
//           data: weeklyActivityData.map((d) => d.sessions),
//           backgroundColor: "rgba(96,165,250,0.55)",
//           borderColor: "rgba(96,165,250,0.95)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [weeklyActivityData, t]
//   );

//   const avgScoreBySubjectBar = useMemo(
//     () => ({
//       labels: avgScoreBySubjectData.map((d) => d.name),
//       datasets: [
//         {
//           label: t("avgScoreLabel"),
//           data: avgScoreBySubjectData.map((d) => d.avgScore),
//           backgroundColor: "rgba(243, 0, 194, 0.41)",
//           borderColor: "rgba(243, 0, 194, 0.88)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [avgScoreBySubjectData, t]
//   );

//   const topExamsBar = useMemo(
//     () => ({
//       labels: topExamsData.map((d) => d.name),
//       datasets: [
//         {
//           label: t("attemptsLabel"),
//           data: topExamsData.map((d) => d.attempts),
//           backgroundColor: "rgba(250,173,20,0.55)",
//           borderColor: "rgba(250,173,20,0.95)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [topExamsData, t]
//   );

//   const completionDoughnut = useMemo(() => {
//     const done = clamp(progressMetrics.completionPct, 0, 100);

//     return {
//       labels: [t("done"), t("remaining")],
//       datasets: [
//         {
//           data: [done, 100 - done],
//           backgroundColor: [
//             "rgba(34,197,94,0.80)",
//             "rgba(148,163,184,0.20)",
//           ],
//           borderColor: [
//             "rgba(34,197,94,0.95)",
//             "rgba(148,163,184,0.55)",
//           ],
//           borderWidth: 2,
//           cutout: "72%",
//         },
//       ],
//     };
//   }, [progressMetrics.completionPct, t]);

//   const onExamActiveClick = (examId: number) => {
//     router.push(`/${locale}/exam/${examId}/start`);
//   };

//   if (loading) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.center}>
//           <CircularProgress />
//           <Typography sx={{ mt: 2 }}>{t("loading")}</Typography>
//         </div>
//       </div>
//     );
//   }

//   if (!data) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.center}>
//           <Typography variant="h6">{t("failedTitle")}</Typography>
//           <Typography className={styles.muted}>{t("failedHint")}</Typography>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.page}>
//       <div className={styles.WrapperOfMainCaptionAndIcon}>
//         <span className={styles.headerIcon}>
//           <FaHome className={styles.navIcon} />
//         </span>
//         <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//       </div>

//       <div className={styles.header}>
//         <div className={styles.profile}>
//           <Avatar
//             src={data.me.profilePic ?? undefined}
//             className={styles.avatar}
//             sx={{ width: 60, height: 60 }}
//           />
//           <div className={styles.profileText}>
//             <Typography className={styles.title}>
//               {t("welcome")}, <u>{fullName}</u> 👋
//             </Typography>

//             <div className={styles.subRow}>
//               <span className={styles.preCaptions}>{t("role")}:</span>
//               <Chip
//                 size="small"
//                 label={data.me.role ?? t("roleFallback")}
//                 sx={{ backgroundColor: "#2d5899", color: "#fff" }}
//               />
//               {data.me.grade_in && (
//                 <>
//                   <span className={styles.preCaptions}>{t("grade")}:</span>
//                   <Chip
//                     size="small"
//                     variant="outlined"
//                     label={gradeText}
//                     sx={{ borderColor: "#ff6af5c4", color: "#ff6af5c4" }}
//                   />
//                 </>
//               )}
//               <span className={styles.preCaptions}>{t("email")}:</span>
//               <Typography className={styles.muted}>
//                 <u>{data.me.email}</u>
//               </Typography>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid3}>
//         <div className={styles.card}>
//           <Typography className={styles.cardLabel}>{t("totalPoints")}</Typography>
//           <Typography className={styles.cardValue}>{data.me.points ?? 0}</Typography>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.cardLabel}>{t("subjects")}</Typography>
//           <Typography className={styles.cardValue}>
//             {data.subjects?.length ?? 0}
//           </Typography>
//         </div>

//         <div
//           className={`${styles.card} ${styles.cardClickable}`}
//           onClick={onActiveExamClick}
//         >
//           <Typography className={styles.cardLabel}>{t("activeExams")}</Typography>
//           <Typography className={styles.cardValue}>{activeSessions.length}</Typography>
//         </div>
//       </div>

//       <div className={styles.grid2}>
//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("pointsBySubject")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {chartData.length === 0 ? (
//               <Typography className={styles.muted}>{t("noPointsYet")}</Typography>
//             ) : (
//               <Bar
//                 key={`points-${themeVersion}`}
//                 data={pointsBySubjectBar}
//                 options={barOptions}
//               />
//             )}
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("progressOverview")}</Typography>

//           <div
//             className={styles.chartBox}
//             style={{ height: chartHeight, position: "relative" }}
//           >
//             <Doughnut
//               key={`progress-${themeVersion}`}
//               data={completionDoughnut}
//               options={doughnutOptions}
//             />
//             <div className={styles.gaugeCenter}>
//               <Typography className={styles.gaugePct}>
//                 {progressMetrics.completionPct}%
//               </Typography>
//               <Typography className={styles.gaugeSub}>
//                 {t("completion")} •{" "}
//                 {t("avgScoreText", { avg: progressMetrics.avgScore })}
//               </Typography>

//               <Typography
//                 className={styles.gaugeDelta}
//                 style={{ color: progressMetrics.delta >= 0 ? "#22c55e" : "#ef4444" }}
//               >
//                 {progressMetrics.delta >= 0
//                   ? t("deltaUp", { delta: progressMetrics.delta })
//                   : t("deltaDown", { delta: progressMetrics.delta })}
//               </Typography>
//             </div>
//           </div>

//           <div className={styles.badgeRow}>
//             <Chip
//               size="small"
//               style={{ color: "var(--text-primary)" }}
//               label={t("finishedBadge", {
//                 finished: progressMetrics.finished,
//                 total: progressMetrics.total,
//               })}
//             />
//             <Chip
//               size="small"
//               style={{ color: "var(--text-primary)" }}
//               label={t("activeBadge", { active: activeSessions.length })}
//             />
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid3}>
//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>
//             {t("topExamsAttempts")}
//           </Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {topExamsData.length === 0 ? (
//               <Typography className={styles.muted}>{t("noAttemptsYet")}</Typography>
//             ) : (
//               <Bar
//                 key={`top-exams-${themeVersion}`}
//                 data={topExamsBar}
//                 options={barOptions}
//               />
//             )}
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("weeklyActivity")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             <Bar
//               key={`weekly-${themeVersion}`}
//               data={weeklyActivityBar}
//               options={barOptions}
//             />
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>
//             {t("avgScoreBySubject")}
//           </Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {avgScoreBySubjectData.length === 0 ? (
//               <Typography className={styles.muted}>{t("noFinishedYet")}</Typography>
//             ) : (
//               <Bar
//                 key={`avg-score-${themeVersion}`}
//                 data={avgScoreBySubjectBar}
//                 options={barOptions}
//               />
//             )}
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid2} style={{ display: "flex", flexDirection: "column" }}>
//         <div
//           className={styles.card}
//           style={{ display: "flex", flexDirection: "column", gap: "10px" }}
//         >
//           <Typography className={styles.sectionTitle}>
//             {t("activeExamSessions")}
//           </Typography>

//           {activeSessions.length === 0 ? (
//             <Typography className={styles.muted}>{t("noActiveExams")}</Typography>
//           ) : (
//             <div className={styles.list}>
//               {activeSessions.map((s) => (
//                 <div
//                   key={s.id}
//                   className={styles.listItem}
//                   style={{ boxShadow: "none" }}
//                 >
//                   <div className={styles.listTop}>
//                     <Typography
//                       className={styles.listTitle}
//                       title={s.exam.title}
//                       sx={{ color: "var(--text-strong)" }}
//                     >
//                       {s.exam.title}
//                     </Typography>
//                     <Chip
//                       size="small"
//                       label={s.subject.name}
//                       sx={{
//                         backgroundColor: "#0B1220",
//                         color: "#faad14",
//                         border: "1px solid #1E293B",
//                       }}
//                     />
//                   </div>

//                   <Typography className={styles.muted}>
//                     {t("ends")}:{" "}
//                     <span style={{ color: "orange" }}>
//                       {s.ends_at ? formatTime(s.ends_at) : "—"}
//                     </span>{" "}
//                     • {t("score")}:{" "}
//                     <span style={{ color: "#22c55e" }}>{s.score_so_far}</span>
//                   </Typography>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       <div
//         className={styles.card}
//         style={{ display: "flex", flexDirection: "column", gap: "10px" }}
//       >
//         <Typography className={styles.sectionTitle}>
//           {t("recentExamSessions")}
//         </Typography>

//         {sessions.length === 0 ? (
//           <Typography className={styles.muted}>{t("noSessionsYet")}</Typography>
//         ) : (
//           <div className={styles.table}>
//             {sessions.slice(0, 8).map((s) => (
//               <div key={s.id} className={styles.row}>
//                 <Typography className={styles.rowMain} title={s.exam.title}>
//                   <u>{s.exam.title}</u>
//                 </Typography>

//                 <Typography className={styles.rowMeta}>
//                   {s.subject.name} •{" "}
//                   {s.finished ? (
//                     <span style={{ color: "var(--primary-blue)" }}>
//                       {t("finished")}
//                     </span>
//                   ) : (
//                     t("inProgress")
//                   )}{" "}
//                   • {t("score")}:{" "}
//                   <span style={{ color: "var(--primary-blue)" }}>
//                     {s.score_so_far}
//                   </span>
//                 </Typography>

//                 <Typography className={styles.rowTime}>
//                   {s.started_at ? formatTime(s.started_at) : "—"}
//                 </Typography>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       <Modal
//         title={t("modalActiveExamsTitle")}
//         open={isActiveExamModalOpen}
//         onCancel={() => setIsActiveExamModalOpen(false)}
//         footer={null}
//       >
//         <ul className={styles.activeExamsUl}>
//           {activeSessions.map((s) => (
//             <li
//               className={styles.activeExamsList}
//               key={s.id}
//               onClick={() => onExamActiveClick(s.exam.id)}
//             >
//               {s.exam.title}
//             </li>
//           ))}
//         </ul>
//       </Modal>
//     </div>
//   );
// }










// "use client";

// import { useEffect, useMemo, useState, useCallback } from "react";
// import { usePathname, useRouter } from "next/navigation";

// import api from "@/interceptors";
// import styles from "./home.module.scss";

// import {
//   Avatar,
//   Chip,
//   CircularProgress,
//   Typography,
//   useMediaQuery,
// } from "@mui/material";
// import { Modal } from "antd";
// import { FaHome } from "react-icons/fa";

// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   ArcElement,
//   Tooltip,
//   Legend,
//   Filler,
//   type ChartOptions,
// } from "chart.js";
// import { Bar, Doughnut } from "react-chartjs-2";

// import { DashboardResponse } from "./interface";
// import { useTranslations } from "next-intl";

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   ArcElement,
//   Tooltip,
//   Legend,
//   Filler
// );

// const WEEK_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// function formatTime(iso: string) {
//   return new Date(iso).toLocaleTimeString([], {
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function formatDayShort(iso?: string | null) {
//   if (!iso) return "";
//   return new Date(iso).toLocaleDateString([], { weekday: "short" });
// }

// function clamp(n: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, n));
// }

// function getCssVar(name: string, fallback: string) {
//   if (typeof window === "undefined") return fallback;
//   return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
// }

// export default function Home() {
//   const t = useTranslations("Home");
//   const router = useRouter();
//   const pathname = usePathname();

//   const isPhone = useMediaQuery("(max-width:600px)");
//   const isTablet = useMediaQuery("(max-width:900px)");

//   const [data, setData] = useState<DashboardResponse | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isActiveExamModalOpen, setIsActiveExamModalOpen] = useState(false);
//   const [themeVersion, setThemeVersion] = useState(0);

//   const locale = pathname?.split("/")[1] || "en";
//   const chartHeight = isPhone ? 220 : isTablet ? 260 : 300;

//   useEffect(() => {
//     let cancelled = false;

//     const loadDashboard = async () => {
//       try {
//         const res = await api.get<DashboardResponse | null>("/home/");
//         if (!cancelled) setData(res.data);
//       } catch (err) {
//         console.error("Dashboard error:", err);
//         if (!cancelled) setData(null);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     };

//     loadDashboard();

//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   useEffect(() => {
//     if (typeof window === "undefined") return;

//     const observer = new MutationObserver(() => {
//       setThemeVersion((prev) => prev + 1);
//     });

//     observer.observe(document.documentElement, {
//       attributes: true,
//       attributeFilter: ["data-theme"],
//     });

//     return () => observer.disconnect();
//   }, []);

//   const chartTheme = useMemo(
//     () => ({
//       text: getCssVar("--chart-axis-text", "#b8b8b8"),
//       strongText: getCssVar("--text-primary", "#f0f0f0"),
//       grid: getCssVar("--chart-grid", "rgba(255,255,255,0.10)"),
//       border: getCssVar("--chart-axis-border", "rgba(255,255,255,0.18)"),
//     }),
//     [themeVersion]
//   );

//   const sessions = data?.sessions ?? [];
//   const subjects = data?.subjects ?? [];
//   const subjectPoints = data?.subjectPoints ?? [];

//   const fullName = `${data?.me?.first_name ?? ""} ${data?.me?.last_name ?? ""}`.trim() || t("fallbackUser");

//   const gradeText = (() => {
//     const g = data?.me?.grade_in;
//     if (!g) return t("noGrade");
//     return `${g.name}${g.category?.name ? ` – ${g.category.name}` : ""}`;
//   })();

//   const derived = useMemo(() => {
//     const now = Date.now();

//     const activeSessions = sessions.filter(
//       (s) => s.is_active && s.ends_at && new Date(s.ends_at).getTime() > now
//     );

//     const chartData = subjectPoints.map((x) => ({
//       name: x.subject.name,
//       points: x.points ?? 0,
//     }));

//     const finishedSessions = sessions.filter((s) => s.finished);
//     const total = sessions.length;
//     const finished = finishedSessions.length;

//     const completionPct = total === 0 ? 0 : Math.round((finished / total) * 100);

//     const avgScore =
//       finished === 0
//         ? 0
//         : Math.round(
//             finishedSessions.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
//               finished
//           );

//     const finishedSorted = [...finishedSessions].sort(
//       (a, b) =>
//         new Date(b.started_at ?? 0).getTime() - new Date(a.started_at ?? 0).getTime()
//     );

//     const last7 = finishedSorted.slice(0, 7);
//     const prev7 = finishedSorted.slice(7, 14);

//     const lastAvg =
//       last7.length === 0
//         ? 0
//         : last7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) / last7.length;

//     const prevAvg =
//       prev7.length === 0
//         ? 0
//         : prev7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) / prev7.length;

//     const delta =
//       last7.length === 0 || prev7.length === 0 ? 0 : Math.round(lastAvg - prevAvg);

//     const weeklyMap = new Map<string, number>(WEEK_ORDER.map((d) => [d, 0]));
//     const subjectScoreMap = new Map<string, { total: number; count: number }>();
//     const examAttemptsMap = new Map<string, number>();

//     for (const s of sessions) {
//       const day = formatDayShort(s.started_at);
//       if (weeklyMap.has(day)) {
//         weeklyMap.set(day, (weeklyMap.get(day) ?? 0) + 1);
//       }

//       const examTitle = s.exam?.title ?? t("unknown");
//       examAttemptsMap.set(examTitle, (examAttemptsMap.get(examTitle) ?? 0) + 1);

//       if (s.finished) {
//         const subjectName = s.subject?.name ?? t("unknown");
//         const entry = subjectScoreMap.get(subjectName) ?? { total: 0, count: 0 };
//         entry.total += s.score_so_far ?? 0;
//         entry.count += 1;
//         subjectScoreMap.set(subjectName, entry);
//       }
//     }

//     const weeklyActivityData = WEEK_ORDER.map((day) => ({
//       day,
//       sessions: weeklyMap.get(day) ?? 0,
//     }));

//     const avgScoreBySubjectData = Array.from(subjectScoreMap.entries())
//       .map(([name, v]) => ({
//         name,
//         avgScore: v.count === 0 ? 0 : Math.round(v.total / v.count),
//         attempts: v.count,
//       }))
//       .sort((a, b) => b.attempts - a.attempts)
//       .slice(0, 6);

//     const topExamsData = Array.from(examAttemptsMap.entries())
//       .map(([name, attempts]) => ({ name, attempts }))
//       .sort((a, b) => b.attempts - a.attempts)
//       .slice(0, 6);

//     return {
//       activeSessions,
//       chartData,
//       progressMetrics: {
//         total,
//         finished,
//         completionPct,
//         avgScore,
//         delta,
//       },
//       weeklyActivityData,
//       avgScoreBySubjectData,
//       topExamsData,
//     };
//   }, [sessions, subjectPoints, t]);

//   const onActiveExamClick = useCallback(() => {
//     if (derived.activeSessions.length) {
//       setIsActiveExamModalOpen(true);
//     }
//   }, [derived.activeSessions.length]);

//   const onExamActiveClick = useCallback(
//     (examId: number) => {
//       router.push(`/${locale}/exam/${examId}/start`);
//     },
//     [router, locale]
//   );

//   const barOptions = useMemo<ChartOptions<"bar">>(
//     () => ({
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: {
//         legend: {
//           display: false,
//           labels: { color: chartTheme.strongText },
//         },
//         tooltip: { enabled: true },
//       },
//       scales: {
//         x: {
//           ticks: {
//             color: chartTheme.text,
//             maxRotation: 0,
//             autoSkip: true,
//           },
//           grid: {
//             color: chartTheme.grid,
//             drawBorder: false,
//           },
//           border: {
//             color: chartTheme.border,
//           },
//         },
//         y: {
//           ticks: {
//             color: chartTheme.text,
//           },
//           grid: {
//             color: chartTheme.grid,
//             drawBorder: false,
//           },
//           border: {
//             color: chartTheme.border,
//           },
//         },
//       },
//     }),
//     [chartTheme]
//   );

//   const doughnutOptions = useMemo<ChartOptions<"doughnut">>(
//     () => ({
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: {
//         legend: {
//           display: false,
//           labels: { color: chartTheme.strongText },
//         },
//         tooltip: { enabled: true },
//       },
//     }),
//     [chartTheme]
//   );

//   const pointsBySubjectBar = useMemo(
//     () => ({
//       labels: derived.chartData.map((d) => d.name),
//       datasets: [
//         {
//           label: t("pointsLabel"),
//           data: derived.chartData.map((d) => d.points),
//           backgroundColor: "rgba(59,130,246,0.70)",
//           borderColor: "rgba(96,165,250,1)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [derived.chartData, t]
//   );

//   const weeklyActivityBar = useMemo(
//     () => ({
//       labels: derived.weeklyActivityData.map((d) => d.day),
//       datasets: [
//         {
//           label: t("sessionsLabel"),
//           data: derived.weeklyActivityData.map((d) => d.sessions),
//           backgroundColor: "rgba(96,165,250,0.55)",
//           borderColor: "rgba(96,165,250,0.95)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [derived.weeklyActivityData, t]
//   );

//   const avgScoreBySubjectBar = useMemo(
//     () => ({
//       labels: derived.avgScoreBySubjectData.map((d) => d.name),
//       datasets: [
//         {
//           label: t("avgScoreLabel"),
//           data: derived.avgScoreBySubjectData.map((d) => d.avgScore),
//           backgroundColor: "rgba(243, 0, 194, 0.41)",
//           borderColor: "rgba(243, 0, 194, 0.88)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [derived.avgScoreBySubjectData, t]
//   );

//   const topExamsBar = useMemo(
//     () => ({
//       labels: derived.topExamsData.map((d) => d.name),
//       datasets: [
//         {
//           label: t("attemptsLabel"),
//           data: derived.topExamsData.map((d) => d.attempts),
//           backgroundColor: "rgba(250,173,20,0.55)",
//           borderColor: "rgba(250,173,20,0.95)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [derived.topExamsData, t]
//   );

//   const completionDoughnut = useMemo(() => {
//     const done = clamp(derived.progressMetrics.completionPct, 0, 100);

//     return {
//       labels: [t("done"), t("remaining")],
//       datasets: [
//         {
//           data: [done, 100 - done],
//           backgroundColor: [
//             "rgba(34,197,94,0.80)",
//             "rgba(148,163,184,0.20)",
//           ],
//           borderColor: [
//             "rgba(34,197,94,0.95)",
//             "rgba(148,163,184,0.55)",
//           ],
//           borderWidth: 2,
//           cutout: "72%",
//         },
//       ],
//     };
//   }, [derived.progressMetrics.completionPct, t]);

//   if (loading) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.center}>
//           <CircularProgress />
//           <Typography sx={{ mt: 2 }}>{t("loading")}</Typography>
//         </div>
//       </div>
//     );
//   }

//   if (!data) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.center}>
//           <Typography variant="h6">{t("failedTitle")}</Typography>
//           <Typography className={styles.muted}>{t("failedHint")}</Typography>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.page}>
//       <div className={styles.WrapperOfMainCaptionAndIcon}>
//         <span className={styles.headerIcon}>
//           <FaHome className={styles.navIcon} />
//         </span>
//         <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//       </div>

//       <div className={styles.header}>
//         <div className={styles.profile}>
//           <Avatar
//             src={data.me.profilePic ?? undefined}
//             className={styles.avatar}
//             sx={{ width: 60, height: 60 }}
//           />
//           <div className={styles.profileText}>
//             <Typography className={styles.title}>
//               {t("welcome")}, <u>{fullName}</u> 👋
//             </Typography>

//             <div className={styles.subRow}>
//               <span className={styles.preCaptions}>{t("role")}:</span>
//               <Chip
//                 size="small"
//                 label={data.me.role ?? t("roleFallback")}
//                 sx={{ backgroundColor: "#2d5899", color: "#fff" }}
//               />

//               {data.me.grade_in && (
//                 <>
//                   <span className={styles.preCaptions}>{t("grade")}:</span>
//                   <Chip
//                     size="small"
//                     variant="outlined"
//                     label={gradeText}
//                     sx={{ borderColor: "#ff6af5c4", color: "#ff6af5c4" }}
//                   />
//                 </>
//               )}

//               <span className={styles.preCaptions}>{t("email")}:</span>
//               <Typography className={styles.muted}>
//                 <u>{data.me.email}</u>
//               </Typography>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid3}>
//         <div className={styles.card}>
//           <Typography className={styles.cardLabel}>{t("totalPoints")}</Typography>
//           <Typography className={styles.cardValue}>{data.me.points ?? 0}</Typography>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.cardLabel}>{t("subjects")}</Typography>
//           <Typography className={styles.cardValue}>{subjects.length}</Typography>
//         </div>

//         <div
//           className={`${styles.card} ${styles.cardClickable}`}
//           onClick={onActiveExamClick}
//         >
//           <Typography className={styles.cardLabel}>{t("activeExams")}</Typography>
//           <Typography className={styles.cardValue}>
//             {derived.activeSessions.length}
//           </Typography>
//         </div>
//       </div>

//       <div className={styles.grid2}>
//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("pointsBySubject")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {derived.chartData.length === 0 ? (
//               <Typography className={styles.muted}>{t("noPointsYet")}</Typography>
//             ) : (
//               <Bar
//                 key={`points-${themeVersion}`}
//                 data={pointsBySubjectBar}
//                 options={barOptions}
//               />
//             )}
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("progressOverview")}</Typography>

//           <div className={styles.chartBox} style={{ height: chartHeight, position: "relative" }}>
//             <Doughnut
//               key={`progress-${themeVersion}`}
//               data={completionDoughnut}
//               options={doughnutOptions}
//             />
//             <div className={styles.gaugeCenter}>
//               <Typography className={styles.gaugePct}>
//                 {derived.progressMetrics.completionPct}%
//               </Typography>
//               <Typography className={styles.gaugeSub}>
//                 {t("completion")} •{" "}
//                 {t("avgScoreText", { avg: derived.progressMetrics.avgScore })}
//               </Typography>

//               <Typography
//                 className={styles.gaugeDelta}
//                 style={{
//                   color: derived.progressMetrics.delta >= 0 ? "#22c55e" : "#ef4444",
//                 }}
//               >
//                 {derived.progressMetrics.delta >= 0
//                   ? t("deltaUp", { delta: derived.progressMetrics.delta })
//                   : t("deltaDown", { delta: derived.progressMetrics.delta })}
//               </Typography>
//             </div>
//           </div>

//           <div className={styles.badgeRow}>
//             <Chip
//               size="small"
//               style={{ color: "var(--text-primary)" }}
//               label={t("finishedBadge", {
//                 finished: derived.progressMetrics.finished,
//                 total: derived.progressMetrics.total,
//               })}
//             />
//             <Chip
//               size="small"
//               style={{ color: "var(--text-primary)" }}
//               label={t("activeBadge", { active: derived.activeSessions.length })}
//             />
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid3}>
//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("topExamsAttempts")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {derived.topExamsData.length === 0 ? (
//               <Typography className={styles.muted}>{t("noAttemptsYet")}</Typography>
//             ) : (
//               <Bar
//                 key={`top-exams-${themeVersion}`}
//                 data={topExamsBar}
//                 options={barOptions}
//               />
//             )}
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("weeklyActivity")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             <Bar
//               key={`weekly-${themeVersion}`}
//               data={weeklyActivityBar}
//               options={barOptions}
//             />
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("avgScoreBySubject")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {derived.avgScoreBySubjectData.length === 0 ? (
//               <Typography className={styles.muted}>{t("noFinishedYet")}</Typography>
//             ) : (
//               <Bar
//                 key={`avg-score-${themeVersion}`}
//                 data={avgScoreBySubjectBar}
//                 options={barOptions}
//               />
//             )}
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid2} style={{ display: "flex", flexDirection: "column" }}>
//         <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
//           <Typography className={styles.sectionTitle}>{t("activeExamSessions")}</Typography>

//           {derived.activeSessions.length === 0 ? (
//             <Typography className={styles.muted}>{t("noActiveExams")}</Typography>
//           ) : (
//             <div className={styles.list}>
//               {derived.activeSessions.map((s) => (
//                 <div key={s.id} className={styles.listItem} style={{ boxShadow: "none" }}>
//                   <div className={styles.listTop}>
//                     <Typography
//                       className={styles.listTitle}
//                       title={s.exam.title}
//                       sx={{ color: "var(--text-strong)" }}
//                     >
//                       {s.exam.title}
//                     </Typography>

//                     <Chip
//                       size="small"
//                       label={s.subject.name}
//                       sx={{
//                         backgroundColor: "#0B1220",
//                         color: "#faad14",
//                         border: "1px solid #1E293B",
//                       }}
//                     />
//                   </div>

//                   <Typography className={styles.muted}>
//                     {t("ends")}:{" "}
//                     <span style={{ color: "orange" }}>
//                       {s.ends_at ? formatTime(s.ends_at) : "—"}
//                     </span>{" "}
//                     • {t("score")}:{" "}
//                     <span style={{ color: "#22c55e" }}>{s.score_so_far}</span>
//                   </Typography>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
//         <Typography className={styles.sectionTitle}>{t("recentExamSessions")}</Typography>

//         {sessions.length === 0 ? (
//           <Typography className={styles.muted}>{t("noSessionsYet")}</Typography>
//         ) : (
//           <div className={styles.table}>
//             {sessions.slice(0, 8).map((s) => (
//               <div key={s.id} className={styles.row}>
//                 <Typography className={styles.rowMain} title={s.exam.title}>
//                   <u>{s.exam.title}</u>
//                 </Typography>

//                 <Typography className={styles.rowMeta}>
//                   {s.subject.name} •{" "}
//                   {s.finished ? (
//                     <span style={{ color: "var(--primary-blue)" }}>{t("finished")}</span>
//                   ) : (
//                     t("inProgress")
//                   )}{" "}
//                   • {t("score")}:{" "}
//                   <span style={{ color: "var(--primary-blue)" }}>{s.score_so_far}</span>
//                 </Typography>

//                 <Typography className={styles.rowTime}>
//                   {s.started_at ? formatTime(s.started_at) : "—"}
//                 </Typography>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       <Modal
//         title={t("modalActiveExamsTitle")}
//         open={isActiveExamModalOpen}
//         onCancel={() => setIsActiveExamModalOpen(false)}
//         footer={null}
//       >
//         <ul className={styles.activeExamsUl}>
//           {derived.activeSessions.map((s) => (
//             <li
//               className={styles.activeExamsList}
//               key={s.id}
//               onClick={() => onExamActiveClick(s.exam.id)}
//             >
//               {s.exam.title}
//             </li>
//           ))}
//         </ul>
//       </Modal>
//     </div>
//   );
// }











// "use client";

// import { useEffect, useMemo, useState, useCallback } from "react";
// import { usePathname, useRouter } from "next/navigation";

// import api from "@/interceptors";
// import styles from "./home.module.scss";

// import {
//   Avatar,
//   Chip,
//   CircularProgress,
//   Typography,
//   useMediaQuery,
// } from "@mui/material";
// import { Modal } from "antd";
// import { FaHome } from "react-icons/fa";

// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   ArcElement,
//   Tooltip,
//   Legend,
//   Filler,
//   type ChartOptions,
// } from "chart.js";
// import { Bar, Doughnut } from "react-chartjs-2";

// import { DashboardResponse } from "./interface";
// import { useTranslations } from "next-intl";

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   ArcElement,
//   Tooltip,
//   Legend,
//   Filler
// );

// const WEEK_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// function formatTime(iso: string) {
//   return new Date(iso).toLocaleTimeString([], {
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function formatDayShort(iso?: string | null) {
//   if (!iso) return "";
//   return new Date(iso).toLocaleDateString([], { weekday: "short" });
// }

// function clamp(n: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, n));
// }

// function getCssVar(name: string, fallback: string) {
//   if (typeof window === "undefined") return fallback;
//   return (
//     getComputedStyle(document.documentElement)
//       .getPropertyValue(name)
//       .trim() || fallback
//   );
// }

// export default function Home() {
//   const t = useTranslations("Home");
//   const router = useRouter();
//   const pathname = usePathname();

//   const isPhone = useMediaQuery("(max-width:600px)");
//   const isTablet = useMediaQuery("(max-width:900px)");

//   const [data, setData] = useState<DashboardResponse | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isActiveExamModalOpen, setIsActiveExamModalOpen] = useState(false);
//   const [themeVersion, setThemeVersion] = useState(0);

//   const locale = pathname?.split("/")[1] || "en";
//   const chartHeight = isPhone ? 220 : isTablet ? 260 : 300;

//   useEffect(() => {
//     let cancelled = false;

//     const loadDashboard = async () => {
//       try {
//         const res = await api.get<DashboardResponse | null>("/home/");
//         if (!cancelled) setData(res.data);
//       } catch (err) {
//         console.error("Dashboard error:", err);
//         if (!cancelled) setData(null);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     };

//     loadDashboard();

//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   useEffect(() => {
//     if (typeof window === "undefined") return;

//     const observer = new MutationObserver(() => {
//       setThemeVersion((prev) => prev + 1);
//     });

//     observer.observe(document.documentElement, {
//       attributes: true,
//       attributeFilter: ["data-theme"],
//     });

//     return () => observer.disconnect();
//   }, []);

//   const chartTheme = useMemo(
//     () => ({
//       text: getCssVar("--chart-axis-text", "#b8b8b8"),
//       strongText: getCssVar("--text-primary", "#f0f0f0"),
//       grid: getCssVar("--chart-grid", "rgba(255,255,255,0.10)"),
//       border: getCssVar("--chart-axis-border", "rgba(255,255,255,0.18)"),
//     }),
//     [themeVersion]
//   );

//   const sessions = data?.sessions ?? [];
//   const subjects = data?.subjects ?? [];
//   const subjectPoints = data?.subjectPoints ?? [];

//   const fullName =
//     `${data?.me?.first_name ?? ""} ${data?.me?.last_name ?? ""}`.trim() ||
//     t("fallbackUser");

//   const gradeText = (() => {
//     const g = data?.me?.grade_in;
//     if (!g) return t("noGrade");
//     return `${g.name}${g.category?.name ? ` – ${g.category.name}` : ""}`;
//   })();

//   const derived = useMemo(() => {
//     const now = Date.now();

//     const activeSessions = sessions.filter(
//       (s) => s.is_active && s.ends_at && new Date(s.ends_at).getTime() > now
//     );

//     const chartData = subjectPoints.map((x) => ({
//       name: x.subject.name,
//       points: x.points ?? 0,
//     }));

//     const finishedSessions = sessions.filter((s) => s.finished);
//     const total = sessions.length;
//     const finished = finishedSessions.length;

//     const completionPct =
//       total === 0 ? 0 : Math.round((finished / total) * 100);

//     const avgScore =
//       finished === 0
//         ? 0
//         : Math.round(
//             finishedSessions.reduce(
//               (sum, s) => sum + (s.score_so_far ?? 0),
//               0
//             ) / finished
//           );

//     const finishedSorted = [...finishedSessions].sort(
//       (a, b) =>
//         new Date(b.started_at ?? 0).getTime() -
//         new Date(a.started_at ?? 0).getTime()
//     );

//     const last7 = finishedSorted.slice(0, 7);
//     const prev7 = finishedSorted.slice(7, 14);

//     const lastAvg =
//       last7.length === 0
//         ? 0
//         : last7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
//           last7.length;

//     const prevAvg =
//       prev7.length === 0
//         ? 0
//         : prev7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
//           prev7.length;

//     const delta =
//       last7.length === 0 || prev7.length === 0
//         ? 0
//         : Math.round(lastAvg - prevAvg);

//     const weeklyMap = new Map<string, number>(WEEK_ORDER.map((d) => [d, 0]));
//     const subjectScoreMap = new Map<string, { total: number; count: number }>();
//     const examAttemptsMap = new Map<string, number>();

//     for (const s of sessions) {
//       const day = formatDayShort(s.started_at);
//       if (weeklyMap.has(day)) {
//         weeklyMap.set(day, (weeklyMap.get(day) ?? 0) + 1);
//       }

//       const examTitle = s.exam?.title ?? t("unknown");
//       examAttemptsMap.set(examTitle, (examAttemptsMap.get(examTitle) ?? 0) + 1);

//       if (s.finished) {
//         const subjectName = s.subject?.name ?? t("unknown");
//         const entry = subjectScoreMap.get(subjectName) ?? {
//           total: 0,
//           count: 0,
//         };
//         entry.total += s.score_so_far ?? 0;
//         entry.count += 1;
//         subjectScoreMap.set(subjectName, entry);
//       }
//     }

//     const weeklyActivityData = WEEK_ORDER.map((day) => ({
//       day,
//       sessions: weeklyMap.get(day) ?? 0,
//     }));

//     const avgScoreBySubjectData = Array.from(subjectScoreMap.entries())
//       .map(([name, v]) => ({
//         name,
//         avgScore: v.count === 0 ? 0 : Math.round(v.total / v.count),
//         attempts: v.count,
//       }))
//       .sort((a, b) => b.attempts - a.attempts)
//       .slice(0, 6);

//     const topExamsData = Array.from(examAttemptsMap.entries())
//       .map(([name, attempts]) => ({ name, attempts }))
//       .sort((a, b) => b.attempts - a.attempts)
//       .slice(0, 6);

//     return {
//       activeSessions,
//       chartData,
//       progressMetrics: {
//         total,
//         finished,
//         completionPct,
//         avgScore,
//         delta,
//       },
//       weeklyActivityData,
//       avgScoreBySubjectData,
//       topExamsData,
//     };
//   }, [sessions, subjectPoints, t]);

//   const onActiveExamClick = useCallback(() => {
//     if (derived.activeSessions.length) {
//       setIsActiveExamModalOpen(true);
//     }
//   }, [derived.activeSessions.length]);

//   const onExamActiveClick = useCallback(
//     (examId: number) => {
//       router.push(`/${locale}/exam/${examId}/start`);
//     },
//     [router, locale]
//   );

//   const barOptions = useMemo<ChartOptions<"bar">>(
//     () => ({
//       responsive: true,
//       maintainAspectRatio: false,
//       animation: {
//         duration: 1100,
//         easing: "easeOutQuart",
//         delay(context) {
//           return context.type === "data" ? context.dataIndex * 90 : 0;
//         },
//       },
//       transitions: {
//         active: {
//           animation: {
//             duration: 220,
//           },
//         },
//         show: {
//           animations: {
//             x: {
//               from: 0,
//             },
//             y: {
//               from: 0,
//             },
//           },
//         },
//       },
//       interaction: {
//         mode: "index",
//         intersect: false,
//       },
//       plugins: {
//         legend: {
//           display: false,
//           labels: { color: chartTheme.strongText },
//         },
//         tooltip: {
//           enabled: true,
//           backgroundColor: "rgba(15, 23, 42, 0.92)",
//           titleColor: "#ffffff",
//           bodyColor: "#e5e7eb",
//           borderColor: chartTheme.border,
//           borderWidth: 1,
//           padding: 12,
//           cornerRadius: 12,
//           displayColors: true,
//         },
//       },
//       scales: {
//         x: {
//           ticks: {
//             color: chartTheme.text,
//             maxRotation: 0,
//             autoSkip: true,
//           },
//           grid: {
//             color: chartTheme.grid,
//             drawBorder: false,
//           },
//           border: {
//             color: chartTheme.border,
//           },
//         },
//         y: {
//           ticks: {
//             color: chartTheme.text,
//           },
//           grid: {
//             color: chartTheme.grid,
//             drawBorder: false,
//           },
//           border: {
//             color: chartTheme.border,
//           },
//         },
//       },
//     }),
//     [chartTheme]
//   );

//   const doughnutOptions = useMemo<ChartOptions<"doughnut">>(
//     () => ({
//       responsive: true,
//       maintainAspectRatio: false,
//       animation: {
//         animateRotate: true,
//         animateScale: true,
//         duration: 1200,
//         easing: "easeOutExpo",
//       },
//       transitions: {
//         active: {
//           animation: {
//             duration: 220,
//           },
//         },
//       },
//       plugins: {
//         legend: {
//           display: false,
//           labels: { color: chartTheme.strongText },
//         },
//         tooltip: {
//           enabled: true,
//           backgroundColor: "rgba(15, 23, 42, 0.92)",
//           titleColor: "#ffffff",
//           bodyColor: "#e5e7eb",
//           borderColor: chartTheme.border,
//           borderWidth: 1,
//           padding: 12,
//           cornerRadius: 12,
//         },
//       },
//     }),
//     [chartTheme]
//   );

//   const pointsBySubjectBar = useMemo(
//     () => ({
//       labels: derived.chartData.map((d) => d.name),
//       datasets: [
//         {
//           label: t("pointsLabel"),
//           data: derived.chartData.map((d) => d.points),
//           backgroundColor: "rgba(59,130,246,0.70)",
//           borderColor: "rgba(96,165,250,1)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//           hoverBackgroundColor: "rgba(59,130,246,0.88)",
//           hoverBorderColor: "rgba(96,165,250,1)",
//           hoverBorderWidth: 2,
//         },
//       ],
//     }),
//     [derived.chartData, t]
//   );

//   const weeklyActivityBar = useMemo(
//     () => ({
//       labels: derived.weeklyActivityData.map((d) => d.day),
//       datasets: [
//         {
//           label: t("sessionsLabel"),
//           data: derived.weeklyActivityData.map((d) => d.sessions),
//           backgroundColor: "rgba(96,165,250,0.55)",
//           borderColor: "rgba(96,165,250,0.95)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//           hoverBackgroundColor: "rgba(96,165,250,0.78)",
//           hoverBorderColor: "rgba(96,165,250,1)",
//           hoverBorderWidth: 2,
//         },
//       ],
//     }),
//     [derived.weeklyActivityData, t]
//   );

//   const avgScoreBySubjectBar = useMemo(
//     () => ({
//       labels: derived.avgScoreBySubjectData.map((d) => d.name),
//       datasets: [
//         {
//           label: t("avgScoreLabel"),
//           data: derived.avgScoreBySubjectData.map((d) => d.avgScore),
//           backgroundColor: "rgba(243, 0, 194, 0.41)",
//           borderColor: "rgba(243, 0, 194, 0.88)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//           hoverBackgroundColor: "rgba(243, 0, 194, 0.62)",
//           hoverBorderColor: "rgba(243, 0, 194, 1)",
//           hoverBorderWidth: 2,
//         },
//       ],
//     }),
//     [derived.avgScoreBySubjectData, t]
//   );

//   const topExamsBar = useMemo(
//     () => ({
//       labels: derived.topExamsData.map((d) => d.name),
//       datasets: [
//         {
//           label: t("attemptsLabel"),
//           data: derived.topExamsData.map((d) => d.attempts),
//           backgroundColor: "rgba(250,173,20,0.55)",
//           borderColor: "rgba(250,173,20,0.95)",
//           borderWidth: 1.5,
//           borderRadius: 10,
//           hoverBackgroundColor: "rgba(250,173,20,0.78)",
//           hoverBorderColor: "rgba(250,173,20,1)",
//           hoverBorderWidth: 2,
//         },
//       ],
//     }),
//     [derived.topExamsData, t]
//   );

//   const completionDoughnut = useMemo(() => {
//     const done = clamp(derived.progressMetrics.completionPct, 0, 100);

//     return {
//       labels: [t("done"), t("remaining")],
//       datasets: [
//         {
//           data: [done, 100 - done],
//           backgroundColor: [
//             "rgba(34,197,94,0.80)",
//             "rgba(148,163,184,0.20)",
//           ],
//           borderColor: [
//             "rgba(34,197,94,0.95)",
//             "rgba(148,163,184,0.55)",
//           ],
//           borderWidth: 2,
//           cutout: "72%",
//           hoverOffset: 8,
//         },
//       ],
//     };
//   }, [derived.progressMetrics.completionPct, t]);

//   if (loading) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.center}>
//           <CircularProgress />
//           <Typography sx={{ mt: 2 }}>{t("loading")}</Typography>
//         </div>
//       </div>
//     );
//   }

//   if (!data) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.center}>
//           <Typography variant="h6">{t("failedTitle")}</Typography>
//           <Typography className={styles.muted}>{t("failedHint")}</Typography>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.page}>
//       <div className={styles.WrapperOfMainCaptionAndIcon}>
//         <span className={styles.headerIcon}>
//           <FaHome className={styles.navIcon} />
//         </span>
//         <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//       </div>

//       <div className={styles.header}>
//         <div className={styles.profile}>
//           <Avatar
//             src={data.me.profilePic ?? undefined}
//             className={styles.avatar}
//             sx={{ width: 60, height: 60 }}
//           />
//           <div className={styles.profileText}>
//             <Typography className={styles.title}>
//               {t("welcome")}, <u>{fullName}</u> 👋
//             </Typography>

//             <div className={styles.subRow}>
//               <span className={styles.preCaptions}>{t("role")}:</span>
//               <Chip
//                 size="small"
//                 label={data.me.role ?? t("roleFallback")}
//                 sx={{ backgroundColor: "#2d5899", color: "#fff" }}
//               />

//               {data.me.grade_in && (
//                 <>
//                   <span className={styles.preCaptions}>{t("grade")}:</span>
//                   <Chip
//                     size="small"
//                     variant="outlined"
//                     label={gradeText}
//                     sx={{ borderColor: "#ff6af5c4", color: "#ff6af5c4" }}
//                   />
//                 </>
//               )}

//               <span className={styles.preCaptions}>{t("email")}:</span>
//               <Typography className={styles.muted}>
//                 <u>{data.me.email}</u>
//               </Typography>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid3}>
//         <div className={styles.card}>
//           <Typography className={styles.cardLabel}>{t("totalPoints")}</Typography>
//           <Typography className={styles.cardValue}>{data.me.points ?? 0}</Typography>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.cardLabel}>{t("subjects")}</Typography>
//           <Typography className={styles.cardValue}>{subjects.length}</Typography>
//         </div>

//         <div
//           className={`${styles.card} ${styles.cardClickable}`}
//           onClick={onActiveExamClick}
//         >
//           <Typography className={styles.cardLabel}>{t("activeExams")}</Typography>
//           <Typography className={styles.cardValue}>
//             {derived.activeSessions.length}
//           </Typography>
//         </div>
//       </div>

//       <div className={styles.grid2}>
//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("pointsBySubject")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {derived.chartData.length === 0 ? (
//               <Typography className={styles.muted}>{t("noPointsYet")}</Typography>
//             ) : (
//               <Bar
//                 key={`points-${themeVersion}`}
//                 data={pointsBySubjectBar}
//                 options={barOptions}
//               />
//             )}
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("progressOverview")}</Typography>

//           <div className={styles.chartBox} style={{ height: chartHeight, position: "relative" }}>
//             <Doughnut
//               key={`progress-${themeVersion}`}
//               data={completionDoughnut}
//               options={doughnutOptions}
//             />
//             <div className={styles.gaugeCenter}>
//               <Typography className={styles.gaugePct}>
//                 {derived.progressMetrics.completionPct}%
//               </Typography>
//               <Typography className={styles.gaugeSub}>
//                 {t("completion")} •{" "}
//                 {t("avgScoreText", { avg: derived.progressMetrics.avgScore })}
//               </Typography>

//               <Typography
//                 className={styles.gaugeDelta}
//                 style={{
//                   color:
//                     derived.progressMetrics.delta >= 0 ? "#22c55e" : "#ef4444",
//                 }}
//               >
//                 {derived.progressMetrics.delta >= 0
//                   ? t("deltaUp", { delta: derived.progressMetrics.delta })
//                   : t("deltaDown", { delta: derived.progressMetrics.delta })}
//               </Typography>
//             </div>
//           </div>

//           <div className={styles.badgeRow}>
//             <Chip
//               size="small"
//               style={{ color: "var(--text-primary)" }}
//               label={t("finishedBadge", {
//                 finished: derived.progressMetrics.finished,
//                 total: derived.progressMetrics.total,
//               })}
//             />
//             <Chip
//               size="small"
//               style={{ color: "var(--text-primary)" }}
//               label={t("activeBadge", { active: derived.activeSessions.length })}
//             />
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid3}>
//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("topExamsAttempts")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {derived.topExamsData.length === 0 ? (
//               <Typography className={styles.muted}>{t("noAttemptsYet")}</Typography>
//             ) : (
//               <Bar
//                 key={`top-exams-${themeVersion}`}
//                 data={topExamsBar}
//                 options={barOptions}
//               />
//             )}
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("weeklyActivity")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             <Bar
//               key={`weekly-${themeVersion}`}
//               data={weeklyActivityBar}
//               options={barOptions}
//             />
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>{t("avgScoreBySubject")}</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {derived.avgScoreBySubjectData.length === 0 ? (
//               <Typography className={styles.muted}>{t("noFinishedYet")}</Typography>
//             ) : (
//               <Bar
//                 key={`avg-score-${themeVersion}`}
//                 data={avgScoreBySubjectBar}
//                 options={barOptions}
//               />
//             )}
//           </div>
//         </div>
//       </div>

//       <div
//         className={styles.grid2}
//         style={{ display: "flex", flexDirection: "column" }}
//       >
//         <div
//           className={styles.card}
//           style={{ display: "flex", flexDirection: "column", gap: "10px" }}
//         >
//           <Typography className={styles.sectionTitle}>{t("activeExamSessions")}</Typography>

//           {derived.activeSessions.length === 0 ? (
//             <Typography className={styles.muted}>{t("noActiveExams")}</Typography>
//           ) : (
//             <div className={styles.list}>
//               {derived.activeSessions.map((s) => (
//                 <div
//                   key={s.id}
//                   className={styles.listItem}
//                   style={{ boxShadow: "none" }}
//                 >
//                   <div className={styles.listTop}>
//                     <Typography
//                       className={styles.listTitle}
//                       title={s.exam.title}
//                       sx={{ color: "var(--text-strong)" }}
//                     >
//                       {s.exam.title}
//                     </Typography>

//                     <Chip
//                       size="small"
//                       label={s.subject.name}
//                       sx={{
//                         backgroundColor: "#0B1220",
//                         color: "#faad14",
//                         border: "1px solid #1E293B",
//                       }}
//                     />
//                   </div>

//                   <Typography className={styles.muted}>
//                     {t("ends")}:{" "}
//                     <span style={{ color: "orange" }}>
//                       {s.ends_at ? formatTime(s.ends_at) : "—"}
//                     </span>{" "}
//                     • {t("score")}:{" "}
//                     <span style={{ color: "#22c55e" }}>{s.score_so_far}</span>
//                   </Typography>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       <div
//         className={styles.card}
//         style={{ display: "flex", flexDirection: "column", gap: "10px" }}
//       >
//         <Typography className={styles.sectionTitle}>{t("recentExamSessions")}</Typography>

//         {sessions.length === 0 ? (
//           <Typography className={styles.muted}>{t("noSessionsYet")}</Typography>
//         ) : (
//           <div className={styles.table}>
//             {sessions.slice(0, 8).map((s) => (
//               <div key={s.id} className={styles.row}>
//                 <Typography className={styles.rowMain} title={s.exam.title}>
//                   <u>{s.exam.title}</u>
//                 </Typography>

//                 <Typography className={styles.rowMeta}>
//                   {s.subject.name} •{" "}
//                   {s.finished ? (
//                     <span style={{ color: "var(--primary-blue)" }}>
//                       {t("finished")}
//                     </span>
//                   ) : (
//                     t("inProgress")
//                   )}{" "}
//                   • {t("score")}:{" "}
//                   <span style={{ color: "var(--primary-blue)" }}>
//                     {s.score_so_far}
//                   </span>
//                 </Typography>

//                 <Typography className={styles.rowTime}>
//                   {s.started_at ? formatTime(s.started_at) : "—"}
//                 </Typography>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       <Modal
//         title={t("modalActiveExamsTitle")}
//         open={isActiveExamModalOpen}
//         onCancel={() => setIsActiveExamModalOpen(false)}
//         footer={null}
//       >
//         <ul className={styles.activeExamsUl}>
//           {derived.activeSessions.map((s) => (
//             <li
//               className={styles.activeExamsList}
//               key={s.id}
//               onClick={() => onExamActiveClick(s.exam.id)}
//             >
//               {s.exam.title}
//             </li>
//           ))}
//         </ul>
//       </Modal>
//     </div>
//   );
// }














"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import api from "@/interceptors";
import styles from "./home.module.scss";

import {
  Avatar,
  Chip,
  CircularProgress,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Modal } from "antd";
import { FaHome } from "react-icons/fa";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

import { DashboardResponse } from "./interface";
import { useTranslations } from "next-intl";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const WEEK_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayShort(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { weekday: "short" });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim() || fallback
  );
}

export default function Home() {
  const t = useTranslations("Home");
  const router = useRouter();
  const pathname = usePathname();

  const isPhone = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:900px)");

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActiveExamModalOpen, setIsActiveExamModalOpen] = useState(false);
  const [themeVersion, setThemeVersion] = useState(0);
  const [chartsReady, setChartsReady] = useState(false);

  const locale = pathname?.split("/")[1] || "en";
  const chartHeight = isPhone ? 220 : isTablet ? 260 : 300;

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const res = await api.get<DashboardResponse | null>("/home/");
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error("Dashboard error:", err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new MutationObserver(() => {
      setThemeVersion((prev) => prev + 1);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (loading || !data) {
      setChartsReady(false);
      return;
    }

    let raf1 = 0;
    let raf2 = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    setChartsReady(false);

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        timer = setTimeout(() => {
          setChartsReady(true);
        }, 80);
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      if (timer) clearTimeout(timer);
    };
  }, [loading, data, themeVersion]);

  const chartTheme = useMemo(
    () => ({
      text: getCssVar("--chart-axis-text", "#b8b8b8"),
      strongText: getCssVar("--text-primary", "#f0f0f0"),
      grid: getCssVar("--chart-grid", "rgba(255,255,255,0.10)"),
      border: getCssVar("--chart-axis-border", "rgba(255,255,255,0.18)"),
    }),
    [themeVersion]
  );

  const sessions = data?.sessions ?? [];
  const subjects = data?.subjects ?? [];
  const subjectPoints = data?.subjectPoints ?? [];

  const fullName =
    `${data?.me?.first_name ?? ""} ${data?.me?.last_name ?? ""}`.trim() ||
    t("fallbackUser");

  const gradeText = (() => {
    const g = data?.me?.grade_in;
    if (!g) return t("noGrade");
    return `${g.name}${g.category?.name ? ` – ${g.category.name}` : ""}`;
  })();

  const derived = useMemo(() => {
    const now = Date.now();

    const activeSessions = sessions.filter(
      (s) => s.is_active && s.ends_at && new Date(s.ends_at).getTime() > now
    );

    const chartData = subjectPoints.map((x) => ({
      name: x.subject.name,
      points: x.points ?? 0,
    }));

    const finishedSessions = sessions.filter((s) => s.finished);
    const total = sessions.length;
    const finished = finishedSessions.length;

    const completionPct =
      total === 0 ? 0 : Math.round((finished / total) * 100);

    const avgScore =
      finished === 0
        ? 0
        : Math.round(
            finishedSessions.reduce(
              (sum, s) => sum + (s.score_so_far ?? 0),
              0
            ) / finished
          );

    const finishedSorted = [...finishedSessions].sort(
      (a, b) =>
        new Date(b.started_at ?? 0).getTime() -
        new Date(a.started_at ?? 0).getTime()
    );

    const last7 = finishedSorted.slice(0, 7);
    const prev7 = finishedSorted.slice(7, 14);

    const lastAvg =
      last7.length === 0
        ? 0
        : last7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
          last7.length;

    const prevAvg =
      prev7.length === 0
        ? 0
        : prev7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
          prev7.length;

    const delta =
      last7.length === 0 || prev7.length === 0
        ? 0
        : Math.round(lastAvg - prevAvg);

    const weeklyMap = new Map<string, number>(WEEK_ORDER.map((d) => [d, 0]));
    const subjectScoreMap = new Map<string, { total: number; count: number }>();
    const examAttemptsMap = new Map<string, number>();

    for (const s of sessions) {
      const day = formatDayShort(s.started_at);
      if (weeklyMap.has(day)) {
        weeklyMap.set(day, (weeklyMap.get(day) ?? 0) + 1);
      }

      const examTitle = s.exam?.title ?? t("unknown");
      examAttemptsMap.set(examTitle, (examAttemptsMap.get(examTitle) ?? 0) + 1);

      if (s.finished) {
        const subjectName = s.subject?.name ?? t("unknown");
        const entry = subjectScoreMap.get(subjectName) ?? {
          total: 0,
          count: 0,
        };
        entry.total += s.score_so_far ?? 0;
        entry.count += 1;
        subjectScoreMap.set(subjectName, entry);
      }
    }

    const weeklyActivityData = WEEK_ORDER.map((day) => ({
      day,
      sessions: weeklyMap.get(day) ?? 0,
    }));

    const avgScoreBySubjectData = Array.from(subjectScoreMap.entries())
      .map(([name, v]) => ({
        name,
        avgScore: v.count === 0 ? 0 : Math.round(v.total / v.count),
        attempts: v.count,
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6);

    const topExamsData = Array.from(examAttemptsMap.entries())
      .map(([name, attempts]) => ({ name, attempts }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6);

    return {
      activeSessions,
      chartData,
      progressMetrics: {
        total,
        finished,
        completionPct,
        avgScore,
        delta,
      },
      weeklyActivityData,
      avgScoreBySubjectData,
      topExamsData,
    };
  }, [sessions, subjectPoints, t]);

  const onActiveExamClick = useCallback(() => {
    if (derived.activeSessions.length) {
      setIsActiveExamModalOpen(true);
    }
  }, [derived.activeSessions.length]);

  const onExamActiveClick = useCallback(
    (examId: number) => {
      router.push(`/${locale}/exam/${examId}/start`);
    },
    [router, locale]
  );

  const barOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 180,
      animation: {
        duration: 1100,
        easing: "easeOutQuart",
        delay(context) {
          return context.type === "data" ? context.dataIndex * 90 : 0;
        },
      },
      transitions: {
        active: {
          animation: {
            duration: 220,
          },
        },
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
          labels: { color: chartTheme.strongText },
        },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleColor: "#ffffff",
          bodyColor: "#e5e7eb",
          borderColor: chartTheme.border,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          displayColors: true,
        },
      },
      scales: {
        x: {
          ticks: {
            color: chartTheme.text,
            maxRotation: 0,
            autoSkip: true,
          },
          grid: {
            color: chartTheme.grid,
            drawBorder: false,
          },
          border: {
            color: chartTheme.border,
          },
        },
        y: {
          ticks: {
            color: chartTheme.text,
          },
          grid: {
            color: chartTheme.grid,
            drawBorder: false,
          },
          border: {
            color: chartTheme.border,
          },
        },
      },
    }),
    [chartTheme]
  );

  const doughnutOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 180,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1200,
        easing: "easeOutExpo",
      },
      transitions: {
        active: {
          animation: {
            duration: 220,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
          labels: { color: chartTheme.strongText },
        },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleColor: "#ffffff",
          bodyColor: "#e5e7eb",
          borderColor: chartTheme.border,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
        },
      },
    }),
    [chartTheme]
  );

  const pointsBySubjectBar = useMemo(
    () => ({
      labels: derived.chartData.map((d) => d.name),
      datasets: [
        {
          label: t("pointsLabel"),
          data: derived.chartData.map((d) => d.points),
          backgroundColor: "rgba(59,130,246,0.70)",
          borderColor: "rgba(96,165,250,1)",
          borderWidth: 1.5,
          borderRadius: 10,
          hoverBackgroundColor: "rgba(59,130,246,0.88)",
          hoverBorderColor: "rgba(96,165,250,1)",
          hoverBorderWidth: 2,
        },
      ],
    }),
    [derived.chartData, t]
  );

  const weeklyActivityBar = useMemo(
    () => ({
      labels: derived.weeklyActivityData.map((d) => d.day),
      datasets: [
        {
          label: t("sessionsLabel"),
          data: derived.weeklyActivityData.map((d) => d.sessions),
          backgroundColor: "rgba(96,165,250,0.55)",
          borderColor: "rgba(96,165,250,0.95)",
          borderWidth: 1.5,
          borderRadius: 10,
          hoverBackgroundColor: "rgba(96,165,250,0.78)",
          hoverBorderColor: "rgba(96,165,250,1)",
          hoverBorderWidth: 2,
        },
      ],
    }),
    [derived.weeklyActivityData, t]
  );

  const avgScoreBySubjectBar = useMemo(
    () => ({
      labels: derived.avgScoreBySubjectData.map((d) => d.name),
      datasets: [
        {
          label: t("avgScoreLabel"),
          data: derived.avgScoreBySubjectData.map((d) => d.avgScore),
          backgroundColor: "rgba(243, 0, 194, 0.41)",
          borderColor: "rgba(243, 0, 194, 0.88)",
          borderWidth: 1.5,
          borderRadius: 10,
          hoverBackgroundColor: "rgba(243, 0, 194, 0.62)",
          hoverBorderColor: "rgba(243, 0, 194, 1)",
          hoverBorderWidth: 2,
        },
      ],
    }),
    [derived.avgScoreBySubjectData, t]
  );

  const topExamsBar = useMemo(
    () => ({
      labels: derived.topExamsData.map((d) => d.name),
      datasets: [
        {
          label: t("attemptsLabel"),
          data: derived.topExamsData.map((d) => d.attempts),
          backgroundColor: "rgba(250,173,20,0.55)",
          borderColor: "rgba(250,173,20,0.95)",
          borderWidth: 1.5,
          borderRadius: 10,
          hoverBackgroundColor: "rgba(250,173,20,0.78)",
          hoverBorderColor: "rgba(250,173,20,1)",
          hoverBorderWidth: 2,
        },
      ],
    }),
    [derived.topExamsData, t]
  );

  const completionDoughnut = useMemo(() => {
    const done = clamp(derived.progressMetrics.completionPct, 0, 100);

    return {
      labels: [t("done"), t("remaining")],
      datasets: [
        {
          data: [done, 100 - done],
          backgroundColor: [
            "rgba(34,197,94,0.80)",
            "rgba(148,163,184,0.20)",
          ],
          borderColor: [
            "rgba(34,197,94,0.95)",
            "rgba(148,163,184,0.55)",
          ],
          borderWidth: 2,
          cutout: "72%",
          hoverOffset: 8,
        },
      ],
    };
  }, [derived.progressMetrics.completionPct, t]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>{t("loading")}</Typography>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <Typography variant="h6">{t("failedTitle")}</Typography>
          <Typography className={styles.muted}>{t("failedHint")}</Typography>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.WrapperOfMainCaptionAndIcon}>
        <span className={styles.headerIcon}>
          <FaHome className={styles.navIcon} />
        </span>
        <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
      </div>

      <div className={styles.header}>
        <div className={styles.profile}>
          <Avatar
            src={data.me.profilePic ?? undefined}
            className={styles.avatar}
            sx={{ width: 60, height: 60 }}
          />
          <div className={styles.profileText}>
            <Typography className={styles.title}>
              {t("welcome")}, <u>{fullName}</u> 👋
            </Typography>

            <div className={styles.subRow}>
              <span className={styles.preCaptions}>{t("role")}:</span>
              <Chip
                size="small"
                label={data.me.role ?? t("roleFallback")}
                sx={{ backgroundColor: "#2d5899", color: "#fff" }}
              />

              {data.me.grade_in && (
                <>
                  <span className={styles.preCaptions}>{t("grade")}:</span>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={gradeText}
                    sx={{ borderColor: "#ff6af5c4", color: "#ff6af5c4" }}
                  />
                </>
              )}

              <span className={styles.preCaptions}>{t("email")}:</span>
              <Typography className={styles.muted}>
                <u>{data.me.email}</u>
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.grid3}>
        <div className={styles.card}>
          <Typography className={styles.cardLabel}>{t("totalPoints")}</Typography>
          <Typography className={styles.cardValue}>{data.me.points ?? 0}</Typography>
        </div>

        <div className={styles.card}>
          <Typography className={styles.cardLabel}>{t("subjects")}</Typography>
          <Typography className={styles.cardValue}>{subjects.length}</Typography>
        </div>

        <div
          className={`${styles.card} ${styles.cardClickable}`}
          onClick={onActiveExamClick}
        >
          <Typography className={styles.cardLabel}>{t("activeExams")}</Typography>
          <Typography className={styles.cardValue}>
            {derived.activeSessions.length}
          </Typography>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("pointsBySubject")}</Typography>
          <div className={styles.chartBox} style={{ height: chartHeight }}>
            {derived.chartData.length === 0 ? (
              <Typography className={styles.muted}>{t("noPointsYet")}</Typography>
            ) : chartsReady ? (
              <Bar
                key={`points-${themeVersion}`}
                data={pointsBySubjectBar}
                options={barOptions}
              />
            ) : null}
          </div>
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("progressOverview")}</Typography>

          <div className={styles.chartBox} style={{ height: chartHeight, position: "relative" }}>
            {chartsReady ? (
              <Doughnut
                key={`progress-${themeVersion}`}
                data={completionDoughnut}
                options={doughnutOptions}
              />
            ) : null}

            <div className={styles.gaugeCenter}>
              <Typography className={styles.gaugePct}>
                {derived.progressMetrics.completionPct}%
              </Typography>
              <Typography className={styles.gaugeSub}>
                {t("completion")} •{" "}
                {t("avgScoreText", { avg: derived.progressMetrics.avgScore })}
              </Typography>

              <Typography
                className={styles.gaugeDelta}
                style={{
                  color:
                    derived.progressMetrics.delta >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {derived.progressMetrics.delta >= 0
                  ? t("deltaUp", { delta: derived.progressMetrics.delta })
                  : t("deltaDown", { delta: derived.progressMetrics.delta })}
              </Typography>
            </div>
          </div>

          <div className={styles.badgeRow}>
            <Chip
              size="small"
              style={{ color: "var(--text-primary)" }}
              label={t("finishedBadge", {
                finished: derived.progressMetrics.finished,
                total: derived.progressMetrics.total,
              })}
            />
            <Chip
              size="small"
              style={{ color: "var(--text-primary)" }}
              label={t("activeBadge", { active: derived.activeSessions.length })}
            />
          </div>
        </div>
      </div>

      <div className={styles.grid3}>
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("topExamsAttempts")}</Typography>
          <div className={styles.chartBox} style={{ height: chartHeight }}>
            {derived.topExamsData.length === 0 ? (
              <Typography className={styles.muted}>{t("noAttemptsYet")}</Typography>
            ) : chartsReady ? (
              <Bar
                key={`top-exams-${themeVersion}`}
                data={topExamsBar}
                options={barOptions}
              />
            ) : null}
          </div>
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("weeklyActivity")}</Typography>
          <div className={styles.chartBox} style={{ height: chartHeight }}>
            {chartsReady ? (
              <Bar
                key={`weekly-${themeVersion}`}
                data={weeklyActivityBar}
                options={barOptions}
              />
            ) : null}
          </div>
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("avgScoreBySubject")}</Typography>
          <div className={styles.chartBox} style={{ height: chartHeight }}>
            {derived.avgScoreBySubjectData.length === 0 ? (
              <Typography className={styles.muted}>{t("noFinishedYet")}</Typography>
            ) : chartsReady ? (
              <Bar
                key={`avg-score-${themeVersion}`}
                data={avgScoreBySubjectBar}
                options={barOptions}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={styles.grid2}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <div
          className={styles.card}
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <Typography className={styles.sectionTitle}>{t("activeExamSessions")}</Typography>

          {derived.activeSessions.length === 0 ? (
            <Typography className={styles.muted}>{t("noActiveExams")}</Typography>
          ) : (
            <div className={styles.list}>
              {derived.activeSessions.map((s) => (
                <div
                  key={s.id}
                  className={styles.listItem}
                  style={{ boxShadow: "none" }}
                >
                  <div className={styles.listTop}>
                    <Typography
                      className={styles.listTitle}
                      title={s.exam.title}
                      sx={{ color: "var(--text-strong)" }}
                    >
                      {s.exam.title}
                    </Typography>

                    <Chip
                      size="small"
                      label={s.subject.name}
                      sx={{
                        backgroundColor: "#0B1220",
                        color: "#faad14",
                        border: "1px solid #1E293B",
                      }}
                    />
                  </div>

                  <Typography className={styles.muted}>
                    {t("ends")}:{" "}
                    <span style={{ color: "orange" }}>
                      {s.ends_at ? formatTime(s.ends_at) : "—"}
                    </span>{" "}
                    • {t("score")}:{" "}
                    <span style={{ color: "#22c55e" }}>{s.score_so_far}</span>
                  </Typography>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className={styles.card}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <Typography className={styles.sectionTitle}>{t("recentExamSessions")}</Typography>

        {sessions.length === 0 ? (
          <Typography className={styles.muted}>{t("noSessionsYet")}</Typography>
        ) : (
          <div className={styles.table}>
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className={styles.row}>
                <Typography className={styles.rowMain} title={s.exam.title}>
                  <u>{s.exam.title}</u>
                </Typography>

                <Typography className={styles.rowMeta}>
                  {s.subject.name} •{" "}
                  {s.finished ? (
                    <span style={{ color: "var(--primary-blue)" }}>
                      {t("finished")}
                    </span>
                  ) : (
                    t("inProgress")
                  )}{" "}
                  • {t("score")}:{" "}
                  <span style={{ color: "var(--primary-blue)" }}>
                    {s.score_so_far}
                  </span>
                </Typography>

                <Typography className={styles.rowTime}>
                  {s.started_at ? formatTime(s.started_at) : "—"}
                </Typography>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        title={t("modalActiveExamsTitle")}
        open={isActiveExamModalOpen}
        onCancel={() => setIsActiveExamModalOpen(false)}
        footer={null}
      >
        <ul className={styles.activeExamsUl}>
          {derived.activeSessions.map((s) => (
            <li
              className={styles.activeExamsList}
              key={s.id}
              onClick={() => onExamActiveClick(s.exam.id)}
            >
              {s.exam.title}
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}