import sgMail from '@sendgrid/mail';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email};
}

async function getUncachableSendGridClient() {
  const {apiKey, email} = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

export async function sendWelcomeEmail(userEmail: string, firstName: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const msg = {
      to: userEmail,
      from: fromEmail,
      subject: 'Welcome to The Digital Ledger!',
      text: `Hi ${firstName},\n\nWelcome to The Digital Ledger - the community platform for AI in Accounting professionals!\n\nWe're excited to have you join our community of over 10,000 members who are passionate about the intersection of artificial intelligence and accounting.\n\nHere's what you can explore:\n- News & Articles: Stay updated with the latest AI developments in accounting\n- Podcasts: Listen to expert discussions and insights\n- Educational Resources: Expand your knowledge with curated learning materials\n- Forums: Connect with fellow professionals and share ideas\n- Controller's Toolbox: Access productivity apps designed for controllers and FP&A professionals\n\nIf you have any questions, feel free to reach out to our community.\n\nBest regards,\nThe Digital Ledger Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a365d;">Welcome to The Digital Ledger!</h1>
          <p>Hi ${firstName},</p>
          <p>Welcome to <strong>The Digital Ledger</strong> - the community platform for AI in Accounting professionals!</p>
          <p>We're excited to have you join our community of over 10,000 members who are passionate about the intersection of artificial intelligence and accounting.</p>
          <h2 style="color: #2d3748; font-size: 18px;">Here's what you can explore:</h2>
          <ul style="color: #4a5568;">
            <li><strong>News & Articles:</strong> Stay updated with the latest AI developments in accounting</li>
            <li><strong>Podcasts:</strong> Listen to expert discussions and insights</li>
            <li><strong>Educational Resources:</strong> Expand your knowledge with curated learning materials</li>
            <li><strong>Forums:</strong> Connect with fellow professionals and share ideas</li>
            <li><strong>Controller's Toolbox:</strong> Access productivity apps designed for controllers and FP&A professionals</li>
          </ul>
          <p>If you have any questions, feel free to reach out to our community.</p>
          <p style="margin-top: 30px;">Best regards,<br><strong>The Digital Ledger Team</strong></p>
        </div>
      `,
    };

    await client.send(msg);
    console.log(`Welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}
