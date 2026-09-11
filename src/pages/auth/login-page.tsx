import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Mail } from "lucide-react";

import { AuthLayout } from "@/pages/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth";
import { useLogin, extractApiErrorMessage } from "@/hooks/use-auth";

function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: () => navigate("/", { replace: true }),
    });
  };

  return (
    <AuthLayout
      title="Login to AISAN"
      subtitle="Lanjut chat sama AI assistant kamu."
      footer={
        <>
          Belum punya akun?{" "}
          <Link
            to="/register"
            className="font-medium text-primary hover:underline"
          >
            Register
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        {login.isError && (
          <p role="alert" className="text-sm text-destructive">
            {extractApiErrorMessage(login.error, "Login gagal, coba lagi.")}
          </p>
        )}

        <Button
          type="submit"
          className="group/button mt-1 w-fit"
          disabled={login.isPending}
        >
          {login.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Login
              <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

export { LoginPage };
