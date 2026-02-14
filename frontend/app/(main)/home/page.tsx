"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/interceptors";
import styles from "./home.module.scss";

import { Avatar, Chip, CircularProgress, Typography } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
} from "recharts";

import { DashboardResponse } from "./interface";
import { Modal } from "antd";
import { useRouter } from "next/navigation";
import { FaHome } from "react-icons/fa";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayShort(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short" }); // Mon, Tue...
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Home() {
  const isPhone = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:900px)");
  const router = useRouter();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [IsActiveExamModalOpen, setIsActiveExamModalOpen] =
    useState<boolean>(false);
  const HandleIsActiveExamCancel = () => setIsActiveExamModalOpen(false);

  const onExamActiveClick = (examId: number) => {
    router.push(`/exam/${examId}/start`);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await api.get<DashboardResponse | null>("/home/");
        if (mounted) setData(res.data);
      } catch (e) {
        console.error("Dashboard error:", e);
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
    return `${fn} ${ln}`.trim() || "User";
  }, [data]);

  const gradeText = useMemo(() => {
    const g = data?.me?.grade_in;
    if (!g) return "No grade";
    const cat = g.category?.name ? ` – ${g.category.name}` : "";
    return `${g.name}${cat}`;
  }, [data]);

  const sessions = data?.sessions ?? [];

  // Active sessions based on ends_at
  const activeSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => {
      if (!s.is_active || !s.ends_at) return false;
      return new Date(s.ends_at) > now;
    });
  }, [sessions]);

  // points by subject
  const chartData = useMemo(() => {
    const arr = data?.subjectPoints ?? [];
    return arr.map((x) => ({ name: x.subject.name, points: x.points }));
  }, [data]);

  // Optional trend
  const pointsTrendData = useMemo(() => {
    return (data as any)?.pointsTrend ?? [];
  }, [data]);

  // Progress metrics
  const progressMetrics = useMemo(() => {
    const total = sessions.length;
    const finishedSessions = sessions.filter((s) => s.finished);
    const finished = finishedSessions.length;

    const completionPct = total === 0 ? 0 : Math.round((finished / total) * 100);

    const avgScore =
      finished === 0
        ? 0
        : Math.round(
          finishedSessions.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) /
          finished
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
        : last7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) / last7.length;

    const prevAvg =
      prev7.length === 0
        ? 0
        : prev7.reduce((sum, s) => sum + (s.score_so_far ?? 0), 0) / prev7.length;

    const delta =
      last7.length === 0 || prev7.length === 0 ? 0 : Math.round(lastAvg - prevAvg);

    return {
      total,
      finished,
      completionPct,
      avgScore,
      delta,
    };
  }, [sessions]);

  const progressGaugeData = useMemo(() => {
    const done = clamp(progressMetrics.completionPct, 0, 100);
    return [
      { name: "Done", value: done, fill: "#22c55e" },
      { name: "Remaining", value: 100 - done, fill: "rgba(148,163,184,0.25)" },
    ];
  }, [progressMetrics]);

  // weekly activity
  const weeklyActivityData = useMemo(() => {
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const map = new Map<string, number>(order.map((k) => [k, 0]));

    for (const s of sessions) {
      const day = formatDayShort(s.started_at);
      if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
    }

    return order.map((day) => ({ day, sessions: map.get(day) ?? 0 }));
  }, [sessions]);

  // avg score by subject
  const avgScoreBySubjectData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    for (const s of sessions) {
      if (!s.finished) continue;
      const name = s.subject?.name ?? "Unknown";
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
  }, [sessions]);

  // top exams
  const topExamsData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const title = s.exam?.title ?? "Unknown";
      map.set(title, (map.get(title) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, attempts]) => ({ name, attempts }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6);
  }, [sessions]);

  // Responsive chart height
  const chartHeight = isPhone ? 220 : isTablet ? 260 : 300;

  const onActiveExamClick = async () => {
    if (activeSessions.length === 0) return;
    setIsActiveExamModalOpen(true);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading dashboard…</Typography>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <Typography variant="h6">Failed to load dashboard</Typography>
          <Typography className={styles.muted}>
            Check token / API URL / console.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.WrapperOfMainCaptionAndIcon} >
        <span className={styles.headerIcon}>
          <FaHome className={styles.navIcon} />
        </span>
        <h1 className={styles.pageMainCaptionStyle} >Home</h1>
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
              Welcome, <u>{fullName}</u> 👋
            </Typography>

            <div className={styles.subRow}>
              <span className={styles.preCaptions}>Role:</span>
              <Chip
                size="small"
                label={data.me.role ?? "role"}
                sx={{ backgroundColor: "#2d5899", color: "#fff" }}
              />
              <span className={styles.preCaptions}>Grade:</span>
              <Chip
                size="small"
                variant="outlined"
                label={gradeText}
                sx={{ borderColor: "#af3a75", color: "#fff" }}
              />
              <span className={styles.preCaptions}>Email:</span>
              <Typography className={styles.muted}>{data.me.email}</Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.grid3}>
        <div className={styles.card}>
          <Typography className={styles.cardLabel}>Total Points</Typography>
          <Typography className={styles.cardValue}>{data.me.points ?? 0}</Typography>
        </div>

        <div className={styles.card}>
          <Typography className={styles.cardLabel}>Subjects</Typography>
          <Typography className={styles.cardValue}>{data.subjects?.length ?? 0}</Typography>
        </div>

        <div className={`${styles.card} ${styles.cardClickable}`} onClick={onActiveExamClick}>
          <Typography className={styles.cardLabel}>Active Exams</Typography>
          <Typography className={styles.cardValue}>{activeSessions.length}</Typography>
        </div>
      </div>

      {/* Whole-school Leaderboard */}
      {data.leaderboard && (
        <div className={styles.card}>
          <div className={styles.leaderboardHeader}>
            <Typography className={styles.sectionTitle}>School Leaderboard</Typography>

            <Typography className={styles.myRank}>
              Your rank: <span>#{data.leaderboard.me_rank}</span>
            </Typography>
          </div>

          <div className={styles.leaderboardList}>
            {data.leaderboard.items.map((p) => (
              <div
                key={p.id}
                className={`${styles.leaderboardItem} ${p.isMe ? styles.leaderboardMe : ""
                  }`}
              >
                <div className={styles.leaderboardLeft}>
                  <Typography className={styles.rank}>#{p.rank}</Typography>

                  <div className={styles.leaderText}>
                    <Typography className={styles.leaderName} title={p.name}>
                      {p.name}
                    </Typography>
                    <Typography className={styles.leaderNameSecond} title={p.email}>
                      ({p.email})
                    </Typography>
                  </div>
                </div>

                <div className={styles.leaderPoints}>
                  <span>{p.points}</span>
                  <span className={styles.pointsLabel}>pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row: Points by Subject + Active Sessions */}
      <div className={styles.grid2}>
        {/* Points by Subject */}
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>Points by Subject</Typography>

          <div className={styles.chartBox} style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  interval={isPhone ? 1 : 0}
                  tick={{ fontSize: isPhone ? 10 : 12, fill: "#9ca3af" }}
                  tickMargin={8}
                  axisLine={{ stroke: "#374151" }}
                  tickLine={{ stroke: "#374151" }}
                />
                <YAxis allowDecimals={false} tick={{ fill: "#9ca3af" }} axisLine={{ stroke: "#374151" }} tickLine={{ stroke: "#374151" }} />
                <Tooltip
                  cursor={{ fill: "rgba(59,130,246,0.08)" }}
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: 10, color: "#e5e7eb" }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Bar dataKey="points" fill="#3b82f6" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {chartData.length === 0 && <Typography className={styles.muted}>No points yet.</Typography>}
        </div>

        {/* Active Exam Sessions */}
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>Active Exam Sessions</Typography>

          {activeSessions.length === 0 ? (
            <Typography className={styles.muted}>No active exams right now.</Typography>
          ) : (
            <div className={styles.list}>
              {activeSessions.map((s) => (
                <div key={s.id} className={styles.listItem}>
                  <div className={styles.listTop}>
                    <Typography className={styles.listTitle} title={s.exam.title} sx={{ color: "#616161" }}>
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
                    Ends:{" "}
                    <span style={{ color: "orange" }}>
                      {s.ends_at ? formatTime(s.ends_at) : "—"}
                    </span>{" "}
                    • Score: <span style={{ color: "green" }}>{s.score_so_far}</span>
                  </Typography>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className={styles.grid3}>
        {/* Progress Overview */}
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>Progress Overview</Typography>

          <div className={styles.chartBox} style={{ height: chartHeight, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="92%"
                data={progressGaugeData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={999} />
              </RadialBarChart>
            </ResponsiveContainer>

            <div className={styles.gaugeCenter}>
              <Typography className={styles.gaugePct}>
                {progressMetrics.completionPct}%
              </Typography>

              <Typography className={styles.gaugeSub}>
                Completion • Avg score {progressMetrics.avgScore}
              </Typography>

              <Typography
                className={styles.gaugeDelta}
                style={{ color: progressMetrics.delta >= 0 ? "#22c55e" : "#ef4444" }}
              >
                {progressMetrics.delta >= 0
                  ? `▲ +${progressMetrics.delta} vs previous`
                  : `▼ ${progressMetrics.delta} vs previous`}
              </Typography>
            </div>
          </div>

          <div className={styles.badgeRow}>
            <Chip size="small" label={`Finished: ${progressMetrics.finished}/${progressMetrics.total}`} />
            <Chip size="small" label={`Active: ${activeSessions.length}`} />
          </div>
        </div>

        {/* Weekly Activity */}
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>Weekly Activity</Typography>

          <div className={styles.chartBox} style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivityData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: "#9ca3af" }} />
                <YAxis allowDecimals={false} tick={{ fill: "#9ca3af" }} />
                <Tooltip />
                <Area type="monotone" dataKey="sessions" stroke="#60a5fa" fill="rgba(96,165,250,0.25)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avg Score by Subject */}
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>Average Score by Subject</Typography>

          {avgScoreBySubjectData.length === 0 ? (
            <Typography className={styles.muted}>No finished sessions yet.</Typography>
          ) : (
            <div className={styles.chartBox} style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgScoreBySubjectData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af" }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fill: "#9ca3af" }} />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#faad14" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Extra row */}
      <div className={styles.grid2}>
        {/* Points Trend */}
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>Points Trend</Typography>

          {pointsTrendData.length === 0 ? (
            <Typography className={styles.muted}>No trend data yet.</Typography>
          ) : (
            <div className={styles.chartBox} style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pointsTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fill: "#9ca3af" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#9ca3af" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: 10, color: "#e5e7eb" }} />
                  <Line type="monotone" dataKey="points" stroke="#3b82f6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Exams */}
        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>Top Exams (Attempts)</Typography>

          {topExamsData.length === 0 ? (
            <Typography className={styles.muted}>No attempts yet.</Typography>
          ) : (
            <div className={styles.chartBox} style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topExamsData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: isPhone ? 10 : 12, fill: "#9ca3af" }}
                    tickMargin={8}
                    axisLine={{ stroke: "#374151" }}
                    tickLine={{ stroke: "#374151" }}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: "#9ca3af" }} />
                  <Tooltip />
                  <Bar dataKey="attempts" fill="#faad14" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      <div className={styles.card}>
        <Typography className={styles.sectionTitle}>Recent Exam Sessions</Typography>

        {sessions.length === 0 ? (
          <Typography className={styles.muted}>No sessions yet.</Typography>
        ) : (
          <div className={styles.table}>
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className={styles.row}>
                <Typography className={styles.rowMain} title={s.exam.title}>
                  {s.exam.title}
                </Typography>

                <Typography className={styles.rowMeta}>
                  {s.subject.name} • {s.finished ? "Finished" : "In progress"} • Score:{" "}
                  {s.score_so_far}
                </Typography>

                <Typography className={styles.rowTime}>
                  {s.started_at ? formatTime(s.started_at) : "—"}
                </Typography>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Exams Modal */}
      {IsActiveExamModalOpen && (
        <Modal
          title="Active Exams"
          open={IsActiveExamModalOpen}
          onCancel={HandleIsActiveExamCancel}
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
      )}
    </div>
  );
}