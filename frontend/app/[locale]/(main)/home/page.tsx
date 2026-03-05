// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";

// import api from "@/interceptors";
// import styles from "./home.module.scss";

// import { Avatar, Chip, CircularProgress, Typography, useMediaQuery } from "@mui/material";
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

// import { DashboardResponse, PointsTrendItem } from "./interface";

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
//   const isPhone = useMediaQuery("(max-width:600px)");
//   const isTablet = useMediaQuery("(max-width:900px)");
//   const router = useRouter();

//   const [data, setData] = useState<DashboardResponse | null>(null);
//   const [loading, setLoading] = useState(true);

//   const [isActiveExamModalOpen, setIsActiveExamModalOpen] = useState(false);

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

//   const fullName = useMemo(() => {
//     const fn = data?.me?.first_name ?? "";
//     const ln = data?.me?.last_name ?? "";
//     return `${fn} ${ln}`.trim() || "User";
//   }, [data]);

//   const gradeText = useMemo(() => {
//     const g = data?.me?.grade_in;
//     if (!g) return "No grade";
//     const cat = g.category?.name ? ` – ${g.category.name}` : "";
//     return `${g.name}${cat}`;
//   }, [data]);

//   const sessions = useMemo(() => data?.sessions ?? [], [data]);

//   const activeSessions = useMemo(() => {
//     const now = new Date();
//     return sessions.filter((s) => s.is_active && s.ends_at && new Date(s.ends_at) > now);
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
//           finishedSessions.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) / finished
//         );

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
//         : last7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) / last7.length;

//     const prevAvg =
//       prev7.length === 0
//         ? 0
//         : prev7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) / prev7.length;

//     const delta =
//       last7.length === 0 || prev7.length === 0 ? 0 : Math.round(lastAvg - prevAvg);

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
//       const name = s.subject?.name ?? "Unknown";
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
//   }, [sessions]);

//   const topExamsData = useMemo(() => {
//     const map = new Map<string, number>();
//     for (const s of sessions) {
//       const title = s.exam?.title ?? "Unknown";
//       map.set(title, (map.get(title) ?? 0) + 1);
//     }

//     return Array.from(map.entries())
//       .map(([name, attempts]) => ({ name, attempts }))
//       .sort((a, b) => b.attempts - a.attempts)
//       .slice(0, 6);
//   }, [sessions]);

//   const chartHeight = isPhone ? 220 : isTablet ? 260 : 300;

//   const onActiveExamClick = () => {
//     if (activeSessions.length) setIsActiveExamModalOpen(true);
//   };

//   const barOptions = useMemo<ChartOptions<"bar">>(
//     () => ({
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: { legend: { display: false }, tooltip: { enabled: true } },
//       scales: {
//         x: { ticks: { maxRotation: 0, autoSkip: true } },
//         y: {},
//       },
//     }),
//     []
//   );

//   const pointsBySubjectBar = useMemo(
//     () => ({
//       labels: chartData.map((d) => d.name),
//       datasets: [
//         {
//           label: "Points",
//           data: chartData.map((d) => d.points),
//           backgroundColor: "rgba(59,130,246,0.70)",
//           borderColor: "rgba(59,130,246,0.95)",
//           borderWidth: 1,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [chartData]
//   );


//   const weeklyActivityBar = useMemo(
//     () => ({
//       labels: weeklyActivityData.map((d) => d.day),
//       datasets: [
//         {
//           label: "Sessions",
//           data: weeklyActivityData.map((d) => d.sessions),
//           backgroundColor: "rgba(96,165,250,0.55)",
//           borderColor: "rgba(96,165,250,0.85)",
//           borderWidth: 1,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [weeklyActivityData]
//   );

//   const avgScoreBySubjectBar = useMemo(
//     () => ({
//       labels: avgScoreBySubjectData.map((d) => d.name),
//       datasets: [
//         {
//           label: "Avg Score",
//           data: avgScoreBySubjectData.map((d) => d.avgScore),
//           backgroundColor: "rgba(243, 0, 194, 0.41)",
//           borderColor: "rgba(243, 0, 194, 0.72)",
//           borderWidth: 1,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [avgScoreBySubjectData]
//   );

//   const topExamsBar = useMemo(
//     () => ({
//       labels: topExamsData.map((d) => d.name),
//       datasets: [
//         {
//           label: "Attempts",
//           data: topExamsData.map((d) => d.attempts),
//           backgroundColor: "rgba(250,173,20,0.55)",
//           borderColor: "rgba(250,173,20,0.9)",
//           borderWidth: 1,
//           borderRadius: 10,
//         },
//       ],
//     }),
//     [topExamsData]
//   );

