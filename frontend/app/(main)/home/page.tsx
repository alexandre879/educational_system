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
} from "recharts";
import { DashboardResponse } from "./interface";
import { Modal } from "antd";
import { useRouter } from "next/navigation";


function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const isPhone = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:900px)");

  const router = useRouter()

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [IsActiveExamModalOpen, setIsActiveExamModalOpen] = useState<boolean>(false);
  const ShowIsActiveExamModal = () => setIsActiveExamModalOpen(true)
  const HandleIsActiveExamCancel = () => setIsActiveExamModalOpen(false);




  const onExamActiveClick = (examId: number) => {
    router.push(`/exam/${examId}/start`);
  }




  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await api.get<DashboardResponse | null>("/home/");
        if (mounted) setData(res.data);
      }
      catch (e) {
        console.error("Dashboard error:", e);
        if (mounted) setData(null);
      }
      finally {
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
  const activeSessions = sessions.filter((s) => s.is_active && s.ends_at! > new Date().toISOString());

  const chartData = useMemo(() => {
    const arr = data?.subjectPoints ?? [];
    return arr.map((x) => ({ name: x.subject.name, points: x.points }));
  }, [data]);

  const chartHeight = isPhone ? 200 : isTablet ? 240 : 280;


  const onActiveExamClick = async () => {
    if (activeSessions.length === 0) return;
    setIsActiveExamModalOpen(true)
  }

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
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.profile}>
          <Avatar src={data.me.profilePic ?? undefined} className={styles.avatar} sx={{ width: 60, height: 60 }} />
          <div className={styles.profileText}>
            <Typography className={styles.title}>Welcome, <u>{fullName}</u> 👋</Typography>

            <div className={styles.subRow}>
              <span className={styles.preCaptions} >Role:</span>
              <Chip size="small" label={data.me.role ?? "role"} sx={{ backgroundColor: '#2d5899', color: '#fff' }} />
              <span className={styles.preCaptions} >Grade:</span>
              <Chip size="small" variant="outlined" label={gradeText} sx={{ borderColor: '#af3a75', color: '#fff' }} />
              <span className={styles.preCaptions} >Email:</span>
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

        <div className={styles.card} onClick={onActiveExamClick} >
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
                className={`${styles.leaderboardItem} ${p.isMe ? styles.leaderboardMe : ""}`}
              >
                <div className={styles.leaderboardLeft}>
                  <Typography className={styles.rank}>#{p.rank}</Typography>

                  <div className={styles.leaderText}>
                    <Typography className={styles.leaderName} title={p.name}>
                      {p.name}
                    </Typography>
                  </div>
                  <div className={styles.leaderText}>
                    <Typography className={styles.leaderNameSecond} title={p.name}>
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

      {/* Chart + Active Sessions */}
      <div className={styles.grid2}>
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

                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#9ca3af" }}
                  axisLine={{ stroke: "#374151" }}
                  tickLine={{ stroke: "#374151" }}
                />

                <Tooltip
                  cursor={{ fill: "rgba(59,130,246,0.08)" }}
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #1f2937",
                    borderRadius: 10,
                    color: "#e5e7eb",
                  }}
                  labelStyle={{ color: "#e5e7eb" }}
                />

                <Bar dataKey="points" fill="#3b82f6" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {chartData.length === 0 && (
            <Typography className={styles.muted}>No points yet.</Typography>
          )}
        </div>

        <div className={styles.card}>
          <Typography className={styles.sectionTitle}>Active Exam Sessions</Typography>

          {activeSessions.length === 0 ? (
            <Typography className={styles.muted}>No active exams right now.</Typography>
          ) : (
            <div className={styles.list}>
              {activeSessions.map((s) => (
                <div key={s.id} className={styles.listItem}>
                  <div className={styles.listTop}>
                    <Typography className={styles.listTitle} title={s.exam.title} sx={{ color: '#616161' }}>
                      {s.exam.title}
                    </Typography>
                    <Chip
                      size="small"
                      label={s.subject.name}
                      sx={{
                        backgroundColor: '#0B1220',
                        color: '#faad14', // cyan
                        border: '1px solid #1E293B',
                      }}
                    />
                  </div>

                  <Typography className={styles.muted}>
                    Ends: <span style={{ color: 'orange' }} >{s.ends_at ? formatTime(s.ends_at) : "—"}</span> • Score: <span style={{ color: 'green' }} >{s.score_so_far}</span>
                  </Typography>
                </div>
              ))}
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
      {
        IsActiveExamModalOpen &&
        <>
          <Modal
            title="Active Exams"
            open={IsActiveExamModalOpen}
            onCancel={HandleIsActiveExamCancel}
            onOk={HandleIsActiveExamCancel}
            footer={null}
          >
            <ul>
              {
                data.sessions?.map((s) => (
                  new Date(s.ends_at!) > new Date() && (
                    <li className={styles.activeExamsList} key={s.id} onClick={() => onExamActiveClick(s.exam.id)}>
                      {s.exam.title.split(' ')[0]}
                    </li>
                  )
                ))
              }
            </ul>
          </Modal>
        </>
      }
    </div>
  );
}