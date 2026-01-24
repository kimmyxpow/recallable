import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/_app/dashboard/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.auth.getCurrentUser, {})
    );
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { data: user } = useSuspenseQuery(
    convexQuery(api.auth.getCurrentUser, {})
  );

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          location.reload();
        },
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Dashboard</CardTitle>
          <CardDescription>
            Welcome back, {user?.name ?? "User"}!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email ?? "N/A"}</p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">User ID</p>
            <p className="font-mono text-sm">{user?._id ?? "N/A"}</p>
          </div>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
