type OtpTemplateOptions = {
  brandName?: string;
  supportEmail?: string;
  logoUrl?: string;
  expiryMinutes?: number;
};

export const generateOtpTemplate = (
  otp: string,
  userName = "User",
  options: OtpTemplateOptions = {},
) => {
  const brandName = options.brandName || "DesiMiles";
  const supportEmail = options.supportEmail || "support@desimiles.com";
  const logoUrl = options.logoUrl || "";
  const expiryMinutes = options.expiryMinutes ?? 10;
  const safeOtp = String(otp || "").trim();
  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${brandName}" width="140" style="display:block;border:0;outline:none;text-decoration:none;" />`
    : `<div style="font-size:22px;font-weight:700;letter-spacing:0.5px;color:#ffffff;">${brandName}</div>`;

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${brandName} - Email Verification</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your ${brandName} verification code is ${safeOtp}. It expires in ${expiryMinutes} minutes.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
            <tr>
              <td style="background-color:#0b57d0;padding:22px 28px;border-radius:14px 14px 0 0;">
                ${logoBlock}
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;padding:28px;border-radius:0 0 14px 14px;border:1px solid #e7ebf3;">
                <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:18px;font-weight:700;margin-bottom:12px;">
                  Verify your email
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;color:#4b5563;font-size:15px;line-height:22px;margin-bottom:16px;">
                  Hi ${userName},<br />
                  Use this code to verify your email for ${brandName}.
                </div>
                <div style="text-align:center;margin:18px 0 16px 0;">
                  <span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;letter-spacing:8px;color:#111827;">
                    ${safeOtp}
                  </span>
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:13px;line-height:20px;margin-bottom:20px;">
                  This code expires in ${expiryMinutes} minutes. For your security, do not share this code with anyone.
                </div>
                <div style="border-top:1px solid #e5e7eb;padding-top:14px;font-family:Arial,Helvetica,sans-serif;color:#9ca3af;font-size:12px;line-height:18px;">
                  If you did not request this email, you can safely ignore it. Need help? Contact us at
                  <span style="color:#0b57d0;">${supportEmail}</span>.
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;color:#9aa3b2;font-size:12px;">
                ${brandName} - Secure verification powered by DesiMiles
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};
