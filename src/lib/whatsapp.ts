/**
 * WhatsApp Cloud API Service Module
 * Meta Graph API v20.0 Integration for TaskSend
 */

export interface TaskWhatsAppPayload {
  toPhone: string;
  shortId: string;
  taskTitle: string;
  priority?: string;
  deadline?: string;
  notes?: string;
}

/**
 * Format phone number to clean digit format required by Meta WhatsApp API
 * Automatically appends default country code (e.g. 91) if 10-digit number is provided.
 * Examples:
 *   "+91 70254 23667" -> "917025423667"
 *   "7025423667"     -> "917025423667"
 *   "917025423667"   -> "917025423667"
 */
export function formatMetaPhoneNumber(phone: string, defaultCountryCode = "91"): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

/**
 * Send standard text message via Meta WhatsApp Cloud API
 */
export async function sendMetaTextMessage(toPhone: string, bodyText: string) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const token = process.env.META_WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error("Missing Meta WhatsApp API credentials (META_PHONE_NUMBER_ID or META_WHATSAPP_TOKEN)");
  }

  const formattedTo = formatMetaPhoneNumber(toPhone);

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedTo,
      type: "text",
      text: { body: bodyText },
    }),
  });

  const data = await response.json();
  return { ok: response.ok, data };
}

/**
 * Send Interactive Quick Reply Buttons via Meta WhatsApp Cloud API
 * No template pre-approval required for messages within 24h customer window
 */
export async function sendMetaInteractiveButtons(
  toPhone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const token = process.env.META_WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error("Missing Meta WhatsApp API credentials");
  }

  const formattedTo = formatMetaPhoneNumber(toPhone);

  const formattedButtons = buttons.slice(0, 3).map((btn) => ({
    type: "reply",
    reply: {
      id: btn.id,
      title: btn.title.substring(0, 20),
    },
  }));

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedTo,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: { buttons: formattedButtons },
      },
    }),
  });

  const data = await response.json();
  return { ok: response.ok, data };
}

/**
 * Send Approved Meta Template Message with Quick Reply Buttons
 */
export async function sendMetaTemplateTaskAssigned(payload: TaskWhatsAppPayload) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const token = process.env.META_WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error("Missing Meta WhatsApp API credentials");
  }

  const formattedTo = formatMetaPhoneNumber(payload.toPhone);
  const priorityStr = payload.priority || "Medium";
  const deadlineStr = payload.deadline || "No deadline";

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: formattedTo,
      type: "template",
      template: {
        name: "task_assigned_v2",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: payload.shortId },
              { type: "text", text: payload.taskTitle },
              { type: "text", text: priorityStr },
              { type: "text", text: deadlineStr },
            ],
          },
          {
            type: "button",
            sub_type: "quick_reply",
            index: "0",
            parameters: [{ type: "payload", payload: `DONE_${payload.shortId}` }],
          },
          {
            type: "button",
            sub_type: "quick_reply",
            index: "1",
            parameters: [{ type: "payload", payload: `PROGRESS_${payload.shortId}` }],
          },
          {
            type: "button",
            sub_type: "quick_reply",
            index: "2",
            parameters: [{ type: "payload", payload: `CANNOT_${payload.shortId}` }],
          },
        ],
      },
    }),
  });

  const data = await response.json();
  return { ok: response.ok, data };
}

/**
 * Smart Task Assignment Dispatcher
 * Attempts Meta Template sending first, gracefully falling back to interactive or text messaging
 */
export async function sendTaskAssignmentWhatsApp(payload: TaskWhatsAppPayload) {
  // Step 1: Try Template Message
  try {
    const tmplResult = await sendMetaTemplateTaskAssigned(payload);
    if (tmplResult.ok && !tmplResult.data?.error) {
      return { success: true, method: "template", data: tmplResult.data };
    }
    console.warn("Meta Template notice:", tmplResult.data?.error?.message || "Falling back to text");
  } catch (err: any) {
    console.warn("Template attempt failed, executing fallback:", err.message);
  }

  // Step 2: Fallback to Text Message with Quick Actions instructions
  const priorityEmoji =
    payload.priority === "High" ? "🔴 High" : payload.priority === "Low" ? "🟢 Low" : "🟡 Medium";
  const deadlineText = payload.deadline || "No deadline";

  let body = `📋 *New Task Assigned*\n\n`;
  body += `*Task:* ${payload.taskTitle}\n`;
  body += `*ID:* ${payload.shortId}\n`;
  body += `*Priority:* ${priorityEmoji}\n`;
  body += `*Deadline:* ${deadlineText}\n`;
  if (payload.notes) {
    body += `*Notes:* ${payload.notes}\n`;
  }
  body += `\n*Reply options:*\n`;
  body += `✅ Reply *DONE ${payload.shortId}* to complete\n`;
  body += `⏳ Reply *PROGRESS ${payload.shortId}* for in-progress\n`;
  body += `❌ Reply *CANCEL ${payload.shortId}* if cannot complete`;

  const fallbackResult = await sendMetaTextMessage(payload.toPhone, body);
  return {
    success: fallbackResult.ok && !fallbackResult.data?.error,
    method: "text_fallback",
    data: fallbackResult.data,
  };
}
