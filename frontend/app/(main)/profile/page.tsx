"use client";

import React, { useState, ChangeEvent, useEffect } from "react";
import Image from "next/image";
import styles from "./profile.module.scss";
import api from "@/interceptors";
import { UserMeData } from "./interface";
import { AxiosError, AxiosResponse } from "axios";

export default function ProfileSettings() {
    const [firstName, setFirstName] = useState<string>();
    const [lastName, setLastName] = useState<string>();
    const [email, setEmail] = useState<string>();
    const [profilePicFile, setProfilePicFile] = useState<File>();
    const [userMe, setUserMe] = useState<UserMeData>();
    const [isEditing, setIsEditing] = useState(false);




    useEffect(() => {
        api.get<UserMeData>("user/me/")
            .then((res: AxiosResponse<UserMeData>) => {
                setUserMe(res.data);
                setFirstName(res.data.first_name);
                setLastName(res.data.last_name);
                setEmail(res.data.email);
            })
            .catch((err: AxiosError) => console.log(err.message));
    }, []);




    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePicFile(file);
        }
    };





    const handleSave = async () => {
        if (!userMe) return;

        if (
            (firstName === userMe.first_name || !firstName?.trim()) &&
            (lastName === userMe.last_name || !lastName?.trim()) &&
            (email === userMe.email || !email?.trim()) &&
            !profilePicFile) {
            setIsEditing(false);
            return;
        }

        try {
            const formData = new FormData();

            formData.append("first_name", firstName ?? userMe.first_name);
            formData.append("last_name", lastName ?? userMe.last_name);
            formData.append("email", email ?? userMe.email);

            if (profilePicFile) {
                formData.append("profilePic", profilePicFile);
            }

            const res = await api.put("update/profile/", formData);

            setUserMe(res.data);
            setIsEditing(false);
            setProfilePicFile(undefined);
        }
        catch (err) {
            console.error(err);
        }
    };



    const handleCancel = () => {

        if (userMe) {
            setFirstName(userMe.first_name);
            setLastName(userMe.last_name);
            setEmail(userMe.email);
        }
        setProfilePicFile(undefined);
        setIsEditing(false);
    };



    


    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>Profile Settings</h2>

                <div className={styles.profilePicContainer}>
                    <div className={styles.imageWrapper}>
                        <Image
                            src={
                                profilePicFile
                                    ? URL.createObjectURL(profilePicFile)
                                    : userMe?.profilePic || "/default-avatar.png"
                            }
                            alt="Profile Picture"
                            className={styles.image}
                            width={50}
                            height={50}
                        />
                    </div>
                    {isEditing && (
                        <label className={styles.uploadButton}>
                            Change Picture
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className={styles.hiddenInput}
                            />
                        </label>
                    )}
                </div>

                <div className={styles.form}>
                    <div className={styles.field}>
                        <label>First Name</label>
                        <input
                            type="text"
                            value={firstName || ""}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className={styles.field}>
                        <label>Last Name</label>
                        <input
                            type="text"
                            value={lastName || ""}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className={styles.field}>
                        <label>Email</label>
                        <input
                            type="email"
                            value={email || ""}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                </div>

                <div className={styles.buttonGroup}>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className={styles.editButton}
                        >
                            Edit
                        </button>
                    ) : (
                        <div className={styles.buttonsWrapper} >
                            <button
                                onClick={handleSave}
                                className={styles.saveButton}
                            >
                                Save
                            </button>
                            <button
                                onClick={handleCancel}
                                className={styles.cancelButton}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}