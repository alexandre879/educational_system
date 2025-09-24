"use client";

import React, { useEffect, useState } from "react";
import api from "@/interceptors";
import styles from "./leader-board.module.scss";
import Image from "next/image";

interface LeaderboardEntry {
  first_name: string;
  last_name: string;
  email: string;
  points: number;
}

export default function LeaderBoard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.post("/points/leaderboard/", {});
        setData(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className={styles.leaderboardMainContainer}>
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
          {data.map((user, index) => (
            <tr key={index}>
              <td>{user.first_name} {user.last_name}</td>
              <td>{user.email.slice(0, 3) + '...@gmail.com'}</td>
              <td>
                <div className={styles.pointWrapper} >
                  <Image className={styles.pointIcon} src={'/point.svg'} width={25} height={25} alt="Point-icon" />
                  {user.points}
                </div>
              </td>
              <td>
                <div className={`${index + 1 == 1 ?
                  styles.positionWrapperGold :
                  index + 1 == 2 ?
                    styles.positionWrapperSilver :
                    styles.positionWrapperBronce}`}
                >
                  {index + 1}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}