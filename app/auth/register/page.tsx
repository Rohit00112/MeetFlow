import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <RegisterForm
      googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)}
    />
  );
}
