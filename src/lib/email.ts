const resendApiKey = process.env.RESEND_API_KEY;

export async function sendInviteEmail({
  to,
  inviteLink,
  collectiveName,
  role,
}: {
  to: string;
  inviteLink: string;
  collectiveName: string;
  role: string;
}) {
  if (!resendApiKey) {
    console.warn("Resend API key not configured. Skipping email send.");
    return { sent: false, error: "Resend not configured" };
  }
  try {
    const { Resend } = await import("resend").catch(() => ({ Resend: null }));
    if (!Resend) {
      throw new Error("resend module not available");
    }
    const resend = new Resend(resendApiKey);
    const subject = `You've been invited to join ${collectiveName} on Lnked`;
    const html = `
      <h2>You've been invited to join <b>${collectiveName}</b> as <b>${role}</b></h2>
      <p>Click the link below to accept your invite:</p>
      <p><a href="${inviteLink}">${inviteLink}</a></p>
      <p>If you did not expect this invitation, you can ignore this email.</p>
    `;
    await resend.emails.send({
      from: "Lnked <noreply@lnked.app>",
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to send invite email:", err);
    return { sent: false, error: message };
  }
}
