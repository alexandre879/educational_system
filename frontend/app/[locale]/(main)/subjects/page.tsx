"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./subjects.module.scss";
import { Modal, Select, message, Spin } from "antd";
import api from "@/interceptors";
import { FaAtom, FaExternalLinkAlt } from "react-icons/fa";
import { BackendSubject, SubjectBookResponse } from "./interface";
import axios from "axios";
import { Empty } from "antd";
import { useTranslations } from "next-intl";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export default function Subjects() {
  const t = useTranslations("Subjects");

  const [subjects, setSubjects] = useState<BackendSubject[]>([]);
  const [loading, setLoading] = useState(true);

  const ALL = "All";
  const [category, setCategory] = useState<string>(ALL);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("Book • PDF");

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    const fetchSubjects = async () => {
      try {
        const res = await api.get<BackendSubject[]>("/my_subjects/");
        if (!mountedRef.current) return;
        setSubjects(Array.isArray(res.data) ? res.data : []);
      } 
      catch (error) {
        console.error("Failed to fetch subjects:", error);
      } 
      finally {
        if (!mountedRef.current) return;
        setLoading(false);
      }
    };

    fetchSubjects();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        subjects
          .map((s) => s.grade__category__name)
          .filter((v): v is string => Boolean(v))
      )
    );
    return [ALL, ...unique];
  }, [subjects]);

  const filtered = useMemo(() => {
    if (category === ALL) return subjects;
    return subjects.filter((s) => s.grade__category__name === category);
  }, [subjects, category]);

  const handleCancel = () => {
    requestIdRef.current += 1;
    setIsModalOpen(false);
    setBookLoading(false);
    setBookError(null);
    setPdfUrl(null);
  };

  const specificBookFetch = async (subjectID: number, gradeID: number) => {
    const myRequestId = ++requestIdRef.current;

    setIsModalOpen(true);
    setBookLoading(true);
    setBookError(null);
    setPdfUrl(null);

    const subjectTitle =
      subjects.find((x) => x.pk === subjectID)?.name ?? t("bookFallback");

    setActiveTitle(`${subjectTitle} • PDF`);

    try {
      const res = await api.get<SubjectBookResponse>("/subjects/books/", {
        params: {
          subject_id: subjectID,
          grade_id: gradeID,
        },
      });

      if (!mountedRef.current || requestIdRef.current !== myRequestId) return;

      const data = res?.data;
      const url = data?.pdf_url;

      if (!isNonEmptyString(url)) {
        setBookError(t("noPdfFound"));
        return;
      }

      setPdfUrl(url);
    } 
    catch (error: unknown) {
      if (!mountedRef.current || requestIdRef.current !== myRequestId) return;

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404) {
          setBookError(t("noPdfFound"));
          return;
        }
      }

      console.error(error);
      setBookError(t("failedToLoadPdf"));
      message.error(t("failedToLoadBookPdfToast"));
    }
    finally {
      if (!mountedRef.current || requestIdRef.current !== myRequestId) return;
      setBookLoading(false);
    }
  };

  return (
    <div className={styles.mainContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <span className={styles.headerIcon}>
              <FaAtom className={styles.navIcon} />
            </span>
            <h1 className={styles.title}>{t("pageTitle")}</h1>
          </div>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>

        <div className={styles.controls}>
          <Select
            value={category}
            onChange={(v) => setCategory(v)}
            className={styles.categorySelect}
            popupClassName={styles.categorySelectDropdown}
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            options={categoryOptions.map((c) => ({
              value: c,
              label: c === ALL ? t("all") : c,
            }))}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>{t("loadingSubjects")}</div>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {filtered.map((s) => (
              <button
                key={s.pk}
                type="button"
                className={styles.card}
                onClick={() => specificBookFetch(s.pk, s.grade__pk)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardTitle}>
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
                    <span className={styles.metaLabel}>{t("grade")}</span>
                    <span className={styles.metaValue}>
                      {s.grade__name}
                      {s.grade__category__name}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>{t("noResults")}</div>
              <div className={styles.emptyText}>{t("tryChangingCategory")}</div>
            </div>
          )}

          <Modal
            title={activeTitle}
            open={isModalOpen}
            onCancel={handleCancel}
            footer={null}
            width="min(1100px, 94vw)"
            centered
            className={styles.bookModal}
            destroyOnClose
          >
            <div className={styles.bookModalBody}>
              {bookLoading ? (
                <div className={styles.bookLoading}>
                  <Spin size="large" />
                  <div className={styles.bookLoadingText}>
                    {t("loadingPdf")}
                  </div>
                </div>
              ) : bookError ? (
                <div className={styles.bookError}>
                  <Empty
                    description={
                      <span style={{ color: "grey", fontSize: "20px" }}>
                        {t("empty")}
                      </span>
                    }
                  />
                </div>
              ) : isNonEmptyString(pdfUrl) ? (
                <>
                  <div className={styles.bookTopBar}>
                    <a
                      className={styles.bookAction}
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaExternalLinkAlt />
                      {t("openInNewTab")}
                    </a>
                  </div>

                  <div className={styles.pdfFrameWrap}>
                    <iframe
                      key={pdfUrl}
                      src={pdfUrl}
                      className={styles.pdfFrame}
                      title={t("bookPdfTitle")}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}