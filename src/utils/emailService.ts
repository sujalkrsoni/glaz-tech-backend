import { config } from "../config/config";
import nodemailer, { Transporter } from "nodemailer";
import { generateOtpTemplate } from "./emailTemplate";

interface EmailPayload {
  to: string;
  otp: string;
  userName?: string;
}

export async function sendEmail({ to, otp, userName = "User" }: EmailPayload) {
  const senderName = "DesiMiles";
  const senderEmail = config.email.user;
  const supportEmail =
    config.email.supportEmail || senderEmail || "support@desimiles.com";
  const brandName = "DesiMiles";
  const logoUrl = "";
  const expiryMinutes = 10;

  if (!to || !otp) {
    console.log("❌ Email Validation Error: Missing 'to' or 'otp'");
    return;
  }

  let transporter: Transporter;

  try {
    const emailPass = (config.email.pass || "").toString().replace(/\s+/g, "");
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.email.user,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject: `${brandName} - Email verification code`,
      text: `Hello ${userName},\n\nYour verification code for ${brandName} is: ${otp}\n\nThis code is valid for ${expiryMinutes} minutes.\n\nIf you did not request this, please ignore this email.`,
      html: generateOtpTemplate(otp, userName, {
        brandName,
        supportEmail,
        logoUrl,
        expiryMinutes,
      }),
    };

    const info = await transporter.sendMail(mailOptions);

    if (!info?.messageId) {
      console.log("❌ Email Send Failed: No message ID returned.");
      return;
    }

    if (config.env !== "production")
      console.log("📧 Email sent successfully:", {
        to,
        otp,
        accepted: info.accepted,
        rejected: info.rejected,
        messageId: info.messageId,
      });

    return info;
  } catch (error: any) {
    console.log("❌ Email Send Error", {
      to,
      otp,
      error: error?.message || error,
    });
  }
}
