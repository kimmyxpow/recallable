import { useState, useEffect, useTransition } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { authClient } from "@/integrations/better-auth/auth-client";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({
        to: "/notes",
        search: { parentId: undefined, noteId: undefined },
      });
    }
  },
  component: LoginPage,
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const emailSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Verification code must be 6 digits"),
});

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visibleChars = Math.min(3, local.length);
  const masked = local.slice(0, visibleChars) + "***";
  return `${masked}@${domain}`;
}

function LoginPage() {
  const [otpSent, setOtpSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [otpError, setOtpError] = useState<string | null>(null);
  const navigate = useNavigate({ from: Route.id });

  useEffect(() => {
    if (!otpSent) {
      setResendCountdown(60);
      setCanResend(false);
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [otpSent]);

  const handleResendOtp = () => {
    if (!canResend || isPending) return;
    startTransition(async () => {
      await authClient.emailOtp.sendVerificationOtp({
        email: submittedEmail,
        type: "sign-in",
      });
      setResendCountdown(60);
      setCanResend(false);
    });
  };

  const emailForm = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: emailSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.emailOtp.sendVerificationOtp({
        email: value.email,
        type: "sign-in",
      });
      setSubmittedEmail(value.email);
      setOtpSent(true);
    },
  });

  const otpForm = useForm({
    defaultValues: {
      otp: "",
    },
    validators: {
      onSubmit: otpSchema,
    },
    onSubmit: async ({ value }) => {
      setOtpError(null);
      const { error } = await authClient.signIn.emailOtp({
        email: submittedEmail,
        otp: value.otp,
      });
      if (error) {
        setOtpError(
          error.message ?? "Invalid verification code. Please try again."
        );
        return;
      }
      navigate({ to: "/notes", search: { parentId: undefined, noteId: undefined } });
    },
  });

  const [isGooglePending, startGoogleTransition] = useTransition();
  const [isGithubPending, startGithubTransition] = useTransition();

  const handleGoogleSignIn = () => {
    startGoogleTransition(async () => {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/notes",
      });
    });
  };

  const handleGithubSignIn = () => {
    startGithubTransition(async () => {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/notes",
      });
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome to Recallable</h1>
          <p className="text-muted-foreground">Sign in to start writing</p>
        </div>
        <CardContent className="flex flex-col gap-4">
          {!otpSent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                emailForm.handleSubmit();
              }}
              className="flex flex-col gap-2"
            >
              <FieldGroup>
                <emailForm.Field
                  name="email"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="email"
                          placeholder="you@example.com"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          autoComplete="email"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                        <FieldDescription>
                          We'll send you a magic code
                        </FieldDescription>
                      </Field>
                    );
                  }}
                />
              </FieldGroup>
              <emailForm.Subscribe
                selector={(state) => state.isSubmitting}
                children={(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Spinner />}
                    {isSubmitting ? "Sending..." : "Continue with Email"}
                  </Button>
                )}
              />
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                otpForm.handleSubmit();
              }}
              className="flex flex-col gap-2"
            >
              <FieldGroup>
                <p className="text-sm text-center text-muted-foreground">
                  Enter the code sent to {maskEmail(submittedEmail)}
                </p>
                <otpForm.Field
                  name="otp"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Magic Code</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="text"
                          placeholder="000000"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                            if (otpError) setOtpError(null);
                          }}
                          aria-invalid={isInvalid || !!otpError}
                          maxLength={6}
                          autoComplete="one-time-code"
                        />
                        <FieldDescription>
                          Didn't receive the email? Check your spam folder.
                        </FieldDescription>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                        {otpError && (
                          <p className="text-sm text-destructive">{otpError}</p>
                        )}
                      </Field>
                    );
                  }}
                />
              </FieldGroup>
              <otpForm.Subscribe
                selector={(state) => state.isSubmitting}
                children={(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Spinner />}
                    {isSubmitting ? "Checking..." : "Continue"}
                  </Button>
                )}
              />
              {canResend ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={isPending}
                >
                  {isPending && <Spinner />}
                  {isPending ? "Sending..." : "Send new code"}
                </Button>
              ) : (
                <p className="text-xs text-center text-muted-foreground">
                  Resend code in {resendCountdown}s
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOtpSent(false);
                  setOtpError(null);
                  setResendCountdown(60);
                  setCanResend(false);
                  otpForm.reset();
                  emailForm.reset();
                }}
              >
                Try a different email
              </Button>
            </form>
          )}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isGooglePending || isGithubPending}
          >
            {isGooglePending ? <Spinner /> : <GoogleIcon />}
            Continue with Google
          </Button>
          <Button
            variant="outline"
            onClick={handleGithubSignIn}
            disabled={isGooglePending || isGithubPending}
          >
            {isGithubPending ? <Spinner /> : <GithubIcon />}
            Continue with GitHub
          </Button>
        </CardContent>
      </div>
    </div>
  );
}
