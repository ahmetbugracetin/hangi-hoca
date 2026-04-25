import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.FRONTEND_URL}/api/auth/verify/${token}`;

  await transporter.sendMail({
    from: '"Hangi Hoca" <noreply@hangihoca.com>',
    to,
    subject: 'Email Doğrulama - Hangi Hoca',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0a0f1e;">Hangi Hoca</h2>
        <p>Hesabını doğrulamak için aşağıdaki linke tıkla:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #f59e0b; color: #0a0f1e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Email'imi Doğrula
        </a>
        <p style="color: #666; margin-top: 20px;">Bu linke sen tıklamadıysan bu maili görmezden gelebilirsin.</p>
      </div>
    `,
  });
}
