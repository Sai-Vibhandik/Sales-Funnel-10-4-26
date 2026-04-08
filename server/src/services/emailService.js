const sendEmail = require('../utils/sendEmail');
const {
  orgRegistrationTemplate,
  teamInvitationTemplate,
  taskAssignmentTemplate,
  projectAssignmentTemplate
} = require('../utils/emailTemplates');

/**
 * Email Service
 * Centralized service for sending transactional emails
 */

/**
 * Send notification to platform admins about new organization registration
 * @param {Object} organization - The created organization
 * @param {Object} owner - The organization owner (user)
 * @param {Object} plan - The selected plan
 */
const sendOrgRegistrationNotification = async (organization, owner, plan) => {
  console.log('=== sendOrgRegistrationNotification called ===');
  console.log('Organization:', organization?.name);
  console.log('Owner:', owner?.name, owner?.email);

  try {
    // Get all platform admins
    const User = require('../models/User');
    const platformAdmins = await User.find({ role: 'platform_admin', isActive: true });

    console.log('Platform admins found:', platformAdmins?.length || 0);

    // Also send to the organization owner for testing/notification
    const recipients = [...(platformAdmins || [])];

    // Add owner to recipients for welcome email
    if (owner && owner.email) {
      console.log('Also sending welcome email to owner:', owner.email);
      recipients.push({ email: owner.email, name: owner.name, _id: owner._id });
    }

    if (recipients.length === 0) {
      console.log('No recipients found to notify - skipping email');
      return;
    }

    console.log('Sending emails to:', recipients.map(r => r.email));

    const { subject, html } = orgRegistrationTemplate(organization, owner, plan);

    // Send to all recipients
    const emailPromises = recipients.map(recipient =>
      sendEmail({
        email: recipient.email,
        subject,
        html
      })
    );

    await Promise.all(emailPromises);
    console.log(`Organization registration notification sent to ${recipients.length} recipient(s)`);
  } catch (error) {
    console.error('Error sending org registration notification:', error);
    console.error('Error stack:', error.stack);
    // Don't throw - email failures should not block the main operation
  }
};

/**
 * Send team invitation email
 * @param {Object} invitation - The invitation document
 * @param {Object} organization - The organization
 * @param {Object} inviter - The user who sent the invitation
 */
const sendTeamInvitation = async (invitation, organization, inviter) => {
  try {
    const { subject, html } = teamInvitationTemplate(invitation, organization, inviter);

    await sendEmail({
      email: invitation.email,
      subject,
      html
    });

    console.log(`Team invitation email sent to ${invitation.email}`);
  } catch (error) {
    console.error('Error sending team invitation email:', error);
    // Don't throw - email failures should not block the main operation
  }
};

/**
 * Send task assignment notification email
 * @param {Object} task - The assigned task
 * @param {Object} project - The project the task belongs to
 * @param {Object} assignedUser - The user assigned to the task
 * @param {Object} assignedBy - The user who assigned the task
 */
const sendTaskAssignmentNotification = async (task, project, assignedUser, assignedBy) => {
  try {
    const { subject, html } = taskAssignmentTemplate(task, project, assignedUser, assignedBy);

    await sendEmail({
      email: assignedUser.email,
      subject,
      html
    });

    console.log(`Task assignment notification sent to ${assignedUser.email}`);
  } catch (error) {
    console.error('Error sending task assignment notification:', error);
    // Don't throw - email failures should not block the main operation
  }
};

/**
 * Send project assignment notification email
 * @param {Object} project - The project
 * @param {Object} assignedUser - The user assigned to the project
 * @param {string} role - The role assigned (e.g., 'graphic_designer', 'developer')
 * @param {Object} assignedBy - The user who made the assignment
 */
const sendProjectAssignmentNotification = async (project, assignedUser, role, assignedBy) => {
  try {
    const { subject, html } = projectAssignmentTemplate(project, assignedUser, role, assignedBy);

    await sendEmail({
      email: assignedUser.email,
      subject,
      html
    });

    console.log(`Project assignment notification sent to ${assignedUser.email}`);
  } catch (error) {
    console.error('Error sending project assignment notification:', error);
    // Don't throw - email failures should not block the main operation
  }
};

module.exports = {
  sendOrgRegistrationNotification,
  sendTeamInvitation,
  sendTaskAssignmentNotification,
  sendProjectAssignmentNotification
};