//   const completionDoughnut = useMemo(() => {
//     const done = clamp(progressMetrics.completionPct, 0, 100);
//     return {
//       labels: ["Done", "Remaining"],
//       datasets: [
//         {
//           data: [done, 100 - done],
//           backgroundColor: ["rgba(34,197,94,0.80)", "rgba(148,163,184,0.20)"],
//           borderColor: ["rgba(34,197,94,0.95)", "rgba(255,255,255,0.08)"],
//           borderWidth: 1,
//           cutout: "72%",
//         },
//       ],
//     };
//   }, [progressMetrics.completionPct]);

//   const doughnutOptions = useMemo(
//     () => ({
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: { legend: { display: false }, tooltip: { enabled: true } },
//     }),
//     []
//   );

//   const onExamActiveClick = (examId: number) => {
//     router.push(`/exam/${examId}/start`);
//   };

//   if (loading) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.center}>
//           <CircularProgress />
//           <Typography sx={{ mt: 2 }}>Loading dashboard…</Typography>
//         </div>
//       </div>
//     );
//   }

//   if (!data) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.center}>
//           <Typography variant="h6">Failed to load dashboard</Typography>
//           <Typography className={styles.muted}>Check token / API URL / console.</Typography>
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
//         <h1 className={styles.pageMainCaptionStyle}>Home</h1>
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
//               Welcome, <u>{fullName}</u> 👋
//             </Typography>

//             <div className={styles.subRow}>
//               <span className={styles.preCaptions}>Role:</span>
//               <Chip size="small" label={data.me.role ?? "role"} sx={{ backgroundColor: "#2d5899", color: "#fff" }} />
//               <span className={styles.preCaptions}>Grade:</span>
//               <Chip size="small" variant="outlined" label={gradeText} sx={{ borderColor: "#af3a75", color: "#fff" }} />
//               <span className={styles.preCaptions}>Email:</span>
//               <Typography className={styles.muted}>{data.me.email}</Typography>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid3}>
//         <div className={styles.card}>
//           <Typography className={styles.cardLabel}>Total Points</Typography>
//           <Typography className={styles.cardValue}>{data.me.points ?? 0}</Typography>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.cardLabel}>Subjects</Typography>
//           <Typography className={styles.cardValue}>{data.subjects?.length ?? 0}</Typography>
//         </div>

//         <div className={`${styles.card} ${styles.cardClickable}`} onClick={onActiveExamClick}>
//           <Typography className={styles.cardLabel}>Active Exams</Typography>
//           <Typography className={styles.cardValue}>{activeSessions.length}</Typography>
//         </div>
//       </div>

//       <div className={styles.grid2} >
//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>Points by Subject</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {chartData.length === 0 ? (
//               <Typography className={styles.muted}>No points yet.</Typography>
//             ) : (
//               <Bar data={pointsBySubjectBar} options={barOptions} />
//             )}
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>Progress Overview</Typography>

//           <div className={styles.chartBox} style={{ height: chartHeight, position: "relative" }}>
//             <Doughnut data={completionDoughnut} options={doughnutOptions} />
//             <div className={styles.gaugeCenter}>
//               <Typography className={styles.gaugePct}>{progressMetrics.completionPct}%</Typography>
//               <Typography className={styles.gaugeSub}>
//                 Completion • Avg score {progressMetrics.avgScore}
//               </Typography>
//               <Typography
//                 className={styles.gaugeDelta}
//                 style={{ color: progressMetrics.delta >= 0 ? "#22c55e" : "#ef4444" }}
//               >
//                 {progressMetrics.delta >= 0
//                   ? `▲ +${progressMetrics.delta} vs previous`
//                   : `▼ ${progressMetrics.delta} vs previous`}
//               </Typography>
//             </div>
//           </div>

//           <div className={styles.badgeRow}>
//             <Chip size="small" style={{ color: "white" }} label={`Finished: ${progressMetrics.finished}/${progressMetrics.total}`} />
//             <Chip size="small" style={{ color: "white" }} label={`Active: ${activeSessions.length}`} />
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid3}>
//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>Top Exams (Attempts)</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {topExamsData.length === 0 ? (
//               <Typography className={styles.muted}>No attempts yet.</Typography>
//             ) : (
//               <Bar data={topExamsBar} options={barOptions} />
//             )}
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>Weekly Activity</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             <Bar data={weeklyActivityBar} options={barOptions} />
//           </div>
//         </div>

