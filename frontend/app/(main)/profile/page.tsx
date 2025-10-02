"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import styles from "./profile.module.scss";
import api from "@/interceptors";
import { UserMeData } from "./interface";
import { AxiosResponse } from "axios";

export default function ProfileSettings() {
  const [userMe, setUserMe] = useState<UserMeData>();
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    api
      .get<UserMeData>("user/me/")
      .then((res: AxiosResponse<UserMeData>) => setUserMe(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userMe) return;

    const formData = new FormData();
    formData.append("first_name", (e.currentTarget.elements.namedItem("first_name") as HTMLInputElement).value);
    formData.append("last_name", (e.currentTarget.elements.namedItem("last_name") as HTMLInputElement).value);
    formData.append("email", (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value);

    if (selectedFile) {
      formData.append("profilePic", selectedFile);
    }

    try {
      const res = await api.patch("update/profile/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUserMe(res.data);
      setIsEditing(false);
      setSelectedFile(null);
      setPreview(null);
    } 
    catch (err: any) {
      console.error("Error updating profile:", err.response?.data || err.message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedFile(null);
    setPreview(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Profile Settings</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Profile Picture */}
          <div className={styles.profilePicContainer}>
            <div className={styles.imageWrapper}>
              <Image
                src={preview || userMe?.profilePic || "/default-avatar.png"}
                alt="Profile Picture"
                className={styles.image}
                width={110}
                height={110}
              />
            </div>
            {isEditing && (
              <label className={styles.uploadButton}>
                Change Picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={styles.hiddenInput}
                />
              </label>
            )}
          </div>

          {/* First Name */}
          <div className={styles.field}>
            <label>First Name</label>
            <input
              type="text"
              name="first_name"
              defaultValue={userMe?.first_name}
              disabled={!isEditing}
            />
          </div>

          {/* Last Name */}
          <div className={styles.field}>
            <label>Last Name</label>
            <input
              type="text"
              name="last_name"
              defaultValue={userMe?.last_name}
              disabled={!isEditing}
            />
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              defaultValue={userMe?.email}
              disabled={!isEditing}
            />
          </div>

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            {!isEditing ? (
              <button
                type="button"
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            ) : (
              <div className={styles.buttonsWrapper}>
                <button type="submit" className={styles.saveButton}>
                  Save
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}