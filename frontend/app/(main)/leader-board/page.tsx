"use client";

import React, { useEffect, useState } from "react";
import api from "@/interceptors";
import styles from "./leader-board.module.scss";
import Image from "next/image";
import { Button, Dropdown } from "antd";
import { LeaderboardEntry, Subject } from "./interface";

export default function LeaderBoard() {
  const [dropDownData, setDropdownData] = useState<Subject[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);



  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get<Subject[]>("/my_subjects/");
        setDropdownData(res.data);
      } 
      catch (error) {
        console.error(error);
      }
    };
    fetchSubjects();
  }, []);





  const handleSubjectClick = async (subject: Subject) => {

    const {pk: subjectID, grade__category__pk: categoryID, grade__pk: gradeID} = subject


    try {
      const res = await api.get<LeaderboardEntry[]>(`/leader-board/list/${subjectID}/${gradeID}/${categoryID}/`);
      setLeaderboard(res.data);
    } 
    catch (error) {
      console.error(error);
    }
  };

  const menuItems = dropDownData.map((item: Subject) => ({
    key: item.pk,
    label: item.name,
    onClick: () => handleSubjectClick(item)
  }));



  return (
    <div className={styles.leaderboardMainContainer}>
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomLeft"
        trigger={["click"]}
        arrow={{ pointAtCenter: true }}
      >
        <Button>
          <span>Choose the subject</span>
        </Button>
      </Dropdown>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Points</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard
            .sort((a, b) => b.points - a.points)
            .map((user, index) => (
              <tr key={index}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>
                  <div className={styles.pointWrapper}>
                    <Image
                      className={styles.pointIcon}
                      src="/point.svg"
                      width={25}
                      height={25}
                      alt="Point-icon"
                    />
                    {user.points}
                  </div>
                </td>
                <td>
                  <div className={
                    index + 1 === 1 ? styles.positionWrapperGold :
                    index + 1 === 2 ? styles.positionWrapperSilver :
                    index + 1 === 3 ? styles.positionWrapperBronce :
                    styles.positionWrapperNormal
                  }>
                    {index + 1}
                  </div>
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}