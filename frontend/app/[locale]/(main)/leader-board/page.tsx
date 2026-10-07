"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserOutlined } from "@ant-design/icons";
import api from "@/interceptors";
import styles from "./leader-board.module.scss";
import { Avatar, Empty } from "antd";
import { LeaderboardEntry, Subject } from "./interface";
import { FaTrophy } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocalizedValue } from "@/lib/localized";

function getPositionClass(rank: number, stylesObj: typeof styles) {
  if (rank === 1) return stylesObj.positionWrapperGold;
  if (rank === 2) return stylesObj.positionWrapperSilver;
  if (rank === 3) return stylesObj.positionWrapperBronce;
  return stylesObj.positionWrapperNormal;
}

function getSafeProfileSrc(profilePic?: string | null) {
  return profilePic && profilePic.trim() !== "" ? profilePic : "/avatar.png";
}

export default function LeaderBoard() {
  const t = useTranslations("LeaderBoard");
  const pathname = usePathname();
  const locale = pathname?.split("/")[1] || "en";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chosenSubject, setChosenSubject] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoadingSubjects(true);
      const res = await api.get<Subject[]>("/my_subjects/");
      setSubjects(res.data ?? []);
    } catch (error) {
      console.error(error);
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen]);

  const handleSubjectClick = useCallback(
    async (subject: Subject) => {
      const {
        pk: subjectID,
        grade__category__pk: categoryID,
        grade__pk: gradeID,
      } = subject;

      const localizedSubjectName = getLocalizedValue(subject.name, locale);
      const localizedGradeName = getLocalizedValue(subject.grade__name, locale);
      const localizedCategoryName = getLocalizedValue(
        subject.grade__category__name,
        locale
      );

      setChosenSubject(
        `${localizedSubjectName} ${localizedGradeName} (${localizedCategoryName})`
      );
      setIsDropdownOpen(false);

      try {
        setLoadingLeaderboard(true);

        const res = await api.get<LeaderboardEntry[]>(
          `/leader-board/list/${subjectID}/${gradeID}/${categoryID}/`
        );

        setLeaderboard(res.data ?? []);
      } catch (error) {
        console.error(error);
        setLeaderboard([]);
      } finally {
        setLoadingLeaderboard(false);
      }
    },
    [locale]
  );

  const subjectOptions = useMemo(
    () =>
      subjects.map((subject) => ({
        key: String(subject.pk),
        label: `${getLocalizedValue(subject.name, locale)} ${getLocalizedValue(
          subject.grade__name,
          locale
        )} (${getLocalizedValue(subject.grade__category__name, locale)})`,
        subject,
      })),
    [subjects, locale]
  );

  const sortedLeaderboard = useMemo(
    () => [...leaderboard].sort((a, b) => b.points - a.points),
    [leaderboard]
  );

  const emptyText = chosenSubject ? t("noDataYet") : t("chooseSubjectFirst");

  const renderRank = (rank: number) => (
    <div className={getPositionClass(rank, styles)}>{rank}</div>
  );

  const toggleDropdown = useCallback(() => {
    if (loadingSubjects) return;
    setIsDropdownOpen((prev) => !prev);
  }, [loadingSubjects]);

  return (
    <div className={styles.leaderboardMainContainer}>
      <div className={styles.anotherPage}>
        <div className={styles.WrapperOfMainCaptionAndIcon}>
          <span className={styles.headerIcon}>
            <FaTrophy className={styles.navIcon} />
          </span>
          <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.wrapperOfDropDownAndCaption}>
            <div ref={dropdownRef} className={styles.subjectDropdown}>
              <button
                type="button"
                className={`${styles.subjectDropdownTrigger} ${
                  isDropdownOpen ? styles.subjectDropdownTriggerOpen : ""
                }`}
                onClick={toggleDropdown}
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                disabled={loadingSubjects}
              >
                <span className={styles.subjectBtnText}>
                  {loadingSubjects
                    ? t("loading") || "Loading..."
                    : chosenSubject || t("chooseSubject")}
                </span>
                <span
                  className={`${styles.subjectDropdownArrow} ${
                    isDropdownOpen ? styles.subjectDropdownArrowOpen : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {isDropdownOpen && (
                <div className={styles.subjectDropdownMenu} role="listbox">
                  {subjectOptions.map((item) => {
                    const isActive = chosenSubject === item.label;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`${styles.subjectDropdownItem} ${
                          isActive ? styles.subjectDropdownItemActive : ""
                        }`}
                        onClick={() => void handleSubjectClick(item.subject)}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tableOuter}>
        <table className={styles.tableContainer}>
          <thead>
            <tr>
              <th className={styles.colName}>{t("name")}</th>
              <th className={styles.colEmail}>{t("email")}</th>
              <th className={styles.colPoints}>{t("points")}</th>
              <th className={styles.colPos}>{t("position")}</th>
            </tr>
          </thead>

          <tbody>
            {loadingLeaderboard ? (
              <tr>
                <td colSpan={4} className={styles.emptyCell}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span className={styles.blankCaptionStyle}>
                        {t("loading") || "Loading..."}
                      </span>
                    }
                  />
                </td>
              </tr>
            ) : sortedLeaderboard.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyCell}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span className={styles.blankCaptionStyle}>
                        {emptyText}
                      </span>
                    }
                  />
                </td>
              </tr>
            ) : (
              sortedLeaderboard.map((user, index) => {
                const rank = index + 1;
                const profileSrc = getSafeProfileSrc(user.profile_pic);

                return (
                  <tr key={`${user.email}-${rank}`}>
                    <td className={styles.ImageFirstAndLastNameWrapper}>
                      <Avatar
                        size={40}
                        src={
                          profileSrc !== "/avatar.png" ? profileSrc : undefined
                        }
                        icon={<UserOutlined />}
                      />
                      <div className={styles.firstAndLastNameWrapper}>
                        <span className={styles.nameText}>
                          {user.first_name}
                        </span>
                        <span className={styles.nameText}>
                          {user.last_name}
                        </span>
                      </div>
                    </td>

                    <td className={styles.emailCell} title={user.email}>
                      {user.email}
                    </td>

                    <td>
                      <div className={styles.pointWrapper}>
                        <span className={styles.pointsText}>{user.points}</span>
                      </div>
                    </td>

                    <td>{renderRank(rank)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {loadingLeaderboard ? (
          <div className={styles.mobileEmpty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("loading") || "Loading..."}
            />
          </div>
        ) : sortedLeaderboard.length === 0 ? (
          <div className={styles.mobileEmpty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyText}
            />
          </div>
        ) : (
          sortedLeaderboard.map((user, index) => {
            const rank = index + 1;
            const profileSrc = getSafeProfileSrc(user.profile_pic);

            return (
              <div key={`${user.email}-m-${rank}`} className={styles.mobileCard}>
                <div className={styles.mobileTop}>
                  <div className={styles.mobileLeft}>
                    <Avatar
                      size={42}
                      src={
                        profileSrc !== "/avatar.png" ? profileSrc : undefined
                      }
                      icon={<UserOutlined />}
                      className={styles.image}
                    />
                    <div className={styles.mobileNameBlock}>
                      <div className={styles.mobileName}>
                        {user.first_name} {user.last_name}
                      </div>
                      <div className={styles.mobileEmail} title={user.email}>
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className={styles.mobileBottom}>
                    <div className={styles.pointWrapper}>
                      <span className={styles.pointsText}>{user.points}</span>
                    </div>
                  </div>

                  {renderRank(rank)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}