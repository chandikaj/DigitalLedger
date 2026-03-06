import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"alerts" | "complete">("alerts");
  const [subscribed, setSubscribed] = useState(false);

  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"] });

  const subscribeMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      categories: string[];
      frequency: string;
    }) => {
      return await apiRequest("/api/subscribers", "POST", data);
    },
    onSuccess: () => {
      setSubscribed(true);
      setStep("complete");
    },
    onError: () => {
      setStep("complete");
    },
  });

  const handleYes = () => {
    const email = user?.email || "";
    subscribeMutation.mutate({ email, categories: [], frequency: "weekly" });
  };

  const handleNo = () => {
    setSubscribed(false);
    setStep("complete");
  };

  const handleGetStarted = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {step === "alerts" && (
          <Card className="w-full border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-2">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl text-center">
                Stay Informed
              </CardTitle>
              <CardDescription className="text-center">
                Do you want to subscribe to the newsletter?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Button
                  onClick={handleYes}
                  className="w-full"
                  disabled={subscribeMutation.isPending}
                  data-testid="button-want-alerts-yes"
                >
                  {subscribeMutation.isPending ? "Subscribing..." : "Yes"}
                </Button>
                <Button
                  onClick={handleNo}
                  variant="outline"
                  className="w-full"
                  data-testid="button-want-alerts-no"
                >
                  No thanks
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "complete" && (
          <Card className="w-full border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur text-center">
            <CardContent className="pt-8 pb-8">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to The Digital Ledger.
              </h2>
              <div className="space-y-3 text-left text-gray-600 dark:text-gray-400 mb-8">
                <p>Your account has been created successfully.</p>
                {subscribed && (
                  <>
                    <p>A confirmation email is on its way.</p>
                    <p>
                      Please check your spam or promotions folder if you don't
                      see it shortly.
                    </p>
                  </>
                )}
              </div>
              <Button
                onClick={handleGetStarted}
                className="w-full"
                data-testid="button-finish-registration"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
