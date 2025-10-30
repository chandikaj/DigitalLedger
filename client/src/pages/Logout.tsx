import { useEffect } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function Logout() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        queryClient.clear();
        setLocation("/login");
      } catch (error) {
        console.error("Logout error:", error);
        setLocation("/login");
      }
    };

    handleLogout();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Logging out...
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please wait while we sign you out
        </p>
      </div>
    </div>
  );
}
