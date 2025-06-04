"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const Landing = dynamic(() => import("./landing"), { ssr: false });

export default function Home() {
  return <Landing />;
}
