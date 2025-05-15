"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Landing = dynamic(() => import("./landing"), { ssr: false });

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loggedIn = !!localStorage.getItem("token");
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        router.replace("/dashboard");
      }
    }
  }, [router]);

  if (isLoggedIn === null) return null; // or a loading spinner
  return !isLoggedIn ? <Landing /> : null;
}
