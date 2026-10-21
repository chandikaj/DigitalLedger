import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { resetPasswordSchema, type ResetPasswordRequest } from "@shared/schema";
import { KeyRound, ArrowLeft } from "lucide-react";

function getEmailFromQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("email") || "";
}

function parseErrorMessage(err: Error, fallback: string): string {
  const msg = err.message || "";
  const match = msg.match(/\{.*\}$/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed?.message) return parsed.message;
    } catch {}
  }
  return msg || fallback;
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [done, setDone] = useState(false);

  const form = useForm<ResetPasswordRequest>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "", code: "", newPassword: "" },
  });

  useEffect(() => {
    const email = getEmailFromQuery();
    if (email) form.setValue("email", email);
  }, [form]);

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      return await apiRequest("/api/auth/reset-password", "POST", data);
    },
    onSuccess: () => {
      setDone(true);
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
      setTimeout(() => setLocation("/login"), 1200);
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: parseErrorMessage(error, "Invalid or expired code"),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to your email and choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) =>
                mutation.mutate({ ...d, email: d.email.toLowerCase() }),
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        data-testid="input-reset-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>6-digit code</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        className="text-center text-2xl tracking-[0.5em] font-mono"
                        data-testid="input-reset-code"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        data-testid="input-new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending || done}
                data-testid="button-reset-password"
              >
                {mutation.isPending
                  ? "Updating..."
                  : done
                    ? "Password updated"
                    : "Reset password"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              href="/login"
              className="inline-flex items-center text-muted-foreground hover:text-foreground"
              data-testid="link-back-to-login"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to sign in
            </Link>
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground"
              data-testid="link-resend-reset-code"
            >
              Resend code
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
