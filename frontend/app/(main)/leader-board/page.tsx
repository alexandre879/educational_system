"use client";

import React, { useEffect, useState } from "react";
import api from "@/interceptors";
import styles from "./leader-board.module.scss";

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
      <h1>Leaderboard</h1>
      <table>
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Points</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user, index) => (
            <tr key={index}>
              <td>{user.first_name}</td>
              <td>{user.last_name}</td>
              <td>{user.email}</td>
              <td>{user.points}</td>
              <td>{index + 1}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}