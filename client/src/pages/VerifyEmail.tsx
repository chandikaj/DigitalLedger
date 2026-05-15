import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, MailCheck } from "lucide-react";
import logoImage from "@assets/9519F333-D03D-4EEC-9DBB-415A3407BBBF_1761967718151.jpeg";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";

  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      setLocation("/login");
    }
  }, [email, setLocation]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: async () =>
      apiRequest("/api/auth/verify-email", "POST", { email, code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Email verified",
        description: "Welcome to The Digital Ledger!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message?.replace(/^\d+:\s*/, "") || "Invalid or expired code",
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () =>
      apiRequest("/api/auth/resend-verification", "POST", { email }),
    onSuccess: () => {
      toast({
        title: "Code sent",
        description: "Check your inbox for the new code.",
      });
      setCooldown(60);
    },
    onError: (error: any) => {
      const msg = error.message?.replace(/^\d+:\s*/, "") || "Failed to resend code";
      const match = msg.match(/wait\s+(\d+)s/);
      if (match) setCooldown(parseInt(match[1], 10));
      toast({
        title: "Could not resend",
        description: msg,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({
        title: "Enter all 6 digits",
        description: "Your verification code is 6 digits long.",
        variant: "destructive",
      });
      return;
    }
    verifyMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={logoImage} alt="The Digital Ledger" className="h-14 w-auto mx-auto" />
        </div>

        <Card className="w-full border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <MailCheck className="h-10 w-10 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                data-testid="input-verification-code"
                autoFocus
              />

              <Button
                type="submit"
                className="w-full"
                disabled={verifyMutation.isPending || code.length !== 6}
                data-testid="button-verify-submit"
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify Email"}
              </Button>

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={() => resendMutation.mutate()}
                  disabled={cooldown > 0 || resendMutation.isPending}
                  className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                  data-testid="button-resend-code"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="ghost"
            className="text-sm text-gray-600 dark:text-gray-400"
            onClick={() => setLocation("/login")}
            data-testid="link-back-login"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
