// ============================================================================
// supabase/functions/notify-school/index.ts
// Supabase Edge Function (Deno TypeScript)
//
// Triggers on database inserts to:
// 1. public.contact_messages -> Alerts school staff of incoming inquiries
// 2. public.admission_applications -> Alerts admissions team of new student filings
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: "contact_messages" | "admission_applications";
  schema: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { type, table, record } = payload;

    // Only process new INSERT events
    if (type !== "INSERT") {
      return new Response(
        JSON.stringify({ message: `Ignored event type: ${type}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const schoolEmail = Deno.env.get("SCHOOL_NOTIFICATION_EMAIL") || "admissions@staugustine.edu.ng";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    let subject = "";
    let htmlContent = "";

    if (table === "contact_messages") {
      subject = `[New Contact Inquiry] from ${record.name || "A Visitor"}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700;">St. Augustine International Academy</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #d4af37;">New Public Contact Inquiry</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p style="font-size: 15px; color: #334155;">A new message was submitted via the school website contact form:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; width: 30%; color: #475569; border-bottom: 1px solid #f1f5f9;">Sender Name:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${record.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Email Address:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;"><a href="mailto:${record.email}">${record.email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Phone Number:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${record.phone || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Date Received:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${new Date(record.created_at || Date.now()).toLocaleString()}</td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #0b1f3a;">
              <strong style="display: block; margin-bottom: 6px; color: #1e293b;">Inquiry Message:</strong>
              <p style="margin: 0; color: #334155; white-space: pre-line; line-height: 1.5;">${record.message}</p>
            </div>
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://st-aust.vercel.app/admin/messages.html" style="display: inline-block; background-color: #0b1f3a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Open Admin Portal &rarr;
              </a>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #64748b;">
            This is an automated notification from St. Augustine International Academy database.
          </div>
        </div>
      `;
    } else if (table === "admission_applications") {
      subject = `[New Admission Application] ${record.child_name} - ${record.class_applying_for}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0b1f3a; color: #ffffff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700;">St. Augustine International Academy</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #d4af37;">New Student Admission Filing</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p style="font-size: 15px; color: #334155;">A new student application has been submitted and is awaiting administrative review:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; width: 35%; color: #475569; border-bottom: 1px solid #f1f5f9;">Applicant Child:</td>
                <td style="padding: 8px 12px; color: #1e293b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${record.child_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Date of Birth:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${record.date_of_birth}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Class Applying For:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${record.class_applying_for}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Parent / Guardian:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${record.parent_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Parent Email:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;"><a href="mailto:${record.parent_email}">${record.parent_email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Parent Phone:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${record.parent_phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Previous School:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${record.previous_school || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Residential Address:</td>
                <td style="padding: 8px 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${record.address}</td>
              </tr>
            </table>
            ${record.notes ? `
              <div style="margin-top: 16px; padding: 12px; background-color: #f8fafc; border-radius: 6px;">
                <strong style="color: #475569; font-size: 13px;">Parent Notes / Medical Information:</strong>
                <p style="margin: 4px 0 0 0; color: #1e293b; font-size: 14px;">${record.notes}</p>
              </div>
            ` : ""}
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://st-aust.vercel.app/admin/applications.html" style="display: inline-block; background-color: #0b1f3a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Review in Admissions Portal &rarr;
              </a>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #64748b;">
            This is an automated notification from St. Augustine International Academy database.
          </div>
        </div>
      `;
    } else {
      return new Response(
        JSON.stringify({ message: `No notification template configured for table: ${table}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dispatch email notification
    if (resendApiKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "St. Augustine Academy <notifications@staugustine.edu.ng>",
          to: [schoolEmail],
          subject: subject,
          html: htmlContent,
        }),
      });

      const emailData = await emailRes.json();
      console.log("Email dispatched via Resend:", emailData);
      return new Response(
        JSON.stringify({ success: true, emailId: emailData.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Development mode / fallback logging
      console.log(`[ST-AUST EMAIL NOTIFICATION]`);
      console.log(`To: ${schoolEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Record ID: ${record.id}`);
      console.log(`(Configure RESEND_API_KEY secret in Supabase to dispatch live outbound SMTP)`);

      return new Response(
        JSON.stringify({
          success: true,
          mode: "log",
          message: "Email generated and logged. To send live emails, set RESEND_API_KEY in Supabase secrets.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Error processing webhook notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
