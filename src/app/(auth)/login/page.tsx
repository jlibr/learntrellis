import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0F0E0D]">
        <div className="text-sm text-[#8A8480]">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
