"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import api from "@/interceptors";
import styles from "./home.module.scss";

import {
  Avatar,
  Chip,
  Typography,
} from "@mui/material";
import { Modal } from "antd";
import { FaHome } from "react-icons/fa";
import {
  ChevronRight,
  GraduationCap,
  LibraryBig,
  Lightbulb,
  NotebookPen,
  ScrollText,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { DashboardResponse } from "./interface";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocalizedValue } from "@/lib/localized";
import { AdminHome, ParentHome, TeacherHome } from "./components/RoleHomes";
import { CountUp, Loading } from "../components/ui/Parts";
import { BarList, ColumnChart, ProgressRing, type ChartDatum } from "../components/charts/Charts";
import { formatTime as formatClockTime, isoWeekday, weekdayName, type IsoWeekday } from "@/lib/dates";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayKey(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).getDay();
}


/** The current time, ticking each minute; null until mounted so SSR and the client agree. */
function useClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      id = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    tick();
    return () => clearTimeout(id);
  }, []);

  return now;
}

function StatCard({
  label,
  value,
  decimals = 0,
  Icon,
  color,
  href,
  onClick,
}: {
  label: string;
  value: number | null;
  decimals?: number;
  Icon: LucideIcon;
  color: string;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className={styles.cardIcon} style={{ color, background: `${color}22`, boxShadow: `0 10px 26px -10px ${color}` }}>
        <Icon size={20} />
      </span>
      <Typography className={styles.cardLabel}>{label}</Typography>
      <Typography className={styles.cardValue}>{value == null ? "—" : <CountUp value={value} decimals={decimals} />}</Typography>
      <span className={styles.cardGlow} style={{ background: color }} aria-hidden="true" />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${styles.card} ${styles.cardClickable}`} style={{ textDecoration: "none", color: "inherit" }}>
        {body}
      </Link>
    );
  }
  return (
    <div className={`${styles.card} ${onClick ? styles.cardClickable : ""}`} onClick={onClick}>
      {body}
    </div>
  );
}

export default function Home() {
  const t = useTranslations("Home");
  const tApp = useTranslations("App");
  const tGlass = useTranslations("Glass.home");
  const router = useRouter();
  const pathname = usePathname();
  const now = useClock();
  const [tipOffset, setTipOffset] = useState(0);

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActiveExamModalOpen, setIsActiveExamModalOpen] = useState(false);

  const locale = pathname?.split("/")[1] || "en";
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatNumber = useCallback((value: number) => numberFormat.format(value), [numberFormat]);

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

    // Ranked bars: largest first.
    const chartData: ChartDatum[] = subjectPoints
      .map((x) => ({
        key: String(x.subject.id),
        label: getLocalizedValue(x.subject.name, locale) || t("unknown"),
        value: x.points ?? 0,
      }))
      .sort((a, b) => b.value - a.value);

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

    const weeklyActivityData: ChartDatum[] = WEEK_ORDER.map((day) => {
      const iso = (day === 0 ? 7 : day) as IsoWeekday;
      return {
        key: String(iso),
        label: weekdayName(iso, tApp, true),
        name: weekdayName(iso, tApp),
        value: weeklyMap.get(day) ?? 0,
      };
    });
    const busiest = Math.max(0, ...weeklyActivityData.map((d) => d.value));

    // The six subjects with the most finished exams, ranked by their average score.
    const avgScoreBySubjectData: ChartDatum[] = Array.from(subjectScoreMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([name, v]) => ({ key: name, label: name, value: v.count === 0 ? 0 : Math.round(v.total / v.count) }))
      .sort((a, b) => b.value - a.value);

    const topExamsData: ChartDatum[] = Array.from(examAttemptsMap.entries())
      .map(([name, attempts]) => ({ key: name, label: name, value: attempts }))
      .sort((a, b) => b.value - a.value)
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
      busiest,
      avgScoreBySubjectData,
      topExamsData,
    };
  }, [sessions, subjectPoints, t, tApp, locale]);

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

  if (loading) {
    return (
      <div className={styles.page} aria-label={t("loading")}>
        <div className={styles.heroSkeleton} />
        <Loading />
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

  // A greeting for the time of day, today's date, and a rotating tip about the app.
  const firstName = data.me.first_name?.trim() || fullName;
  const hour = now?.getHours() ?? 12;
  const greeting = !now
    ? `${t("welcome")}, ${fullName}`
    : tApp(hour < 12 ? "home.goodMorning" : hour < 18 ? "home.goodAfternoon" : "home.goodEvening", { name: firstName });
  const tips = tGlass.raw("tips") as string[];
  const dayOfYear = now ? Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000) : 0;
  const tip = tips[(dayOfYear + tipOffset) % tips.length];

  const profileHeader = (
    <div className={styles.header}>
      <div className={styles.heroTop}>
        <div className={styles.profile}>
          <Avatar
            src={data.me.profilePic ?? undefined}
            className={styles.avatar}
            sx={{ width: 60, height: 60 }}
          />
          <div className={styles.profileText}>
            {now ? (
              <span className={styles.heroDate}>
                {weekdayName(isoWeekday(now), tApp)}, {now.getDate()} {tApp(`dates.monthsLong.m${now.getMonth() + 1}`)}
              </span>
            ) : null}
            <Typography className={styles.title}>
              {greeting} 👋
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

        {now ? (
          <div className={styles.heroClock} aria-hidden="true">
            <span className={styles.heroTime}>{formatClockTime(now)}</span>
            <span className={styles.heroToday}>{tGlass("today")}</span>
          </div>
        ) : null}
      </div>

      <div className={styles.tip}>
        <span className={styles.tipIcon}>
          <Lightbulb size={16} />
        </span>
        <span className={styles.tipText}>
          <b>{tGlass("tipTitle")}</b> · {tip}
        </span>
        <button
          type="button"
          className={styles.tipNext}
          onClick={() => setTipOffset((offset) => offset + 1)}
          aria-label={tGlass("nextTip")}
          title={tGlass("nextTip")}
        >
          <ChevronRight size={16} />
        </button>
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

      <div className={`${styles.grid3} ${styles.statGrid}`}>
        <StatCard label={t("totalPoints")} value={data.me.points ?? 0} Icon={Trophy} color="#F59E0B" />
        <StatCard label={t("subjects")} value={subjects.length} Icon={LibraryBig} color="#8B5CF6" />
        <StatCard
          label={t("activeExams")}
          value={derived.activeSessions.length}
          Icon={Timer}
          color="#F97316"
          onClick={onActiveExamClick}
        />
        <StatCard
          label={tApp("home.averageMark")}
          value={data.average_mark ?? null}
          decimals={1}
          Icon={GraduationCap}
          color="#22C55E"
          href={`/${locale}/marks`}
        />
        <StatCard
          label={tApp("home.pendingHomework")}
          value={data.pending_homework ?? 0}
          Icon={NotebookPen}
          color="#14B8A6"
          href={`/${locale}/exercise`}
        />
        <StatCard
          label={tApp("home.results")}
          value={derived.progressMetrics.finished}
          Icon={ScrollText}
          color="#3B82F6"
          href={`/${locale}/exam?tab=results`}
        />
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("pointsBySubject")}</Typography>
          {derived.chartData.length === 0 ? (
            <Typography className={styles.muted}>{t("noPointsYet")}</Typography>
          ) : (
            <BarList title={t("pointsBySubject")} unit={t("pointsLabel")} data={derived.chartData} format={formatNumber} />
          )}
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("progressOverview")}</Typography>
          <ProgressRing
            percent={derived.progressMetrics.completionPct}
            label={t("completion")}
            ariaLabel={`${t("progressOverview")}: ${derived.progressMetrics.completionPct}% ${t("completion")}`}
          />

          <div className={styles.ringStats}>
            <span className={styles.ringStat}>{t("avgScoreText", { avg: derived.progressMetrics.avgScore })}</span>
            {/* Status colour, always with its arrow and words. */}
            <span className={styles.delta} data-direction={derived.progressMetrics.delta >= 0 ? "up" : "down"}>
              {derived.progressMetrics.delta >= 0
                ? t("deltaUp", { delta: derived.progressMetrics.delta })
                : t("deltaDown", { delta: derived.progressMetrics.delta })}
            </span>
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
          {derived.topExamsData.length === 0 ? (
            <Typography className={styles.muted}>{t("noAttemptsYet")}</Typography>
          ) : (
            <BarList title={t("topExamsAttempts")} unit={t("attemptsLabel")} data={derived.topExamsData} format={formatNumber} />
          )}
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("weeklyActivity")}</Typography>
          {derived.busiest === 0 ? (
            <Typography className={styles.muted}>{t("noSessionsYet")}</Typography>
          ) : (
            <ColumnChart
              title={t("weeklyActivity")}
              unit={t("sessionsLabel")}
              data={derived.weeklyActivityData}
              format={formatNumber}
              emphasis={(d) => d.value === derived.busiest}
              caption={t("busiestDay", {
                day: derived.weeklyActivityData
                  .filter((d) => d.value === derived.busiest)
                  .map((d) => d.name)
                  .join(", "),
              })}
            />
          )}
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>{t("avgScoreBySubject")}</Typography>
          {derived.avgScoreBySubjectData.length === 0 ? (
            <Typography className={styles.muted}>{t("noFinishedYet")}</Typography>
          ) : (
            <BarList
              title={t("avgScoreBySubject")}
              unit={t("pointsLabel")}
              data={derived.avgScoreBySubjectData}
              format={formatNumber}
            />
          )}
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