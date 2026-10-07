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
import Link from "next/link";
import { getLocalizedValue } from "@/lib/localized";
import { AdminHome, ParentHome, TeacherHome } from "./components/RoleHomes";

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

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayShort(day: number, locale: string) {
  const labels = {
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    ka: ["კვ", "ორ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ"],
  };

  const current = labels[locale as "en" | "ru" | "ka"] || labels.en;
  return current[day];
}

function getDayKey(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).getDay();
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

function readChartTheme() {
  return {
    text: getCssVar("--chart-axis-text", "#b8b8b8"),
    strongText: getCssVar("--text-primary", "#f0f0f0"),
    grid: getCssVar("--chart-grid", "rgba(255,255,255,0.10)"),
    border: getCssVar("--chart-axis-border", "rgba(255,255,255,0.18)"),
  };
}

export default function Home() {
  const t = useTranslations("Home");
  const tApp = useTranslations("App");
  const router = useRouter();
  const pathname = usePathname();

  const isPhone = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:900px)");

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActiveExamModalOpen, setIsActiveExamModalOpen] = useState(false);
  const [themeVersion, setThemeVersion] = useState(0);
  const [chartTheme, setChartTheme] = useState(readChartTheme);
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

    // Charts read colors from CSS variables, so re-read them when the theme flips.
    const observer = new MutationObserver(() => {
      setChartTheme(readChartTheme());
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

  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const subjects = data?.subjects ?? [];
  const subjectPoints = useMemo(() => data?.subjectPoints ?? [], [data]);

  const fullName =
    `${data?.me?.first_name ?? ""} ${data?.me?.last_name ?? ""}`.trim() ||
    t("fallbackUser");

  const gradeText = (() => {
    const g = data?.me?.grade_in;
    if (!g) return t("noGrade");

    const gradeName = getLocalizedValue(g.name, locale);
    const categoryName = getLocalizedValue(g.category?.name, locale);

    return `${gradeName}${categoryName ? ` – ${categoryName}` : ""}`;
  })();

  const derived = useMemo(() => {
    const now = Date.now();

    const activeSessions = sessions.filter(
      (s) => s.is_active && s.ends_at && new Date(s.ends_at).getTime() > now
    );

    const chartData = subjectPoints.map((x) => ({
      name: getLocalizedValue(x.subject.name, locale) || t("unknown"),
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
            finishedSessions.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
              finished
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

    const weeklyMap = new Map<number, number>(WEEK_ORDER.map((d) => [d, 0]));
    const subjectScoreMap = new Map<string, { total: number; count: number }>();
    const examAttemptsMap = new Map<string, number>();

    for (const s of sessions) {
      const day = getDayKey(s.started_at);
      if (day !== null && weeklyMap.has(day)) {
        weeklyMap.set(day, (weeklyMap.get(day) ?? 0) + 1);
      }

      const examTitle = getLocalizedValue(s.exam?.title, locale) || t("unknown");
      examAttemptsMap.set(examTitle, (examAttemptsMap.get(examTitle) ?? 0) + 1);

      if (s.finished) {
        const subjectName =
          getLocalizedValue(s.subject?.name, locale) || t("unknown");
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
      day: formatDayShort(day, locale),
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
  }, [sessions, subjectPoints, t, locale]);

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

  const pageTitle = (
    <div className={styles.WrapperOfMainCaptionAndIcon}>
      <span className={styles.headerIcon}>
        <FaHome className={styles.navIcon} />
      </span>
      <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
    </div>
  );

  const profileHeader = (
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
              label={data.me.role ? t(`role_${data.me.role}`) : t("roleFallback")}
              sx={{ backgroundColor: "rgba(255, 255, 255, 0.2)", color: "#fff", fontWeight: 700 }}
            />

            {data.me.grade_in && (
              <>
                <span className={styles.preCaptions}>{t("grade")}:</span>
                <Chip
                  size="small"
                  variant="outlined"
                  label={gradeText}
                  sx={{ borderColor: "rgba(255, 255, 255, 0.6)", color: "#fff", fontWeight: 700 }}
                />
              </>
            )}

            <span className={styles.preCaptions}>{t("email")}:</span>
            <Typography className={styles.muted}>
              <u>{data.me.email}</u>
            </Typography>

            {data.streak ? (
              <Chip
                size="small"
                label={`🔥 ${tApp("home.streak", { count: data.streak })}`}
                sx={{ backgroundColor: "rgba(255, 255, 255, 0.2)", color: "#fff", fontWeight: 800 }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  // Teachers, parents and admins get their own overview (as in the mobile app).
  const role = data.me.role;
  if (role === "teacher" || role === "parent" || role === "admin") {
    const RoleHome = role === "teacher" ? TeacherHome : role === "parent" ? ParentHome : AdminHome;
    return (
      <div className={styles.page}>
        {pageTitle}
        <RoleHome data={data} header={profileHeader} />
      </div>
    );
  }

  const statLink = { textDecoration: "none", color: "inherit" } as const;

  return (
    <div className={styles.page}>
      {pageTitle}
      {profileHeader}

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

      <div className={styles.grid3}>
        <Link href={`/${locale}/marks`} className={`${styles.card} ${styles.cardClickable}`} style={statLink}>
          <Typography className={styles.cardLabel}>{tApp("home.averageMark")}</Typography>
          <Typography className={styles.cardValue}>
            {data.average_mark == null ? "—" : data.average_mark.toFixed(1)}
          </Typography>
        </Link>

        <Link href={`/${locale}/exercise`} className={`${styles.card} ${styles.cardClickable}`} style={statLink}>
          <Typography className={styles.cardLabel}>{tApp("home.pendingHomework")}</Typography>
          <Typography className={styles.cardValue}>{data.pending_homework ?? 0}</Typography>
        </Link>

        <Link href={`/${locale}/exam?tab=results`} className={`${styles.card} ${styles.cardClickable}`} style={statLink}>
          <Typography className={styles.cardLabel}>{tApp("home.results")}</Typography>
          <Typography className={styles.cardValue}>{derived.progressMetrics.finished}</Typography>
        </Link>
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

          <div
            className={styles.chartBox}
            style={{ height: chartHeight, position: "relative" }}
          >
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
          <Typography className={styles.sectionTitle}>
            {t("activeExamSessions")}
          </Typography>

          {derived.activeSessions.length === 0 ? (
            <Typography className={styles.muted}>{t("noActiveExams")}</Typography>
          ) : (
            <div className={styles.list}>
              {derived.activeSessions.map((s) => {
                const examTitle = getLocalizedValue(s.exam.title, locale);
                const subjectName = getLocalizedValue(s.subject.name, locale);

                return (
                  <div
                    key={s.id}
                    className={styles.listItem}
                    style={{ boxShadow: "none" }}
                  >
                    <div className={styles.listTop}>
                      <Typography
                        className={styles.listTitle}
                        title={examTitle}
                        sx={{ color: "var(--text-strong)" }}
                      >
                        {examTitle}
                      </Typography>

                      <Chip
                        size="small"
                        label={subjectName}
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
                );
              })}
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
            {sessions.slice(0, 8).map((s) => {
              const examTitle = getLocalizedValue(s.exam.title, locale);
              const subjectName = getLocalizedValue(s.subject.name, locale);

              const content = (
                <>
                  <Typography className={styles.rowMain} title={examTitle}>
                    <u>{examTitle}</u>
                  </Typography>

                  <Typography className={styles.rowMeta}>
                    {subjectName} •{" "}
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
                </>
              );

              // Finished exams open the answer review.
              return s.finished ? (
                <Link
                  key={s.id}
                  href={`/${locale}/exam/review/${s.id}`}
                  className={`${styles.row} ${styles.cardClickable}`}
                  style={statLink}
                >
                  {content}
                </Link>
              ) : (
                <div key={s.id} className={styles.row}>
                  {content}
                </div>
              );
            })}
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
          {derived.activeSessions.map((s) => {
            const examTitle = getLocalizedValue(s.exam.title, locale);

            return (
              <li
                className={styles.activeExamsList}
                key={s.id}
                onClick={() => onExamActiveClick(s.exam.id)}
              >
                {examTitle}
              </li>
            );
          })}
        </ul>
      </Modal>
    </div>
  );
}