//         <div className={styles.card}>
//           <Typography className={styles.sectionTitle}>Average Score by Subject</Typography>
//           <div className={styles.chartBox} style={{ height: chartHeight }}>
//             {avgScoreBySubjectData.length === 0 ? (
//               <Typography className={styles.muted}>No finished sessions yet.</Typography>
//             ) : (
//               <Bar data={avgScoreBySubjectBar} options={barOptions} />
//             )}
//           </div>
//         </div>
//       </div>

//       <div className={styles.grid2} style={{display: 'flex', flexDirection: 'column'}} >
//         <div className={styles.card} style={{display: 'flex', flexDirection: 'column', gap: '10px'}} >
//           <Typography className={styles.sectionTitle}>Active Exam Sessions</Typography>

//           {activeSessions.length === 0 ? (<Typography className={styles.muted}>No active exams right now.</Typography>)
//             :
//             (
//               <div className={styles.list}>
//                 {activeSessions.map((s) => (
//                   <div key={s.id} className={styles.listItem} style={{ boxShadow: 'none' }} >
//                     <div className={styles.listTop}>
//                       <Typography className={styles.listTitle} title={s.exam.title} sx={{ color: "#e5e7eb" }}>
//                         {s.exam.title}
//                       </Typography>
//                       <Chip
//                         size="small"
//                         label={s.subject.name}
//                         sx={{ backgroundColor: "#0B1220", color: "#faad14", border: "1px solid #1E293B" }}
//                       />
//                     </div>

//                     <Typography className={styles.muted}>
//                       Ends: <span style={{ color: "orange" }}>{s.ends_at ? formatTime(s.ends_at) : "—"}</span> • Score:{" "}
//                       <span style={{ color: "#22c55e" }}>{s.score_so_far}</span>
//                     </Typography>
//                   </div>
//                 ))}
//               </div>
//             )}
//         </div>
//       </div>

//       <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} >
//         <Typography className={styles.sectionTitle}>Recent Exam Sessions</Typography>

//         {sessions.length === 0 ? (
//           <Typography className={styles.muted}>No sessions yet.</Typography>
//         ) : (
//           <div className={styles.table}>
//             {sessions.slice(0, 8).map((s) => (
//               <div key={s.id} className={styles.row}>
//                 <Typography className={styles.rowMain} title={s.exam.title}>
//                   {s.exam.title}
//                 </Typography>

//                 <Typography className={styles.rowMeta}>
//                   {s.subject.name} • {s.finished ? "Finished" : "In progress"} • Score: {s.score_so_far}
//                 </Typography>

//                 <Typography className={styles.rowTime}>{s.started_at ? formatTime(s.started_at) : "—"}</Typography>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       <Modal
//         title="Active Exams"
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






"use client";

