import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create your account | AI Resume Analyzer" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}