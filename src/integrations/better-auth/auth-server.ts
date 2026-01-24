import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { ConvexError } from "convex/values";

export const isAuthError = (error: unknown) => {
  const message =
    (error instanceof ConvexError && error.data) ||
    (error instanceof Error && error.message) ||
    "";
  return /auth/i.test(message);
};

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl: process.env.VITE_CONVEX_URL!,
  convexSiteUrl: process.env.VITE_CONVEX_SITE_URL!,
  jwtCache: {
    enabled: true,
    isAuthError,
  },
});
