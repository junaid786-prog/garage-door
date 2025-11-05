const sendEmail = async (job) => {
  const { bookingId, emailData } = job.data;

  try {
    console.log(`📧 Sending email for booking ${bookingId}`);

    // TODO: Implement Klaviyo API integration
    // const klaviyoService = require('../services/klaviyo.service');
    // const result = await klaviyoService.sendEmail(emailData);

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockResult = {
      messageId: `email-${Date.now()}`,
      status: 'sent',
      recipient: emailData.to,
      bookingId,
    };

    console.log(`✅ Email sent for booking ${bookingId}: ${mockResult.messageId}`);

    // Log notification
    // const notificationService = require('../services/notification.service');
    // await notificationService.logNotification({
    //     booking_id: bookingId,
    //     type: 'email',
    //     provider: 'klaviyo',
    //     status: 'sent',
    //     external_id: mockResult.messageId
    // });

    return mockResult;
  } catch (error) {
    console.error(`❌ Email sending failed for booking ${bookingId}:`, error.message);
    throw error;
  }
};

const sendSMS = async (job) => {
  const { bookingId, smsData } = job.data;

  try {
    console.log(`📱 Sending SMS for booking ${bookingId}`);

    // Check if customer opted in for SMS
    if (!smsData.optedIn) {
      console.log(`⚠️ Customer not opted in for SMS for booking ${bookingId}`);
      return { status: 'skipped', reason: 'not_opted_in' };
    }

    // TODO: Implement SMS provider API integration
    // const smsService = require('../services/sms.service');
    // const result = await smsService.sendSMS(smsData);

    // Simulate SMS sending
    await new Promise((resolve) => setTimeout(resolve, 800));

    const mockResult = {
      messageId: `sms-${Date.now()}`,
      status: 'sent',
      recipient: smsData.to,
      bookingId,
    };

    console.log(`✅ SMS sent for booking ${bookingId}: ${mockResult.messageId}`);

    // Log notification
    // const notificationService = require('../services/notification.service');
    // await notificationService.logNotification({
    //     booking_id: bookingId,
    //     type: 'sms',
    //     provider: 'twilio',
    //     status: 'sent',
    //     external_id: mockResult.messageId
    // });

    return mockResult;
  } catch (error) {
    console.error(`❌ SMS sending failed for booking ${bookingId}:`, error.message);
    throw error;
  }
};

const sendConfirmation = async (job) => {
  const { bookingId, confirmationData } = job.data;

  try {
    console.log(`📋 Sending confirmation for booking ${bookingId}`);

    const results = [];

    // Send email confirmation
    if (confirmationData.email) {
      const emailJob = {
        data: {
          bookingId,
          emailData: {
            to: confirmationData.email.to,
            subject: 'Booking Confirmation - A1 Garage Door Service',
            template: 'booking_confirmation',
            data: confirmationData.email.data,
          },
        },
      };

      const emailResult = await sendEmail(emailJob);
      results.push({ type: 'email', result: emailResult });
    }

    // Send SMS confirmation if opted in
    if (confirmationData.sms && confirmationData.sms.optedIn) {
      const smsJob = {
        data: {
          bookingId,
          smsData: {
            to: confirmationData.sms.to,
            message: confirmationData.sms.message,
            optedIn: confirmationData.sms.optedIn,
          },
        },
      };

      const smsResult = await sendSMS(smsJob);
      results.push({ type: 'sms', result: smsResult });
    }

    console.log(`✅ Confirmation sent for booking ${bookingId}`);

    return {
      bookingId,
      results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Confirmation sending failed for booking ${bookingId}:`, error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendSMS,
  sendConfirmation,
};
