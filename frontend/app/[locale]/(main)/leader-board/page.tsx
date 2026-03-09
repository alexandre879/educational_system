// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import { UserOutlined } from "@ant-design/icons";
// import api from "@/interceptors";
// import styles from "./leader-board.module.scss";
// import Image from "next/image";
// import { Avatar, Button, Dropdown, Empty } from "antd";
// import type { MenuProps } from "antd";
// import { LeaderboardEntry, Subject } from "./interface";
// import { FaTrophy } from "react-icons/fa";
// import { useTranslations } from "next-intl";

// export default function LeaderBoard() {
//   const t = useTranslations("LeaderBoard");

//   const [dropDownData, setDropdownData] = useState<Subject[]>([]);
//   const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
//   const [chosenSubject, setChosenSubject] = useState<string>("");

//   useEffect(() => {
//     const fetchSubjects = async () => {
//       try {
//         const res = await api.get<Subject[]>("/my_subjects/");
//         setDropdownData(res.data);
//       } catch (error) {
//         console.error(error);
//       }
//     };
//     fetchSubjects();
//   }, []);

//   const handleSubjectClick = async (subject: Subject) => {
//     const { pk: subjectID, grade__category__pk: categoryID, grade__pk: gradeID } = subject;
//     setChosenSubject(subject.name);

