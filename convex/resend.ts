import { components, internal } from "./_generated/api";
import { Resend, vOnEmailEventArgs } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const resend: Resend = new Resend(components.resend, {
  onEmailEvent: internal.resend.handleEmailEvent,
  testMode: false,
});

export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: async (_ctx, args) => {
    console.log("Email event received:", args.event, "for email:", args.id);
  },
});

export const sendOtpEmail = internalMutation({
  args: {
    to: v.string(),
    otp: v.string(),
  },
  handler: async (ctx, { to, otp }) => {
    await resend.sendEmail(ctx, {
      from: "Recallable <noreply@mail.pow.kim>",
      to,
      subject: "Your verification code",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Verification Code</h2>
          <p style="font-size: 16px; color: #555;">Use the following code to sign in to your account:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #666;">This code expires in 5 minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999;">
            This is an automated email. Please do not reply to this message as replies are not monitored.
          </p>
        </div>
      `,
    });
  },
});
