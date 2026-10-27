"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ResumeBuilderEditor } from "@/components/resume-builder-editor";

export default function ResumeBuilderPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    } else if (user.role !== "CANDIDATE") {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "CANDIDATE") {
    return (
      <main className="ui-empty">
        <p role="status">Checking your session...</p>
      </main>
    );
  }

  return (
    <ResumeBuilderEditor
      key={user.id}
      initialName={user.name}
      initialEmail={user.email}
    />
  );
}