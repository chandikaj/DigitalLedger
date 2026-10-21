import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="w-full border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to The Digital Ledger.
            </h2>
            <div className="space-y-3 text-left text-gray-600 dark:text-gray-400 mb-8">
              <p>A confirmation email is on its way.</p>
              <p>
                Be sure to check your spam or promotions folder just in case.
              </p>
              <p>Your account has been created successfully.</p>
              <p>We look forward to having you with us.</p>
            </div>
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="button-finish-registration"
            >
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
