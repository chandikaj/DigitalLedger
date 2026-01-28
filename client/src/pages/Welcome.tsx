import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoImage from "@assets/9519F333-D03D-4EEC-9DBB-415A3407BBBF_1761967718151.jpeg";

type WelcomeStep = "newsletter" | "complete";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<WelcomeStep>("newsletter");
  const [subscribedToNewsletter, setSubscribedToNewsletter] = useState(false);

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: { email: string; categories: string[]; frequency: string }) => {
      return await apiRequest("/api/subscribers", "POST", data);
    },
    onSuccess: () => {
      setSubscribedToNewsletter(true);
      setStep("complete");
    },
    onError: () => {
      setStep("complete");
    },
  });

  const handleSubscribe = () => {
    const email = user?.email || user?.claims?.email;
    if (email) {
      subscribeMutation.mutate({
        email,
        categories: [],
        frequency: "weekly",
      });
    }
  };

  const handleSkip = () => {
    setSubscribedToNewsletter(false);
    setStep("complete");
  };

  const handleFinish = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    setLocation("/");
  };

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card className="w-full border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur text-center">
            <CardContent className="pt-8 pb-6">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to The Digital Ledger!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your account is ready. {subscribedToNewsletter && "You're subscribed to our newsletter!"}
              </p>
              <Button
                onClick={handleFinish}
                className="w-full"
                data-testid="button-finish-welcome"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <img src={logoImage} alt="The Digital Ledger" className="h-14 w-auto" />
          </div>
        </div>

        <Card className="w-full border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Bell className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Stay Informed</CardTitle>
            <CardDescription className="text-center">
              Would you like to subscribe to our newsletter?
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Button
                onClick={handleSubscribe}
                className="w-full"
                disabled={subscribeMutation.isPending}
                data-testid="button-welcome-subscribe"
              >
                {subscribeMutation.isPending ? "Subscribing..." : "Yes, subscribe me"}
              </Button>
              <Button
                onClick={handleSkip}
                variant="outline"
                className="w-full"
                data-testid="button-welcome-skip"
              >
                No thanks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
