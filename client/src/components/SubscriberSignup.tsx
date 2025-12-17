import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Tags, Clock, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import type { NewsCategory } from "@shared/schema";

type Step = 1 | 2 | 3 | 4;

interface SubscriberData {
  email: string;
  categories: string[];
  frequency: string;
}

export function SubscriberSignup() {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<SubscriberData>({
    email: "",
    categories: [],
    frequency: "weekly",
  });
  const [emailError, setEmailError] = useState("");
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news-categories"],
  });

  const subscribeMutation = useMutation({
    mutationFn: async (subscriberData: SubscriberData) => {
      const response = await apiRequest("POST", "/api/subscribers", subscriberData);
      return response.json();
    },
    onSuccess: () => {
      setStep(4);
      toast({
        title: "Success!",
        description: "You've been subscribed to our newsletter.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateEmail(data.email)) return;
    }
    setStep((prev) => Math.min(prev + 1, 3) as Step);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1) as Step);
  };

  const handleSubmit = () => {
    subscribeMutation.mutate(data);
  };

  const toggleCategory = (categoryId: string) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const frequencyOptions = [
    { value: "daily", label: "Daily", description: "Get updates every day" },
    { value: "weekly", label: "Weekly", description: "A weekly digest every Monday" },
    { value: "bi-weekly", label: "Bi-Weekly", description: "Updates every two weeks" },
    { value: "monthly", label: "Monthly", description: "A monthly roundup" },
  ];

  const stepIndicators = [
    { step: 1, icon: Mail, label: "Email" },
    { step: 2, icon: Tags, label: "Categories" },
    { step: 3, icon: Clock, label: "Frequency" },
  ];

  if (step === 4) {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">
            You're All Set!
          </h3>
          <p className="text-green-600 dark:text-green-400">
            Thank you for subscribing. You'll receive updates at {data.email}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="subscriber-signup">
      <CardHeader>
        <CardTitle className="text-xl">Subscribe to Updates</CardTitle>
        <CardDescription>
          Stay informed about the latest in AI, Finance & Accounting
        </CardDescription>
        <div className="flex justify-center gap-2 pt-4">
          {stepIndicators.map(({ step: s, icon: Icon, label }) => (
            <div
              key={s}
              className={`flex flex-col items-center gap-1 ${
                s === step
                  ? "text-primary"
                  : s < step
                  ? "text-green-500"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  s === step
                    ? "border-primary bg-primary/10"
                    : s < step
                    ? "border-green-500 bg-green-100 dark:bg-green-900"
                    : "border-muted"
                }`}
              >
                {s < step ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-medium">{label}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={data.email}
                onChange={(e) => {
                  setData({ ...data, email: e.target.value });
                  if (emailError) validateEmail(e.target.value);
                }}
                data-testid="input-email"
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && (
                <p className="text-sm text-red-500">{emailError}</p>
              )}
            </div>
            <Button
              onClick={handleNext}
              className="w-full"
              data-testid="button-next-step1"
            >
              Next <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Label>Select categories you're interested in</Label>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    data.categories.includes(category.id)
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                  onClick={() => toggleCategory(category.id)}
                  data-testid={`category-${category.slug}`}
                >
                  <Checkbox
                    checked={data.categories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {data.categories.length === 0
                ? "Select at least one category, or skip to receive all updates"
                : `${data.categories.length} category(ies) selected`}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 w-4 h-4" /> Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
                data-testid="button-next-step2"
              >
                Next <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Label>How often would you like to receive updates?</Label>
            <RadioGroup
              value={data.frequency}
              onValueChange={(value) => setData({ ...data, frequency: value })}
              className="space-y-3"
            >
              {frequencyOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    data.frequency === option.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                  onClick={() => setData({ ...data, frequency: option.value })}
                  data-testid={`frequency-${option.value}`}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div>
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 w-4 h-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={subscribeMutation.isPending}
                data-testid="button-submit"
              >
                {subscribeMutation.isPending ? "Subscribing..." : "Subscribe"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
