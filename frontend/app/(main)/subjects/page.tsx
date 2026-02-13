"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./subjects.module.scss";
import { Select } from "antd";
import api from "@/interceptors";
import { FaAtom, } from "react-icons/fa";
import { BackendSubject } from "./interface";



export default function Subjects() {
  const [subjects, setSubjects] = useState<BackendSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("All");


  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get<BackendSubject[]>("/my_subjects/");
        setSubjects(res.data);
      } catch (error) {;
        console.error("Failed to fetch subjects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);


  // 🔥 UNIQUE CATEGORIES FROM BACKEND
  const categoryOptions = useMemo(() => {
    const unique = Array.from(
      new Set(subjects.map((s) => s.grade__category__name))
    );

    return ["All", ...unique];
  }, [subjects]);

  // 🔥 FILTER BY CATEGORY
  const filtered = useMemo(() => {
    if (category === "All") return subjects;
    return subjects.filter(
      (s) => s.grade__category__name === category
    );
  }, [subjects, category]);

  return (
    <div className={styles.mainContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <span className={styles.headerIcon}>
              <FaAtom />
            </span>
            <h1 className={styles.title}>Subjects</h1>
          </div>
          <p className={styles.subtitle}>
            Browse your assigned subjects.
          </p>
        </div>

        <div className={styles.controls}>
          <Select
            value={category}
            onChange={(v) => setCategory(v)}
            className={styles.categorySelect}
            options={categoryOptions.map((c) => ({
              value: c,
              label: c,
            }))}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Loading subjects...</div>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {filtered.map((s) => {
              const Icon = s.name;

              return (
                <button key={s.pk} type="button" className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitle}>
                      <span className={styles.subjectIcon}>
                        <Icon />
                      </span>
                      <span className={styles.subjectName} title={s.name}>
                        {s.name}
                      </span>
                    </div>

                    <span className={styles.categoryPill}>
                      {s.grade__category__name}
                    </span>
                  </div>

                  <div className={styles.cardMeta}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Grade</span>
                      <span className={styles.metaValue}>
                        {s.grade__name}
                      </span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Category</span>
                      <span className={styles.metaValueLine}>
                        {s.grade__category__name}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No results</div>
              <div className={styles.emptyText}>
                Try changing the category.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}