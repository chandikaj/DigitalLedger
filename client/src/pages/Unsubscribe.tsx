import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, MailX, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Unsubscribe() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") ?? "";

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<{ isActive: boolean; email: string }>({
    queryKey: ["/api/subscribers/info", id],
    queryFn: () =>
      fetch(`/api/subscribers/info?id=${encodeURIComponent(id)}`).then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      }),
    enabled: !!id,
    retry: false,
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(
        `/api/subscribers/toggle?id=${encodeURIComponent(id)}`,
        "POST",
      );
    },
    onSuccess: () => {
      refetch();
      setTimeout(() => setLocation("/"), 1500);
    },
  });

  if (!id) {
    return (
      <PageShell>
        <MailX className="w-14 h-14 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Invalid link
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This unsubscribe link is missing required information.
        </p>
        <Button onClick={() => setLocation("/")}>Go to Home</Button>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell>
        <MailX className="w-14 h-14 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Subscription not found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          We couldn't find a subscription matching this link.
        </p>
        <Button onClick={() => setLocation("/")}>Go to Home</Button>
      </PageShell>
    );
  }

  if (toggleMutation.isSuccess) {
    return (
      <PageShell>
        <CheckCircle className="w-14 h-14 mx-auto text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          {data.isActive ? "You're subscribed!" : "You've been unsubscribed."}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Redirecting you home…</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {data.isActive ? (
        <>
          <MailX className="w-14 h-14 mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unsubscribe
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            You are currently subscribed with{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {data.email}
            </span>
            . Click below to stop receiving emails from The Digital Ledger.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            data-testid="button-unsubscribe"
          >
            {toggleMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Unsubscribe
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => setLocation("/")}
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          <CheckCircle className="w-14 h-14 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You are unsubscribed
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {data.email}
            </span>{" "}
            is no longer receiving emails from The Digital Ledger. Changed your
            mind?
          </p>
          <Button
            className="w-full"
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            data-testid="button-resubscribe"
          >
            {toggleMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Subscribe again
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => setLocation("/")}
          >
            Go to Home
          </Button>
        </>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
        <CardContent className="pt-10 pb-8 px-8 text-center">{children}</CardContent>
      </Card>
    </div>
  );
}
