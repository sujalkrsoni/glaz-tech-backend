import { config } from "../config/config";

interface SmsPayload {
  mobile: string;
  otp: string;
}

export class SmsService {
  private static instance: SmsService;

  private constructor() { }

  public static getInstance(): SmsService {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService();
    }
    return SmsService.instance;
  }

  /**
   * Replace template variables like {otp} or {OTP}
   */
  private replaceVariables(
    message: string,
    variables?: Record<string, string | number>,
  ): string {
    if (!variables) return message;

    let finalMessage = message;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, "gi");
      finalMessage = finalMessage.replace(regex, String(value));
      const dltRegex = new RegExp(`\\{#${key}#\\}`, "gi");
      finalMessage = finalMessage.replace(dltRegex, String(value));
    });

    return finalMessage;
  }

  /**
   * Send OTP via Airtel IQ
   */
  private async sendAirtelIq(to: string, otp: string): Promise<boolean> {
    const airtel = config.sms?.airtelIq;

    if (!airtel?.baseUrl || !airtel.customerId || !airtel.senderId || !airtel.templateId) {
      console.error("[SMS] Airtel IQ configuration missing");
      return false;
    }

    // ⚠️ EXACT DLT TEMPLATE TEXT
    const templateMessage = "Dear User your OTP for login/signup to DESI MILES app is {#numeric#} Regards BHARAT CABS";
    const processedMessage = this.replaceVariables(templateMessage, { otp, numeric: otp });

    // Clean Indian mobile number
    const mobile = to.replace(/^\+?91/, "").replace(/\D/g, "");

    const payload = {
      customerId: airtel.customerId,
      destinationAddress: [mobile],
      dltTemplateId: airtel.templateId,
      entityId: airtel.entityId,
      message: processedMessage.trim(),
      messageType: airtel.messageType || "SERVICE_IMPLICIT",
      sourceAddress: airtel.senderId,
    };

    try {
      const response = await fetch(airtel.baseUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[SMS] Airtel IQ failed: ${response.status} ${response.statusText}`);
        return false;
      }

      if (config.env === "development") {
        console.log("✅ Airtel IQ SMS Sent", { to: mobile });
      }

      return true;
    } catch (error) {
      console.error("[SMS] Airtel IQ Error:", error);
      return false;
    }
  }

  /**
   * Send OTP via MSG91
   */
  private async sendMsg91(mobile: string, otp: string): Promise<boolean> {
    const msg91Config = config.sms?.msg91;
    if (!msg91Config?.authkey || !msg91Config?.templateId) {
      console.error("[SMS] MSG91 configuration is incomplete.");
      return false;
    }

    try {
      const response = await fetch("https://control.msg91.com/api/v5/flow", {
        method: "POST",
        headers: {
          authkey: msg91Config.authkey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: msg91Config.templateId,
          realTimeResponse: "1",
          recipients: [
            {
              mobiles: `91${mobile}`,
              numeric: otp,
            },
          ],
        }),
      });

      const result = await response.json();
      if (result.type === "success" || result.message === "OK") {
        console.log(`[SMS] MSG91 OTP sent successfully to ${mobile}`);
        return true;
      } else {
        console.error("[SMS] MSG91 Failed:", result);
        return false;
      }
    } catch (error) {
      console.error("[SMS] MSG91 Error:", error);
      return false;
    }
  }

  /**
   * Public Send OTP method
   */
  public async sendOtp(payload: SmsPayload): Promise<boolean> {
    const { mobile, otp } = payload;
    const smsConfig = config.sms;

    if (!smsConfig.enabled) {
      console.log("[SMS] SMS service disabled. Skipping.");
      return false;
    }

    if (smsConfig.provider === "airtel_iq") {
      return await this.sendAirtelIq(mobile, otp);
    } else if (smsConfig.provider === "msg91") {
      return await this.sendMsg91(mobile, otp);
    } else {
      console.log(`[SMS] Provider ${smsConfig.provider} not supported.`);
      return false;
    }
  }
}

export const smsService = SmsService.getInstance();
export async function sendSMS({ to, otp }: { to: string; otp: string }) {
  return await smsService.sendOtp({ mobile: to, otp });
}
