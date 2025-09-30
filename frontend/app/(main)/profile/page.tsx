"use client";

import React, { useState, ChangeEvent, useEffect } from "react";
import Image from "next/image";
import styles from "./profile.module.scss";
import api from "@/interceptors";
import { UserMeData } from "./interface";
import { AxiosError, AxiosResponse } from "axios";

export default function ProfileSettings() {
    const [firstName, setFirstName] = useState<string | null>(null);
    const [lastName, setLastName] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [userMe, setUserMe] = useState<UserMeData | null>(null)



    useEffect(() => {
        api.get<UserMeData>('user/me/')
            .then((res: AxiosResponse<UserMeData>) => { setUserMe(res.data), console.log(res.data) })
            .catch((err: AxiosError) => console.log(err.message));
    }, []);


    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePicFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };


    const handleSave = async () => {
        try {
            const formData = new FormData();
            formData.append("first_name", firstName ?? '');
            formData.append("last_name", lastName ?? '');
            formData.append("email", email ?? '');

            if (profilePicFile) {
                formData.append("profilePic", profilePicFile);
            }

            const res = await api.put('update/profile/', formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            console.log(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>Profile Settings</h2>

                {/* Profile Picture */}
                <div className={styles.profilePicContainer}>
                    <div className={styles.imageWrapper}>
                        <Image
                            src={userMe?.profilePic || "/default-avatar.png"}
                            alt="Profile Picture"
                            className={styles.image}
                            width={50}
                            height={50}
                        />
                    </div>
                    <label className={styles.uploadButton}>
                        Change Picture
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className={styles.hiddenInput}
                        />
                    </label>
                </div>

                {/* Input Fields */}
                <div className={styles.form}>
                    <div className={styles.field}>
                        <label>First Name</label>
                        <input
                            type="text"
                            value={firstName ?? userMe?.first_name}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </div>
                    <div className={styles.field}>
                        <label>Last Name</label>
                        <input
                            type="text"
                            value={lastName ?? userMe?.last_name}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                    <div className={styles.field}>
                        <label>Email</label>
                        <input
                            type="email"
                            value={email ?? userMe?.email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                {/* Save Button */}
                <button onClick={handleSave} className={styles.saveButton}>
                    Save Changes
                </button>
            </div>
        </div>
    );
}