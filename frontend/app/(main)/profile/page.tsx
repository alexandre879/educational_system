// "use client";

// import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
// import { Image } from 'antd';
// import styles from "./profile.module.scss";
// import api from "@/interceptors";
// import { UserMeData } from "./interface";
// import { AxiosResponse } from "axios";

// export default function ProfileSettings() {
//   const [userMe, setUserMe] = useState<UserMeData>();
//   const [isEditing, setIsEditing] = useState(false);
//   const [preview, setPreview] = useState<string | null>(null);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);

//   useEffect(() => {
//     api
//       .get<UserMeData>("user/me/")
//       .then((res: AxiosResponse<UserMeData>) => setUserMe(res.data))
//       .catch((err) => console.error(err));
//   }, []);

//   const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setSelectedFile(file);
//       setPreview(URL.createObjectURL(file));
//     }
//   };

//   const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!userMe) return;

//     const formData = new FormData();
//     formData.append("first_name", (e.currentTarget.elements.namedItem("first_name") as HTMLInputElement).value);
//     formData.append("last_name", (e.currentTarget.elements.namedItem("last_name") as HTMLInputElement).value);
//     formData.append("email", (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value);

//     if (selectedFile) {
//       formData.append("profilePic", selectedFile);
//     }

//     try {
//       const res = await api.patch("update/profile/", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setUserMe(res.data);
//       setIsEditing(false);
//       setSelectedFile(null);
//       setPreview(null);
//     } 
//     catch (err: any) {
//       console.error("Error updating profile:", err.response?.data || err.message);
//     }
//   };

//   const handleCancel = () => {
//     setIsEditing(false);
//     setSelectedFile(null);
//     setPreview(null);
//   };

//   return (
//     <div className={styles.container}>
//       <div className={styles.card}>
//         <h2 className={styles.title}>Profile Settings</h2>

//         <form onSubmit={handleSubmit} className={styles.form}>
//           {/* Profile Picture */}
//           <div className={styles.profilePicContainer}>
//             <div className={styles.imageWrapper}>
//               <Image
//                 src={preview || userMe?.profilePic || "/default-avatar.png"}
//                 alt="Profile Picture"
//                 width={100}
//                 height={100}
//               />
//             </div>
//             {isEditing && (
//               <label className={styles.uploadButton}>
//                 Change Picture
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={handleFileChange}
//                   className={styles.hiddenInput}
//                 />
//               </label>
//             )}
//           </div>

//           {/* First Name */}
//           <div className={styles.field}>
//             <label>First Name</label>
//             <input
//               type="text"
//               name="first_name"
//               defaultValue={userMe?.first_name}
//               disabled={!isEditing}
//             />
//           </div>

//           {/* Last Name */}
//           <div className={styles.field}>
//             <label>Last Name</label>
//             <input
//               type="text"
//               name="last_name"
//               defaultValue={userMe?.last_name}
//               disabled={!isEditing}
//             />
//           </div>

//           {/* Email */}
//           <div className={styles.field}>
//             <label>Email</label>
//             <input
//               type="email"
//               name="email"
//               defaultValue={userMe?.email}
//               disabled={!isEditing}
//             />
//           </div>

//           {/* Buttons */}
//           <div className={styles.buttonGroup}>
//             {!isEditing ? (
//               <button
//                 type="button"
//                 className={styles.editButton}
//                 onClick={() => setIsEditing(true)}
//               >
//                 Edit
//               </button>
//             ) : (
//               <div className={styles.buttonsWrapper}>
//                 <button type="submit" className={styles.saveButton}>
//                   Save
//                 </button>
//                 <button
//                   type="button"
//                   className={styles.cancelButton}
//                   onClick={handleCancel}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             )}
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }



"use client";

import React, { useEffect, useMemo, useState, ChangeEvent } from "react";
import { Image, message } from "antd";
import styles from "./profile.module.scss";
import api from "@/interceptors";
import { UserMeData } from "./interface";
import { AxiosError, AxiosResponse } from "axios";
import { FaUserCircle } from "react-icons/fa";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
};

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

  const avatarSrc = useMemo(() => {
    return preview || userMe?.profilePic || "/default-avatar.png";
  }, [preview, userMe?.profilePic]);

  const load = async () => {
    try {
      const res = await api.get<UserMeData>("user/me/");
      setUserMe(res.data);
      setForm({
        first_name: res.data.first_name ?? "",
        last_name: res.data.last_name ?? "",
        email: res.data.email ?? "",
      });
    } catch (err) {
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
    setPreview(null);
    setSelectedFile(null);
  };

  const onChangeFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      const res = await api.patch("update/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUserMe(res.data);
      setIsEditing(false);
      setSelectedFile(null);
      setPreview(null);

      message.success("Profile updated");
    } catch (error: unknown) {
      const err = error as AxiosError<any>;
      console.error(err);
      message.error(err.response?.data?.detail ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

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
        {/* Header */}
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
                <button
                  className={styles.saveBtn}
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className={styles.ghostBtn} type="button" onClick={onCancel} disabled={saving}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.leftCol}>
            <div className={styles.avatarCard}>
              <div className={styles.avatarRing}>
                <Image src={avatarSrc} alt="Profile" width={110} height={110} preview={false} />
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

              <div className={styles.hint}>
                Tip: Your email is used for login and notifications.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}