import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c]">
        <div className="text-sm text-[#6e6e78]">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
