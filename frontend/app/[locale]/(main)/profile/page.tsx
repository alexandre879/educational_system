"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { message } from "antd";
import styles from "./profile.module.scss";
import api from "@/interceptors";
import { FormState, UserMeData } from "./interface";
import { AxiosError } from "axios";
import { FaUserCircle } from "react-icons/fa";
import { Avatar } from "@mui/material";
import { letterToHsl } from "./utils";
import { useTranslations } from "next-intl";

function getAxiosDetail(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;

  const maybeAxios = err as Partial<AxiosError<unknown>>;
  const resp = maybeAxios.response;
  if (!resp || typeof resp !== "object") return null;

  const data = resp.data;
  if (!data || typeof data !== "object") return null;

  const detail = (data as Record<string, unknown>).detail;
  return typeof detail === "string" ? detail : null;
}

function buildInitialForm(user: UserMeData): FormState {
  return {
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    email: user.email ?? "",
  };
}

export default function ProfileSettings() {
  const t = useTranslations("Profile");

  const [userMe, setUserMe] = useState<UserMeData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    email: "",
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarBust, setAvatarBust] = useState(() => Date.now());

  const revokePreview = useCallback((url: string | null) => {
    if (!url) return;
    try {
      URL.revokeObjectURL(url);
    } catch {
      console.log("error has been caught");
    }
  }, []);

  const clearPreviewState = useCallback(() => {
    setSelectedFile(null);
    setPreview((current) => {
      if (current) revokePreview(current);
      return null;
    });
  }, [revokePreview]);

  const resetFormFromUser = useCallback(
    (user: UserMeData) => {
      setForm(buildInitialForm(user));
    },
    []
  );

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get<UserMeData>("user/me/");
      setUserMe(res.data);
      setAvatarBust(Date.now());
      resetFormFromUser(res.data);
    } catch (err) {
      console.error(err);
      message.error(t("loadFailed"));
    }
  }, [resetFormFromUser, t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      revokePreview(preview);
    };
  }, [preview, revokePreview]);

  const avatarSrc = preview
    ? preview
    : userMe?.profilePic
      ? `${userMe.profilePic}${userMe.profilePic.includes("?") ? "&" : "?"}v=${avatarBust}`
      : undefined;

  const avatarFallback = letterToHsl(userMe?.first_name);

  const onEdit = useCallback(() => {
    if (!userMe) return;
    setIsEditing(true);
    resetFormFromUser(userMe);
    clearPreviewState();
  }, [userMe, resetFormFromUser, clearPreviewState]);

  const onCancel = useCallback(() => {
    if (!userMe) return;
    setIsEditing(false);
    setSaving(false);
    resetFormFromUser(userMe);
    clearPreviewState();
  }, [userMe, resetFormFromUser, clearPreviewState]);

  const onChangeFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPreview((current) => {
        if (current) revokePreview(current);
        return URL.createObjectURL(file);
      });

      setSelectedFile(file);
    },
    [revokePreview]
  );

  const onChangeField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onSave = useCallback(async () => {
    if (!userMe) return;

    try {
      setSaving(true);

      const fd = new FormData();
      fd.append("first_name", form.first_name);
      fd.append("last_name", form.last_name);

      if (selectedFile) {
        fd.append("profilePic", selectedFile);
      }

      const res = await api.patch<UserMeData>("update/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUserMe(res.data);
      setAvatarBust(Date.now());
      setIsEditing(false);
      clearPreviewState();

      message.success(t("updated"));
    } catch (err) {
      console.error(err);
      message.error(getAxiosDetail(err) ?? t("updateFailed"));
    } finally {
      setSaving(false);
    }
  }, [userMe, form, selectedFile, clearPreviewState, t]);

  if (!userMe) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <div className={styles.loading}>{t("loading")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.iconBadge}>
              <FaUserCircle className={styles.icon} />
            </span>

            <div className={styles.headerText}>
              <h1 className={styles.title}>{t("title")}</h1>
              <p className={styles.subTitle}>{t("subtitle")}</p>
            </div>
          </div>

          <div className={styles.headerRight}>
            {!isEditing ? (
              <button className={styles.primaryBtn} type="button" onClick={onEdit}>
                {t("edit")}
              </button>
            ) : (
              <div className={styles.headerActions}>
                <button
                  className={styles.saveBtn}
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving ? t("saving") : t("save")}
                </button>

                <button
                  className={styles.ghostBtn}
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                >
                  {t("cancel")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.leftCol}>
            <div className={styles.avatarCard}>
              <div className={styles.avatarRing}>
                <Avatar
                  src={avatarSrc}
                  className={styles.avatar}
                  sx={{
                    width: 110,
                    height: 110,
                    bgcolor: avatarSrc ? undefined : avatarFallback.bg,
                    color: avatarSrc ? undefined : avatarFallback.fg,
                    fontWeight: 900,
                  }}
                >
                  {!avatarSrc ? avatarFallback.letter : null}
                </Avatar>
              </div>

              <div className={styles.avatarMeta}>
                <div className={styles.nameLine}>
                  {userMe.first_name} {userMe.last_name}
                </div>
                <div className={styles.emailLine}>{userMe.email}</div>
              </div>

              {isEditing && (
                <label className={styles.uploadBtn}>
                  {t("changePhoto")}
                  <input
                    className={styles.hiddenInput}
                    type="file"
                    accept="image/*"
                    onChange={onChangeFile}
                  />
                </label>
              )}
            </div>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>{t("basicInfo")}</div>

              <div className={styles.grid}>
                <div className={styles.field}>
                  <label>{t("firstName")}</label>
                  <input
                    value={form.first_name}
                    onChange={(e) => onChangeField("first_name", e.target.value)}
                    disabled={!isEditing || saving}
                    placeholder={t("firstName")}
                  />
                </div>

                <div className={styles.field}>
                  <label>{t("lastName")}</label>
                  <input
                    value={form.last_name}
                    onChange={(e) => onChangeField("last_name", e.target.value)}
                    disabled={!isEditing || saving}
                    placeholder={t("lastName")}
                  />
                </div>

                <div className={styles.fieldFull}>
                  <label>{t("email")}</label>
                  {/* The email is the login identity and is managed by the school. */}
                  <input value={form.email} disabled readOnly placeholder={t("email")} />
                </div>
              </div>

              <div className={styles.hint}>{t("hint")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}