//     try {
//       const res = await api.get<LeaderboardEntry[]>(
//         `/leader-board/list/${subjectID}/${gradeID}/${categoryID}/`
//       );
//       setLeaderboard(res.data);
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   const menuItems: MenuProps["items"] = useMemo(
//     () =>
//       dropDownData.map((item: Subject) => ({
//         key: item.pk,
//         label: `${item.name} ${item.grade__name} (${item.grade__category__name})`,
//         onClick: () => handleSubjectClick(item),
//       })),
//     [dropDownData]
//   );

//   const sortedLeaderboard = useMemo(() => {
//     return [...leaderboard].sort((a, b) => b.points - a.points);
//   }, [leaderboard]);

//   const emptyText = chosenSubject ? t("noDataYet") : t("chooseSubjectFirst");

//   return (
//     <div className={styles.leaderboardMainContainer}>
//       <div className={styles.anotherPage}>
//         <div className={styles.WrapperOfMainCaptionAndIcon}>
//           <span className={styles.headerIcon}>
//             <FaTrophy className={styles.navIcon} />
//           </span>
//           <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
//         </div>

//         <div className={styles.controlsRow}>
//           <div className={styles.wrapperOfDropDownAndCaption}>
//             <Dropdown
//               overlayClassName={styles.glassDropdown}
//               menu={{ items: menuItems }}
//               placement="bottomCenter"
//               trigger={["click"]}
//               arrow={{ pointAtCenter: true }}
//               getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
//             >
//               <Button className={styles.subjectBtn}>
//                 <span className={styles.subjectBtnText}>
//                   {chosenSubject || t("chooseSubject")}
//                 </span>
//                 <span className={styles.subjectBtnArrow}>▼</span>
//               </Button>
//             </Dropdown>
//           </div>
//         </div>
//       </div>

//       {/* Desktop/Tablet Table */}
//       <div className={styles.tableOuter}>
//         <table className={styles.tableContainer}>
//           <thead>
//             <tr>
//               <th className={styles.colName}>{t("name")}</th>
//               <th className={styles.colEmail}>{t("email")}</th>
//               <th className={styles.colPoints}>{t("points")}</th>
//               <th className={styles.colPos}>{t("position")}</th>
//             </tr>
//           </thead>

//           <tbody>
//             {sortedLeaderboard.length === 0 ? (
//               <tr>
//                 <td colSpan={4} className={styles.emptyCell}>
//                   <Empty
//                     image={Empty.PRESENTED_IMAGE_SIMPLE}
//                     description={<span className={styles.blankCaptionStyle}>{emptyText}</span>}
//                   />
//                 </td>
//               </tr>
//             ) : (
//               sortedLeaderboard.map((user, index) => (
//                 <tr key={`${user.email}-${index}`}>
//                   <td className={styles.ImageFirstAndLastNameWrapper}>
//                     <Avatar
//                       size={40}
//                       src={user.profile_pic && user.profile_pic.trim() !== "" ? user.profile_pic : undefined}
//                       icon={<UserOutlined />}
//                     />
//                     <div className={styles.firstAndLastNameWrapper}>
//                       <span className={styles.nameText}>{user.first_name}</span>
//                       <span className={styles.nameText}>{user.last_name}</span>
//                     </div>
//                   </td>

//                   <td className={styles.emailCell} title={user.email}>
//                     {user.email}
//                   </td>

//                   <td>
//                     <div className={styles.pointWrapper}>
//                       <span className={styles.pointsText}>{user.points}</span>
//                     </div>
//                   </td>

//                   <td>
//                     <div
//                       className={
//                         index + 1 === 1
//                           ? styles.positionWrapperGold
//                           : index + 1 === 2
//                             ? styles.positionWrapperSilver
//                             : index + 1 === 3
//                               ? styles.positionWrapperBronce
//                               : styles.positionWrapperNormal
//                       }
//                     >
//                       {index + 1}
//                     </div>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Mobile Cards */}
//       <div className={styles.mobileList}>
//         {sortedLeaderboard.length === 0 ? (
//           <div className={styles.mobileEmpty}>
//             <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
//           </div>
//         ) : (
//           sortedLeaderboard.map((user, index) => (
//             <div key={`${user.email}-m-${index}`} className={styles.mobileCard}>
//               <div className={styles.mobileTop}>
//                 <div className={styles.mobileLeft}>
//                   <Image
//                     src={user.profile_pic ?? "/avatar.png"}
//                     alt={t("profileAlt")}
//                     className={styles.image}
//                     width={40}
//                     height={40}
//                   />
//                   <div className={styles.mobileNameBlock}>
//                     <div className={styles.mobileName}>
//                       {user.first_name} {user.last_name}
//                     </div>
//                     <div className={styles.mobileEmail} title={user.email}>
//                       {user.email}
//                     </div>
//                   </div>
//                 </div>

//                 <div
//                   className={
//                     index + 1 === 1
//                       ? styles.positionWrapperGold
//                       : index + 1 === 2
//                         ? styles.positionWrapperSilver
//                         : index + 1 === 3
//                           ? styles.positionWrapperBronce
//                           : styles.positionWrapperNormal
//                   }
//                 >
//                   {index + 1}
//                 </div>
//               </div>

//               <div className={styles.mobileBottom}>
//                 <div className={styles.pointWrapper}>
//                   <Image
//                     className={styles.pointIcon}
//                     src="/point.svg"
//                     width={18}
//                     height={18}
//                     alt={t("pointIconAlt")}
//                   />
//                   <span className={styles.pointsText}>{user.points}</span>
//                 </div>
//               </div>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }




"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserOutlined } from "@ant-design/icons";
import api from "@/interceptors";
import styles from "./leader-board.module.scss";
import Image from "next/image";
import { Avatar, Button, Dropdown, Empty } from "antd";
import type { MenuProps } from "antd";
import { LeaderboardEntry, Subject } from "./interface";
import { FaTrophy } from "react-icons/fa";
import { useTranslations } from "next-intl";

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

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chosenSubject, setChosenSubject] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

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
    fetchSubjects();
  }, [fetchSubjects]);

  const handleSubjectClick = useCallback(async (subject: Subject) => {
    const {
      pk: subjectID,
      grade__category__pk: categoryID,
      grade__pk: gradeID,
      name,
    } = subject;

    setChosenSubject(name);

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
  }, []);

  const menuItems: MenuProps["items"] = useMemo(
    () =>
      subjects.map((subject) => ({
        key: String(subject.pk),
        label: `${subject.name} ${subject.grade__name} (${subject.grade__category__name})`,
        onClick: () => handleSubjectClick(subject),
      })),
    [subjects, handleSubjectClick]
  );

  const sortedLeaderboard = useMemo(
    () => [...leaderboard].sort((a, b) => b.points - a.points),
    [leaderboard]
  );

  const emptyText = chosenSubject ? t("noDataYet") : t("chooseSubjectFirst");

  const renderRank = (rank: number) => (
    <div className={getPositionClass(rank, styles)}>{rank}</div>
  );

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
            <Dropdown
              overlayClassName={styles.glassDropdown}
              menu={{ items: menuItems }}
              placement="bottomCenter"
              trigger={["click"]}
              arrow={{ pointAtCenter: true }}
              getPopupContainer={(triggerNode) =>
                triggerNode.parentElement || document.body
              }
            >
              <Button className={styles.subjectBtn} loading={loadingSubjects}>
                <span className={styles.subjectBtnText}>
                  {chosenSubject || t("chooseSubject")}
                </span>
                <span className={styles.subjectBtnArrow}>▼</span>
              </Button>
            </Dropdown>
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
                        src={profileSrc !== "/avatar.png" ? profileSrc : undefined}
                        icon={<UserOutlined />}
                      />
                      <div className={styles.firstAndLastNameWrapper}>
                        <span className={styles.nameText}>{user.first_name}</span>
                        <span className={styles.nameText}>{user.last_name}</span>
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
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
          </div>
        ) : (
          sortedLeaderboard.map((user, index) => {
            const rank = index + 1;
            const profileSrc = getSafeProfileSrc(user.profile_pic);

            return (
              <div key={`${user.email}-m-${rank}`} className={styles.mobileCard}>
                <div className={styles.mobileTop}>
                  <div className={styles.mobileLeft}>
                    <Image
                      src={profileSrc}
                      alt={t("profileAlt")}
                      className={styles.image}
                      width={40}
                      height={40}
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

                  {renderRank(rank)}
                </div>

                <div className={styles.mobileBottom}>
                  <div className={styles.pointWrapper}>
                    <Image
                      className={styles.pointIcon}
                      src="/point.svg"
                      width={18}
                      height={18}
                      alt={t("pointIconAlt")}
                    />
                    <span className={styles.pointsText}>{user.points}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}