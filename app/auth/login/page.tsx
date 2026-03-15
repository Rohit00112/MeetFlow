import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <LoginForm
      googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)}
    />
  );
}