import { useEffect, useMemo, useState } from "react";
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

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayShort(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short" });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Home() {
  const t = useTranslations("Home");

  const isPhone = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:900px)");
  const router = useRouter();
  const pathname = usePathname();

  const locale = useMemo(() => {
    const seg = (pathname ?? "").split("/")[1];
    return seg || "en";
  }, [pathname]);

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [isActiveExamModalOpen, setIsActiveExamModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await api.get<DashboardResponse | null>("/home/");
        if (mounted) setData(res.data);
      } catch (err) {
        console.error("Dashboard error:", err);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const fullName = useMemo(() => {
    const fn = data?.me?.first_name ?? "";
    const ln = data?.me?.last_name ?? "";
    return `${fn} ${ln}`.trim() || t("fallbackUser");
  }, [data, t]);

  const gradeText = useMemo(() => {
    const g = data?.me?.grade_in;
    if (!g) return t("noGrade");
    const cat = g.category?.name ? ` – ${g.category.name}` : "";
    return `${g.name}${cat}`;
  }, [data, t]);

  const sessions = useMemo(() => data?.sessions ?? [], [data]);

  const activeSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter(
      (s) => s.is_active && s.ends_at && new Date(s.ends_at) > now
    );
  }, [sessions]);

  const chartData = useMemo(() => {
    const arr = data?.subjectPoints ?? [];
    return arr.map((x) => ({ name: x.subject.name, points: x.points ?? 0 }));
  }, [data]);

  const progressMetrics = useMemo(() => {
    const total = sessions.length;
    const finishedSessions = sessions.filter((s) => s.finished);
    const finished = finishedSessions.length;

    const completionPct = total === 0 ? 0 : Math.round((finished / total) * 100);

    const avgScore =
      finished === 0
        ? 0
        : Math.round(
          finishedSessions.reduce(
            (sum, s) => sum + (s.score_so_far ?? 0),
            0
          ) / finished
        );

    const finishedSorted = [...finishedSessions].sort((a, b) => {
      const ta = new Date(a.started_at ?? 0).getTime();
      const tb = new Date(b.started_at ?? 0).getTime();
      return tb - ta;
    });

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

    return { total, finished, completionPct, avgScore, delta };
  }, [sessions]);

  const weeklyActivityData = useMemo(() => {
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const map = new Map<string, number>(order.map((k) => [k, 0]));

    for (const s of sessions) {
      const day = formatDayShort(s.started_at);
      if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
    }

    return order.map((day) => ({ day, sessions: map.get(day) ?? 0 }));
  }, [sessions]);

  const avgScoreBySubjectData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    for (const s of sessions) {
      if (!s.finished) continue;
      const name = s.subject?.name ?? t("unknown");
      const entry = map.get(name) ?? { total: 0, count: 0 };
      entry.total += s.score_so_far ?? 0;
      entry.count += 1;
      map.set(name, entry);
    }

    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        avgScore: v.count === 0 ? 0 : Math.round(v.total / v.count),
        attempts: v.count,
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6);
  }, [sessions, t]);

  const topExamsData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const title = s.exam?.title ?? t("unknown");
      map.set(title, (map.get(title) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, attempts]) => ({ name, attempts }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6);
  }, [sessions, t]);

  const chartHeight = isPhone ? 220 : isTablet ? 260 : 300;

  const onActiveExamClick = () => {
    if (activeSessions.length) setIsActiveExamModalOpen(true);
  };

  const barOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true } },
        y: {},
      },
    }),
    []
  );

  const pointsBySubjectBar = useMemo(
    () => ({
      labels: chartData.map((d) => d.name),
      datasets: [
        {
          label: t("pointsLabel"),
          data: chartData.map((d) => d.points),
          backgroundColor: "rgba(59,130,246,0.70)",
          borderColor: "rgba(59,130,246,0.95)",
          borderWidth: 1,
          borderRadius: 10,
        },
      ],
    }),
    [chartData, t]
  );

  const weeklyActivityBar = useMemo(
    () => ({
      labels: weeklyActivityData.map((d) => d.day),
      datasets: [
        {
          label: t("sessionsLabel"),
          data: weeklyActivityData.map((d) => d.sessions),
          backgroundColor: "rgba(96,165,250,0.55)",
          borderColor: "rgba(96,165,250,0.85)",
          borderWidth: 1,
          borderRadius: 10,
        },
      ],
    }),
    [weeklyActivityData, t]
  );

  const avgScoreBySubjectBar = useMemo(
    () => ({
      labels: avgScoreBySubjectData.map((d) => d.name),
      datasets: [
        {
          label: t("avgScoreLabel"),
          data: avgScoreBySubjectData.map((d) => d.avgScore),
          backgroundColor: "rgba(243, 0, 194, 0.41)",
          borderColor: "rgba(243, 0, 194, 0.72)",
          borderWidth: 1,
          borderRadius: 10,
        },
      ],
    }),
    [avgScoreBySubjectData, t]
  );

  const topExamsBar = useMemo(
    () => ({
      labels: topExamsData.map((d) => d.name),
      datasets: [
        {
          label: t("attemptsLabel"),
          data: topExamsData.map((d) => d.attempts),
          backgroundColor: "rgba(250,173,20,0.55)",
          borderColor: "rgba(250,173,20,0.9)",
          borderWidth: 1,
          borderRadius: 10,
        },
      ],
    }),
    [topExamsData, t]
  );

  const completionDoughnut = useMemo(() => {
    const done = clamp(progressMetrics.completionPct, 0, 100);
    return {
      labels: [t("done"), t("remaining")],
      datasets: [
        {
          data: [done, 100 - done],
          backgroundColor: ["rgba(34,197,94,0.80)", "rgba(148,163,184,0.20)"],
          borderColor: ["rgba(34,197,94,0.95)", "rgba(255,255,255,0.08)"],
          borderWidth: 1,
          cutout: "72%",
        },
      ],
    };
  }, [progressMetrics.completionPct, t]);

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
    }),
    []
  );

  const onExamActiveClick = (examId: number) => {
    router.push(`/${locale}/exam/${examId}/start`);
  };

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
              {
                data.me.grade_in &&
                <>
                  <span className={styles.preCaptions}>{t("grade")}:</span>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={gradeText}
                    sx={{ borderColor: "#af3a75", color: "#fff" }}
                  />
                </>
              }
              <span className={styles.preCaptions}>{t("email")}:</span>
              <Typography className={styles.muted}>{data.me.email}</Typography>
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
          <Typography className={styles.cardValue}>{data.subjects?.length ?? 0}</Typography>
        </div>

        <div className={`${styles.card} ${styles.cardClickable}`} onClick={onActiveExamClick}>
          <Typography className={styles.cardLabel}>{t("activeExams")}</Typography>
          <Typography className={styles.cardValue}>{activeSessions.length}</Typography>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("pointsBySubject")}</Typography>
          <div className={styles.chartBox} style={{ height: chartHeight }}>
            {chartData.length === 0 ? (
              <Typography className={styles.muted}>{t("noPointsYet")}</Typography>
            ) : (
              <Bar data={pointsBySubjectBar} options={barOptions} />
            )}
          </div>
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("progressOverview")}</Typography>

          <div className={styles.chartBox} style={{ height: chartHeight, position: "relative" }}>
            <Doughnut data={completionDoughnut} options={doughnutOptions} />
            <div className={styles.gaugeCenter}>
              <Typography className={styles.gaugePct}>{progressMetrics.completionPct}%</Typography>
              <Typography className={styles.gaugeSub}>
                {t("completion")} • {t("avgScoreText", { avg: progressMetrics.avgScore })}
              </Typography>

              <Typography
                className={styles.gaugeDelta}
                style={{ color: progressMetrics.delta >= 0 ? "#22c55e" : "#ef4444" }}
              >
                {progressMetrics.delta >= 0
                  ? t("deltaUp", { delta: progressMetrics.delta })
                  : t("deltaDown", { delta: progressMetrics.delta })}
              </Typography>
            </div>
          </div>

          <div className={styles.badgeRow}>
            <Chip
              size="small"
              style={{ color: "white" }}
              label={t("finishedBadge", { finished: progressMetrics.finished, total: progressMetrics.total })}
            />
            <Chip size="small" style={{ color: "white" }} label={t("activeBadge", { active: activeSessions.length })} />
          </div>
        </div>
      </div>

      <div className={styles.grid3}>
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("topExamsAttempts")}</Typography>
          <div className={styles.chartBox} style={{ height: chartHeight }}>
            {topExamsData.length === 0 ? (
              <Typography className={styles.muted}>{t("noAttemptsYet")}</Typography>
            ) : (
              <Bar data={topExamsBar} options={barOptions} />
            )}
          </div>
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("weeklyActivity")}</Typography>
          <div className={styles.chartBox} style={{ height: chartHeight }}>
            <Bar data={weeklyActivityBar} options={barOptions} />
          </div>
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("avgScoreBySubject")}</Typography>
          <div className={styles.chartBox} style={{ height: chartHeight }}>
            {avgScoreBySubjectData.length === 0 ? (
              <Typography className={styles.muted}>{t("noFinishedYet")}</Typography>
            ) : (
              <Bar data={avgScoreBySubjectBar} options={barOptions} />
            )}
          </div>
        </div>
      </div>

      <div className={styles.grid2} style={{ display: "flex", flexDirection: "column" }}>
        <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Typography className={styles.sectionTitle}>{t("activeExamSessions")}</Typography>

          {activeSessions.length === 0 ? (
            <Typography className={styles.muted}>{t("noActiveExams")}</Typography>
          ) : (
            <div className={styles.list}>
              {activeSessions.map((s) => (
                <div key={s.id} className={styles.listItem} style={{ boxShadow: "none" }}>
                  <div className={styles.listTop}>
                    <Typography className={styles.listTitle} title={s.exam.title} sx={{ color: "#e5e7eb" }}>
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
                    {t("ends")}: <span style={{ color: "orange" }}>{s.ends_at ? formatTime(s.ends_at) : "—"}</span> •{" "}
                    {t("score")}: <span style={{ color: "#22c55e" }}>{s.score_so_far}</span>
                  </Typography>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Typography className={styles.sectionTitle}>{t("recentExamSessions")}</Typography>

        {sessions.length === 0 ? (
          <Typography className={styles.muted}>{t("noSessionsYet")}</Typography>
        ) : (
          <div className={styles.table}>
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className={styles.row}>
                <Typography className={styles.rowMain} title={s.exam.title}>
                  {s.exam.title}
                </Typography>

                <Typography className={styles.rowMeta}>
                  {s.subject.name} • {s.finished ? t("finished") : t("inProgress")} • {t("score")}: {s.score_so_far}
                </Typography>

                <Typography className={styles.rowTime}>{s.started_at ? formatTime(s.started_at) : "—"}</Typography>
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
          {activeSessions.map((s) => (
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