// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import styles from "./exercise.module.scss";
// import api from "@/interceptors";
// import { FaBookOpen } from "react-icons/fa";
// import { Exercise } from "./interface";


// export default function ExercisePage() {
//   const [loading, setLoading] = useState(true);
//   const [items, setItems] = useState<Exercise[]>([]);
//   const [userRole] = useState<string | null>(null);

//   const [showCreate, setShowCreate] = useState(false);
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");

//   const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);

//   const load = useCallback(
//     async (selectedDate?: string) => {
//       try {
//         setLoading(true);
//         const res = await api.get("/exercises/daily/", {
//           params: { date: selectedDate ?? todayISO },
//         });

//         setItems(res.data.items ?? []);
//       } 
//       catch {
//         setItems([]);
//       } finally {
//         setLoading(false);
//       }
//     },
//     [todayISO]
//   );

//   const createExercise = useCallback(async () => {
//     if (!title.trim()) return;

//     await api.post("/exercises/daily/create/", {
//       grade_id: items[0]?.grade?.id,
//       date: todayISO,
//       title,
//       description,
//     });

//     setTitle("");
//     setDescription("");
//     setShowCreate(false);
//     await load(todayISO);
//   }, [title, items, todayISO, description, load]);

//   useEffect(() => {
//     load(todayISO);
//   }, [load, todayISO]);

//   return (
//     <div className={styles.exerciseMainContainer}>
//       <div className={styles.header}>
//         <div className={styles.WrapperOfMainCaptionAndIcon}>
//           <span className={styles.headerIcon}>
//             <FaBookOpen className={styles.navIcon} />
//           </span>
//           <h1 className={styles.pageMainCaptionStyle}>Exercises</h1>
//         </div>

//         {userRole === "teacher" && (
//           <button className={styles.createBtn} onClick={() => setShowCreate((p) => !p)}>
//             + Add Exercise
//           </button>
//         )}
//       </div>

//       {showCreate && (
//         <div className={styles.createCard}>
//           <input
//             placeholder="Exercise title"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             className={styles.input}
//           />
//           <textarea
//             placeholder="Description (optional)"
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             className={styles.textarea}
//           />
//           <button className={styles.saveBtn} onClick={createExercise}>
//             Save
//           </button>
//         </div>
//       )}

//       {loading ? (
//         <div className={styles.empty}>Loading exercises...</div>
//       ) : !items.length ? (
//         <div className={styles.empty}>No exercises for today</div>
//       ) : (
//         <div className={styles.list}>
//           {items.map((ex) => (
//             <div key={ex.id} className={styles.card}>
//               <div className={styles.cardHeader}>
//                 <span className={styles.cardTitle}>{ex.title}</span>
//                 {ex.subject && <span className={styles.subjectBadge}>{ex.subject.name}</span>}
//               </div>

//               {ex.description && <p className={styles.description}>{ex.description}</p>}

//               <div className={styles.meta}>
//                 <span>Grade: {ex.grade.name}</span>
//                 {ex.due_date && <span>Due: {ex.due_date}</span>}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }



"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./exercise.module.scss";
import api from "@/interceptors";
import { FaBookOpen } from "react-icons/fa";
import { Exercise } from "./interface";
import { useTranslations } from "next-intl";

export default function ExercisePage() {
  const t = useTranslations("Exercise");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Exercise[]>([]);
  const [userRole] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);

  const load = useCallback(
    async (selectedDate?: string) => {
      try {
        setLoading(true);
        const res = await api.get("/exercises/daily/", {
          params: { date: selectedDate ?? todayISO },
        });

        setItems(res.data.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [todayISO]
  );

  const createExercise = useCallback(async () => {
    if (!title.trim()) return;

    await api.post("/exercises/daily/create/", {
      grade_id: items[0]?.grade?.id,
      date: todayISO,
      title,
      description,
    });

    setTitle("");
    setDescription("");
    setShowCreate(false);
    await load(todayISO);
  }, [title, items, todayISO, description, load]);

  useEffect(() => {
    load(todayISO);
  }, [load, todayISO]);

  return (
    <div className={styles.exerciseMainContainer}>
      <div className={styles.header}>
        <div className={styles.WrapperOfMainCaptionAndIcon}>
          <span className={styles.headerIcon}>
            <FaBookOpen className={styles.navIcon} />
          </span>
          <h1 className={styles.pageMainCaptionStyle}>{t("pageTitle")}</h1>
        </div>

        {userRole === "teacher" && (
          <button
            className={styles.createBtn}
            onClick={() => setShowCreate((p) => !p)}
          >
            + {t("addExercise")}
          </button>
        )}
      </div>

      {showCreate && (
        <div className={styles.createCard}>
          <input
            placeholder={t("exerciseTitlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />
          <textarea
            placeholder={t("descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
          />
          <button className={styles.saveBtn} onClick={createExercise}>
            {t("save")}
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>{t("loadingExercises")}</div>
      ) : !items.length ? (
        <div className={styles.empty}>{t("noExercisesToday")}</div>
      ) : (
        <div className={styles.list}>
          {items.map((ex) => (
            <div key={ex.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{ex.title}</span>
                {ex.subject && (
                  <span className={styles.subjectBadge}>
                    {ex.subject.name}
                  </span>
                )}
              </div>

              {ex.description && (
                <p className={styles.description}>{ex.description}</p>
              )}

              <div className={styles.meta}>
                <span>
                  {t("gradeLabel")}: {ex.grade.name}
                </span>
                {ex.due_date && (
                  <span>
                    {t("dueLabel")}: {ex.due_date}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}