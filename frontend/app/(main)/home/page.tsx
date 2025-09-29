"use client";

import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import styles from "./home.module.scss";

export default function Home() {

  return (
    <div className={styles.homeMainContainer} >
      Home
    </div>
  )

}