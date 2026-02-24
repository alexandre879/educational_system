"use client";

import React, { useCallback, useEffect, useMemo, useState, ChangeEvent } from "react";
import { message } from "antd";
import styles from "./profile.module.scss";
import api from "@/interceptors";
import { FormState, UserMeData } from "./interface";
import { AxiosError } from "axios";
import { FaUserCircle } from "react-icons/fa";
import { Avatar } from "@mui/material";
import { letterToHsl } from "./utils";



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

export default function ProfileSettings() {
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

  const [avatarBust, setAvatarBust] = useState<number>(() => Date.now());

  const revokePreview = useCallback((url: string | null) => {
    if (!url) return;
    try {
      URL.revokeObjectURL(url);
    }
    catch {
      console.log('error has been caught');
    }
  }, []);


  const avatarSrc = useMemo(() => {
    if (preview) return preview;
    if (userMe?.profilePic) {
      const join = userMe.profilePic.includes("?") ? "&" : "?";
      return `${userMe.profilePic}${join}v=${avatarBust}`;
    }
    return undefined;
  }, [preview, userMe?.profilePic, avatarBust]);

  const load = async () => {
    try {
      const res = await api.get<UserMeData>("user/me/");
      setUserMe(res.data);
      setAvatarBust(Date.now());
      setForm({
        first_name: res.data.first_name ?? "",
        last_name: res.data.last_name ?? "",
        email: res.data.email ?? "",
      });
    } catch (err: unknown) {
      console.error(err);
      message.error("Failed to load profile");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onEdit = () => {
    if (!userMe) return;
    setIsEditing(true);
    setForm({
      first_name: userMe.first_name ?? "",
      last_name: userMe.last_name ?? "",
      email: userMe.email ?? "",
    });
    revokePreview(preview);
    setPreview(null);
    setSelectedFile(null);
  };

  const onCancel = () => {
    if (!userMe) return;
    setIsEditing(false);
    setSaving(false);
    setForm({
      first_name: userMe.first_name ?? "",
      last_name: userMe.last_name ?? "",
      email: userMe.email ?? "",
    });
    revokePreview(preview);
    setPreview(null);
    setSelectedFile(null);
  };

  const onChangeFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    revokePreview(preview);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const onChangeField = (key: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const onSave = async () => {
    if (!userMe) return;

    try {
      setSaving(true);

      const fd = new FormData();
      fd.append("first_name", form.first_name);
      fd.append("last_name", form.last_name);
      fd.append("email", form.email);

      if (selectedFile) fd.append("profilePic", selectedFile);

      const res = await api.patch<UserMeData>("update/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUserMe(res.data);
      setAvatarBust(Date.now());
      setIsEditing(false);
      setSelectedFile(null);

      if (!selectedFile) {
        revokePreview(preview);
        setPreview(null);
      }

      message.success("Profile updated");
    } 
    catch (err: unknown) {
      console.error(err);
      message.error(getAxiosDetail(err) ?? "Failed to update profile");
    } 
    finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      revokePreview(preview);
    };
  }, [preview, revokePreview]);

  if (!userMe) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <div className={styles.loading}>Loading profile…</div>
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
              <h1 className={styles.title}>Profile</h1>
              <p className={styles.subTitle}>Manage your personal information</p>
            </div>
          </div>

          <div className={styles.headerRight}>
            {!isEditing ? (
              <button className={styles.primaryBtn} type="button" onClick={onEdit}>
                Edit
              </button>
            ) : (
              <div className={styles.headerActions}>
                <button className={styles.saveBtn} type="button" onClick={onSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className={styles.ghostBtn} type="button" onClick={onCancel} disabled={saving}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.leftCol}>
            <div className={styles.avatarCard}>
              <div className={styles.avatarRing}>
                {(() => {
                  const av = letterToHsl(userMe.first_name);
                  return (
                    <Avatar
                      src={avatarSrc}
                      className={styles.avatar}
                      sx={{
                        width: 110,
                        height: 110,
                        bgcolor: avatarSrc ? undefined : av.bg,
                        color: avatarSrc ? undefined : av.fg,
                        fontWeight: 900,
                      }}
                    >
                      {!avatarSrc ? av.letter : null}
                    </Avatar>
                  );
                })()}
              </div>

              <div className={styles.avatarMeta}>
                <div className={styles.nameLine}>
                  {userMe.first_name} {userMe.last_name}
                </div>
                <div className={styles.emailLine}>{userMe.email}</div>
              </div>

              {isEditing && (
                <label className={styles.uploadBtn}>
                  Change photo
                  <input className={styles.hiddenInput} type="file" accept="image/*" onChange={onChangeFile} />
                </label>
              )}
            </div>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Basic info</div>

              <div className={styles.grid}>
                <div className={styles.field}>
                  <label>First name</label>
                  <input
                    value={form.first_name}
                    onChange={(e) => onChangeField("first_name", e.target.value)}
                    disabled={!isEditing || saving}
                    placeholder="First name"
                  />
                </div>

                <div className={styles.field}>
                  <label>Last name</label>
                  <input
                    value={form.last_name}
                    onChange={(e) => onChangeField("last_name", e.target.value)}
                    disabled={!isEditing || saving}
                    placeholder="Last name"
                  />
                </div>

                <div className={styles.fieldFull}>
                  <label>Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => onChangeField("email", e.target.value)}
                    disabled={!isEditing || saving}
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className={styles.hint}>Tip: Your email is used for login and notifications.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}