import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { AuthLayout } from "@/pages/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { registerSchema, type RegisterFormValues } from "@/lib/validators/auth";
import { useRegister, extractApiErrorMessage } from "@/hooks/use-auth";

function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (values: RegisterFormValues) => {
    registerUser.mutate(values, {
      onSuccess: () => navigate("/", { replace: true }),
    });
  };

  return (
    <AuthLayout
      title="Buat akun AISAN"
      subtitle="Beres 1 menit, langsung bisa mulai ngobrol."
      footer={
        <>
          Udah punya akun?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Masuk
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nama</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Nama kamu"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="kamu@contoh.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Konfirmasi password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Ulangi password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>

        {registerUser.isError && (
          <p role="alert" className="text-sm text-destructive">
            {extractApiErrorMessage(
              registerUser.error,
              "Gagal daftar, coba lagi.",
            )}
          </p>
        )}

        <Button
          type="submit"
          className="mt-1 w-full"
          disabled={registerUser.isPending}
        >
          {registerUser.isPending && (
            <Loader2 className="size-4 animate-spin" />
          )}
          Daftar
        </Button>
      </form>
    </AuthLayout>
  );
}

export { RegisterPage };
