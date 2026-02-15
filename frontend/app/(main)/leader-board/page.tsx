// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import api from "@/interceptors";
// import styles from "./leader-board.module.scss";
// import Image from "next/image";
// import { Button, Dropdown, Empty } from "antd";
// import type { MenuProps } from "antd";
// import { LeaderboardEntry, Subject } from "./interface";
// import { FaBullhorn, FaTrophy } from "react-icons/fa";

// export default function LeaderBoard() {
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

//   return (
//     <div className={styles.leaderboardMainContainer}>
//       <div className={styles.anotherPage} >
//         <div className={styles.WrapperOfMainCaptionAndIcon} >
//           <span className={styles.headerIcon}>
//             <FaTrophy className={styles.navIcon} />
//           </span>
//           <h1 className={styles.pageMainCaptionStyle} >Leader board</h1>
//         </div>
//         <div className={styles.controlsRow}>
//           <div className={styles.wrapperOfDropDownAndCaption}>
//             <Dropdown
//               menu={{ items: menuItems }}
//               placement="bottomLeft"
//               trigger={["click"]}
//               arrow={{ pointAtCenter: true }}
//             >
//               <Button className={styles.subjectBtn}>
//                 <span className={styles.subjectBtnText}>
//                   {chosenSubject || "Choose the subject"}
//                 </span>
//                 <span className={styles.subjectBtnArrow}>▼</span>
//               </Button>
//             </Dropdown>
//           </div>
//         </div>
//       </div>

//       {/* Desktop/Tablet Table (scrollable on small screens) */}
//       <div className={styles.tableOuter}>
//         <table className={styles.tableContainer}>
//           <thead>
//             <tr>
//               <th className={styles.colName}>Name</th>
//               <th className={styles.colEmail}>Email</th>
//               <th className={styles.colPoints}>Points</th>
//               <th className={styles.colPos}>Position</th>
//             </tr>
//           </thead>

//           <tbody>
//             {sortedLeaderboard.length === 0 ? (
//               <tr>
//                 <td colSpan={4} className={styles.emptyCell}>
//                   <Empty
//                     image={Empty.PRESENTED_IMAGE_SIMPLE}
//                     description={
//                       <span className={styles.blankCaptionStyle} >
//                         {chosenSubject ? "No leaderboard data yet." : "Choose a subject first."}
//                       </span>

//                     }
//                   />
//                 </td>
//               </tr>
//             ) : (
//               sortedLeaderboard.map((user, index) => (
//                 <tr key={`${user.email}-${index}`}>
//                   <td className={styles.ImageFirstAndLastNameWrapper}>
//                     <Image
//                       src={user.profile_pic ?? "/avatar.png"}
//                       alt="Profile Picture"
//                       className={styles.image}
//                       width={40}
//                       height={40}
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
//                       <Image
//                         className={styles.pointIcon}
//                         src="/point.svg"
//                         width={25}
//                         height={25}
//                         alt="Point-icon"
//                       />
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

//       {/* Mobile Cards (shows only on small screens via CSS) */}
//       <div className={styles.mobileList}>
//         {sortedLeaderboard.length === 0 ? (
//           <div className={styles.mobileEmpty}>
//             <Empty
//               image={Empty.PRESENTED_IMAGE_SIMPLE}
//               description={chosenSubject ? "No leaderboard data yet." : "Choose a subject first."}
//             />
//           </div>
//         ) : (
//           sortedLeaderboard.map((user, index) => (
//             <div key={`${user.email}-m-${index}`} className={styles.mobileCard}>
//               <div className={styles.mobileTop}>
//                 <div className={styles.mobileLeft}>
//                   <Image
//                     src={user.profile_pic ?? "/avatar.png"}
//                     alt="Profile"
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
//                     alt="Point-icon"
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

import React, { useEffect, useMemo, useState } from "react";
import api from "@/interceptors";
import styles from "./leader-board.module.scss";
import Image from "next/image";
import { Button, Dropdown, Empty } from "antd";
import type { MenuProps } from "antd";
import { LeaderboardEntry, Subject } from "./interface";
import { FaTrophy } from "react-icons/fa";

