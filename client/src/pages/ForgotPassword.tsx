import { useState } from "react";
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
import { forgotPasswordSchema, type ForgotPasswordRequest } from "@shared/schema";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [googleAccount, setGoogleAccount] = useState(false);

  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordRequest) => {
      setGoogleAccount(false);
      return await apiRequest("/api/auth/forgot-password", "POST", data);
    },
    onSuccess: (response, variables) => {
      if (response?.googleAccount) {
        // No password on this account — show the explanation instead of
        // sending the visitor to the code-entry page.
        setGoogleAccount(true);
        return;
      }
      setSubmitted(true);
      toast({
        title: "Check your email",
        description: "If an account exists, we sent a 6-digit reset code.",
      });
      setTimeout(() => {
        setLocation(`/reset-password?email=${encodeURIComponent(variables.email)}`);
      }, 800);
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>
            Enter your account email and we'll send you a 6-digit code to reset it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {googleAccount && (
            <div
              className="mb-4 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-4 text-sm text-blue-900 dark:text-blue-100"
              data-testid="notice-google-account"
            >
              <p className="font-medium mb-1">This account signs in with Google</p>
              <p>
                There's no password to reset. Just use the{" "}
                <strong>Continue with Google</strong> button on the sign-in page —
                no reset code is needed.
              </p>
              <Link
                href="/login"
                className="mt-3 inline-block font-medium underline underline-offset-2"
                data-testid="link-google-signin"
              >
                Go to sign in
              </Link>
            </div>
          )}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
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
                        placeholder="you@example.com"
                        autoComplete="email"
                        data-testid="input-forgot-email"
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
                disabled={mutation.isPending || submitted}
                data-testid="button-send-reset-code"
              >
                {mutation.isPending ? "Sending..." : submitted ? "Code sent" : "Send reset code"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              data-testid="link-back-to-login"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
