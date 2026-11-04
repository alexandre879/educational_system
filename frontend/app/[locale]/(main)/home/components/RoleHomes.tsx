"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@mui/material";
import {
  FaBookOpen,
  FaBullhorn,
  FaCalendarAlt,
  FaCalendarCheck,
  FaChevronRight,
  FaClipboardCheck,
  FaClipboardList,
  FaCommentAlt,
  FaFileAlt,
  FaLayerGroup,
  FaQuestionCircle,
  FaStar,
  FaUsers,
} from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";

import { formatRelative } from "@/lib/dates";
import { getLocalizedValue } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { fullName, subjectColor, withAlpha } from "@/lib/subjects";
import type { Dashboard, DashboardAnnouncement } from "@/lib/types";
import { CountUp, Pill, SectionHeader, SubjectBadge } from "../../components/ui/Parts";
import ui from "../../components/ui/ui.module.scss";

type QuickLinkSpec = { href: string; label: string; icon: ReactNode; color: string };

export function QuickLinks({ links }: { links: QuickLinkSpec[] }) {
  return (
    <nav className={ui.quickLinks}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={ui.quickLink}>
          <span className={ui.quickIcon} style={{ background: withAlpha(link.color, 0.14), color: link.color }}>
            {link.icon}
          </span>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function StatTile({ icon, label, value, color }: { icon: ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className={ui.card} style={{ flexDirection: "row", alignItems: "center" }}>
      <span
        className={ui.quickIcon}
        style={{ background: withAlpha(color, 0.16), color, width: 46, height: 46, boxShadow: `0 10px 24px -10px ${color}` }}
      >
        {icon}
      </span>
      <div>
        <div className={ui.statValue}>{typeof value === "number" ? <CountUp value={value} /> : value}</div>
        <div className={ui.statLabel}>{label}</div>
      </div>
    </div>
  );
}

function AnnouncementRows({ items }: { items: DashboardAnnouncement[] }) {
  const t = useTranslations("App");
  const locale = useLocale();

  if (items.length === 0) {
    return (
      <div className={ui.card}>
        <span className={ui.muted}>{t("home.noAnnouncements")}</span>
      </div>
    );
  }

  return (
    <div className={ui.card} style={{ gap: 0, paddingTop: 6, paddingBottom: 6 }}>
      {items.map((item) => (
        <Link key={item.id} href={`/${locale}/announcement?openAnnouncement=${item.id}`} className={ui.rowLink}>
          <div className={ui.grow}>
            <div className={ui.strong}>{getLocalizedValue(item.title, locale)}</div>
            <div className={ui.muted} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {getLocalizedValue(item.content, locale)}
            </div>
          </div>
          <span className={ui.faint} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <FaCommentAlt size={10} /> {item.len_comments}
          </span>
          <span className={ui.faint}>{formatRelative(item.created_at, t)}</span>
        </Link>
      ))}
    </div>
  );
}

export function TeacherHome({ data, header }: { data: Dashboard; header: ReactNode }) {
  const t = useTranslations("App");
  const tAttendance = useTranslations("Attendance");
  const locale = useLocale();
  const subjects = data.subjectsTaught ?? [];
  const countBySubject = new Map((data.examCounts ?? []).map((entry) => [entry.subject_id, entry.count]));
  const totalExams = (data.examCounts ?? []).reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className={ui.stack} style={{ gap: 18 }}>
      {header}

      <div className={ui.grid3}>
        <StatTile icon={<FaLayerGroup />} label={t("home.subjectsTaught")} value={subjects.length} color="#1677FF" />
        <StatTile icon={<FaFileAlt />} label={t("home.statsExams")} value={totalExams} color="#F97316" />
        <StatTile
          icon={<FaBullhorn />}
          label={t("home.myAnnouncements")}
          value={(data.myAnnouncements ?? []).length}
          color="#8B5CF6"
        />
      </div>

      <QuickLinks
        links={[
          { href: `/${locale}/attendance`, label: tAttendance("pageTitle"), icon: <FaClipboardCheck />, color: "#16A34A" },
          { href: `/${locale}/gradebook`, label: t("home.gradebook"), icon: <FaClipboardList />, color: "#22C55E" },
          { href: `/${locale}/exam`, label: t("teacherExams.title"), icon: <FaFileAlt />, color: "#F97316" },
          { href: `/${locale}/calendar`, label: t("home.calendar"), icon: <FaCalendarCheck />, color: "#06B6D4" },
          { href: `/${locale}/exercise`, label: t("exercises.title"), icon: <FaBookOpen />, color: "#1677FF" },
          { href: `/${locale}/announcement`, label: t("home.myAnnouncements"), icon: <FaBullhorn />, color: "#8B5CF6" },
        ]}
      />

      <SectionHeader title={t("home.subjectsTaught")} />
      {subjects.length === 0 ? (
        <div className={ui.card}>
          <span className={ui.muted}>{t("exercises.noSubjects")}</span>
        </div>
      ) : (
        <div className={ui.grid3}>
          {subjects.map((subject) => {
            const color = subjectColor(subject.id);
            return (
              <div
                key={subject.id}
                className={ui.card}
                style={{ background: withAlpha(color, 0.1), borderColor: withAlpha(color, 0.25), gap: 4 }}
              >
                <span className={ui.strong} style={{ color }}>
                  {getLocalizedValue(subject.name, locale)}
                </span>
                <span className={ui.muted}>
                  {[
                    subject.grade
                      ? `${t("common.grade")} ${subject.grade.name} ${getLocalizedValue(subject.grade.category_name, locale)}`.trim()
                      : null,
                    t("home.examsCount", { count: countBySubject.get(subject.id) ?? 0 }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <SectionHeader
        title={t("home.myAnnouncements")}
        action={
          <Link className={ui.sectionAction} href={`/${locale}/announcement`}>
            {t("home.seeAll")}
          </Link>
        }
      />
      <AnnouncementRows items={(data.myAnnouncements ?? []).slice(0, 4)} />
    </div>
  );
}

export function AdminHome({ data, header }: { data: Dashboard; header: ReactNode }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const stats = data.stats;

  return (
    <div className={ui.stack} style={{ gap: 18 }}>
      {header}

      {stats ? (
        <div className={ui.grid4}>
          <StatTile icon={<FaUsers />} label={t("home.statsUsers")} value={stats.users} color="#1677FF" />
          <StatTile icon={<FaLayerGroup />} label={t("home.statsGrades")} value={stats.grades} color="#8B5CF6" />
          <StatTile icon={<FaBookOpen />} label={t("home.statsSubjects")} value={stats.subjects} color="#14B8A6" />
          <StatTile icon={<FaFileAlt />} label={t("home.statsExams")} value={stats.exams} color="#F97316" />
          <StatTile icon={<FaQuestionCircle />} label={t("home.statsQuestions")} value={stats.questions} color="#EC4899" />
        </div>
      ) : null}

      <SectionHeader
        title={t("home.latestAnnouncements")}
        action={
          <Link className={ui.sectionAction} href={`/${locale}/announcement`}>
            {t("home.seeAll")}
          </Link>
        }
      />
      <AnnouncementRows items={(data.latestAnnouncements ?? []).slice(0, 5)} />
    </div>
  );
}

export function ParentHome({ data, header }: { data: Dashboard; header: ReactNode }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const children = data.children ?? [];

  return (
    <div className={ui.stack} style={{ gap: 18 }}>
      {header}

      <QuickLinks
        links={[
          { href: `/${locale}/calendar`, label: t("home.calendar"), icon: <FaCalendarCheck />, color: "#1677FF" },
          { href: `/${locale}/marks`, label: t("home.marks"), icon: <FaStar />, color: "#22C55E" },
          { href: `/${locale}/exam`, label: t("home.results"), icon: <FaFileAlt />, color: "#F97316" },
          { href: `/${locale}/schedule`, label: t("schedule.title"), icon: <FaCalendarAlt />, color: "#06B6D4" },
        ]}
      />

      <SectionHeader title={t("home.children")} />
      {children.length === 0 ? (
        <div className={ui.card}>
          <span className={ui.muted}>{t("home.noChildren")}</span>
        </div>
      ) : (
        <div className={ui.grid2}>
          {children.map((child) => {
            const name = fullName(child);
            const grade = child.grade
              ? `${child.grade.name} ${getLocalizedValue(child.grade.category_name, locale)}`.trim()
              : t("common.noGrade");

            return (
              <article key={child.id} className={ui.card}>
                <div className={ui.row}>
                  <Avatar src={mediaUrl(child.profilePic)} alt={name} sx={{ width: 52, height: 52 }} />
                  <div className={ui.grow}>
                    <div className={ui.strong} style={{ fontSize: 17 }}>
                      {name}
                    </div>
                    <div className={ui.muted}>
                      {t("common.grade")} {grade}
                    </div>
                  </div>
                  <Pill tone="warn">★ {child.points}</Pill>
                </div>

                <div className={ui.statRow}>
                  <ChildStat
                    label={t("home.averageMark")}
                    value={child.average_mark === null ? "—" : child.average_mark.toFixed(1)}
                  />
                  <ChildStat
                    label={t("home.attendanceRate")}
                    value={child.attendance_rate === null ? "—" : `${child.attendance_rate}%`}
                  />
                  <ChildStat label={t("home.pendingHomework")} value={String(child.pending_homework)} />
                </div>

                <div className={ui.divider} />
                <span className={ui.label}>{t("home.attendanceToday")}</span>
                {child.attendance_today.length === 0 ? (
                  <span className={ui.faint}>{t("home.noAttendanceToday")}</span>
                ) : (
                  child.attendance_today.map((record) => (
                    <div key={record.lesson_id} className={ui.row}>
                      <span className={ui.muted} style={{ width: 44 }}>
                        {record.start_time}
                      </span>
                      <div className={ui.grow}>
                        <SubjectBadge subjectId={record.subject_id} label={getLocalizedValue(record.subject, locale)} />
                      </div>
                      <Pill tone={record.is_present ? "ok" : "bad"}>
                        {record.is_present ? t("home.present") : t("home.absent")}
                      </Pill>
                    </div>
                  ))
                )}

                <Link href={`/${locale}/child/${child.id}`} className={ui.btn}>
                  {t("home.childDetails")} <FaChevronRight size={11} />
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChildStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={ui.statTile}>
      <span className={ui.statValue}>{value}</span>
      <span className={ui.statLabel}>{label}</span>
    </div>
  );
}