export default function LeaderBoard() {
  const [dropDownData, setDropdownData] = useState<Subject[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chosenSubject, setChosenSubject] = useState<string>("");

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get<Subject[]>("/my_subjects/");
        setDropdownData(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchSubjects();
  }, []);

  const handleSubjectClick = async (subject: Subject) => {
    const { pk: subjectID, grade__category__pk: categoryID, grade__pk: gradeID } = subject;
    setChosenSubject(subject.name);

    try {
      const res = await api.get<LeaderboardEntry[]>(
        `/leader-board/list/${subjectID}/${gradeID}/${categoryID}/`
      );
      setLeaderboard(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const menuItems: MenuProps["items"] = useMemo(
    () =>
      dropDownData.map((item: Subject) => ({
        key: item.pk,
        label: `${item.name} ${item.grade__name} (${item.grade__category__name})`,
        onClick: () => handleSubjectClick(item),
      })),
    [dropDownData]
  );

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => b.points - a.points);
  }, [leaderboard]);

  return (
    <div className={styles.leaderboardMainContainer}>
      <div className={styles.anotherPage}>
        <div className={styles.WrapperOfMainCaptionAndIcon}>
          <span className={styles.headerIcon}>
            <FaTrophy className={styles.navIcon} />
          </span>
          <h1 className={styles.pageMainCaptionStyle}>Leader board</h1>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.wrapperOfDropDownAndCaption}>
            <Dropdown
              overlayClassName={styles.glassDropdown}
              menu={{ items: menuItems }}
              placement="bottomLeft"
              trigger={["click"]}
              arrow={{ pointAtCenter: true }}
            >
              <Button className={styles.subjectBtn}>
                <span className={styles.subjectBtnText}>
                  {chosenSubject || "Choose the subject"}
                </span>
                <span className={styles.subjectBtnArrow}>▼</span>
              </Button>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Desktop/Tablet Table */}
      <div className={styles.tableOuter}>
        <table className={styles.tableContainer}>
          <thead>
            <tr>
              <th className={styles.colName}>Name</th>
              <th className={styles.colEmail}>Email</th>
              <th className={styles.colPoints}>Points</th>
              <th className={styles.colPos}>Position</th>
            </tr>
          </thead>

          <tbody>
            {sortedLeaderboard.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyCell}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span className={styles.blankCaptionStyle}>
                        {chosenSubject ? "No leaderboard data yet." : "Choose a subject first."}
                      </span>
                    }
                  />
                </td>
              </tr>
            ) : (
              sortedLeaderboard.map((user, index) => (
                <tr key={`${user.email}-${index}`}>
                  <td className={styles.ImageFirstAndLastNameWrapper}>
                    <Image
                      src={user.profile_pic ?? "/avatar.png"}
                      alt="Profile Picture"
                      className={styles.image}
                      width={40}
                      height={40}
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
                      <Image
                        className={styles.pointIcon}
                        src="/point.svg"
                        width={25}
                        height={25}
                        alt="Point-icon"
                      />
                      <span className={styles.pointsText}>{user.points}</span>
                    </div>
                  </td>

                  <td>
                    <div
                      className={
                        index + 1 === 1
                          ? styles.positionWrapperGold
                          : index + 1 === 2
                          ? styles.positionWrapperSilver
                          : index + 1 === 3
                          ? styles.positionWrapperBronce
                          : styles.positionWrapperNormal
                      }
                    >
                      {index + 1}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className={styles.mobileList}>
        {sortedLeaderboard.length === 0 ? (
          <div className={styles.mobileEmpty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={chosenSubject ? "No leaderboard data yet." : "Choose a subject first."}
            />
          </div>
        ) : (
          sortedLeaderboard.map((user, index) => (
            <div key={`${user.email}-m-${index}`} className={styles.mobileCard}>
              <div className={styles.mobileTop}>
                <div className={styles.mobileLeft}>
                  <Image
                    src={user.profile_pic ?? "/avatar.png"}
                    alt="Profile"
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

                <div
                  className={
                    index + 1 === 1
                      ? styles.positionWrapperGold
                      : index + 1 === 2
                      ? styles.positionWrapperSilver
                      : index + 1 === 3
                      ? styles.positionWrapperBronce
                      : styles.positionWrapperNormal
                  }
                >
                  {index + 1}
                </div>
              </div>

              <div className={styles.mobileBottom}>
                <div className={styles.pointWrapper}>
                  <Image
                    className={styles.pointIcon}
                    src="/point.svg"
                    width={18}
                    height={18}
                    alt="Point-icon"
                  />
                  <span className={styles.pointsText}>{user.points}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}