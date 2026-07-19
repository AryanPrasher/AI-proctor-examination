// Mock Email Service for Notification Module

export const sendEmail = async ({ to, subject, html }) => {
  console.log('====================================');
  console.log(`[EMAIL SENDING SIMULATION]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body Snippet: ${html.substring(0, 150)}...`);
  console.log('====================================');
  return { success: true, messageId: `mock-email-${Date.now()}` };
};
