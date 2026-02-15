"use client";

import { useEffect, useState } from "react";
import styles from "./exercise.module.scss";
import api from "@/interceptors";
import { FaBookOpen } from "react-icons/fa";

type Exercise = {
  id: number;
  date: string;
  due_date: string | null;
  title: string;
  description: string | null;
  grade: { id: number; name: string };
  subject: { id: number; name: string } | null;
  teacher?: { id: number; name: string };
};

export default function ExercisePage() {
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>("");
  const [items, setItems] = useState<Exercise[]>([]);
  const [userRole] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const todayISO = new Date().toISOString().split("T")[0];

  const load = async (selectedDate?: string) => {
    try {
      setLoading(true);
      const res = await api.get("/exercises/daily/", {
        params: { date: selectedDate ?? todayISO },
      });

      setItems(res.data.items ?? []);
      setDate(res.data.date);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const createExercise = async () => {
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
  };

  useEffect(() => {
    load(todayISO);
  }, []);

  return (
    <div className={styles.exerciseMainContainer}>
      <div className={styles.header}>
        <div className={styles.WrapperOfMainCaptionAndIcon}>
          <span className={styles.headerIcon}>
            <FaBookOpen className={styles.navIcon} />
          </span>
          <h1 className={styles.pageMainCaptionStyle}>Exercises</h1>
        </div>

        {userRole === "teacher" && (
          <button
            className={styles.createBtn}
            onClick={() => setShowCreate((p) => !p)}
          >
            + Add Exercise
          </button>
        )}
      </div>

      {showCreate && (
        <div className={styles.createCard}>
          <input
            placeholder="Exercise title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
          />
          <button className={styles.saveBtn} onClick={createExercise}>
            Save
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>Loading exercises...</div>
      ) : !items.length ? (
        <div className={styles.empty}>No exercises for today 🎉</div>
      ) : (
        <div className={styles.list}>
          {items.map((ex) => (
            <div key={ex.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{ex.title}</span>
                {ex.subject && (
                  <span className={styles.subjectBadge}>{ex.subject.name}</span>
                )}
              </div>

              {ex.description && (
                <p className={styles.description}>{ex.description}</p>
              )}

              <div className={styles.meta}>
                <span>Grade: {ex.grade.name}</span>
                {ex.due_date && <span>Due: {ex.due_date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}