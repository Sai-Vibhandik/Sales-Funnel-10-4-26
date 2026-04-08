const baseTemplate = require('./baseTemplate');

/**
 * Task Assignment Email Template
 * Sent when a user is assigned to a task
 */

const taskAssignmentTemplate = (task, project, assignedUser, assignedBy) => {
  const taskUrl = `${process.env.FRONTEND_URL || 'https://growthvalley.com'}/tasks/${task._id}`;
  const projectUrl = `${process.env.FRONTEND_URL || 'https://growthvalley.com'}/projects/${project._id}`;

  // Format task type for display
  const formatTaskType = (taskType) => {
    const typeMap = {
      creative_strategy: 'Creative Strategy',
      copywriting: 'Copywriting',
      landing_page_design: 'Landing Page Design',
      landing_page_development: 'Landing Page Development',
      video_editing: 'Video Editing',
      graphic_design: 'Graphic Design',
      testing: 'Testing',
      review: 'Review'
    };
    return typeMap[taskType] || taskType;
  };

  // Format priority
  const formatPriority = (priority) => {
    const priorityMap = {
      low: { text: 'Low', color: '#10B981' },
      medium: { text: 'Medium', color: '#F59E0B' },
      high: { text: 'High', color: '#EF4444' }
    };
    return priorityMap[priority] || { text: priority, color: '#64748b' };
  };

  const priorityInfo = formatPriority(task.priority);
  const projectName = project.projectName || project.businessName;

  const content = `
    <h2>New Task Assigned</h2>
    <p>Hi ${assignedUser.name},</p>
    <p><strong>${assignedBy.name}</strong> has assigned you a new task.</p>

    <div class="details">
      <div class="details-item">
        <span class="details-label">Task:</span>
        <span class="details-value">${task.taskTitle}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Type:</span>
        <span class="details-value">${formatTaskType(task.taskType)}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Project:</span>
        <span class="details-value">${projectName}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Priority:</span>
        <span class="details-value" style="color: ${priorityInfo.color};">${priorityInfo.text}</span>
      </div>
      ${task.dueDate ? `
      <div class="details-item">
        <span class="details-label">Due Date:</span>
        <span class="details-value">${new Date(task.dueDate).toLocaleDateString()}</span>
      </div>
      ` : ''}
      ${task.description ? `
      <div class="details-item" style="flex-direction: column;">
        <span class="details-label" style="margin-bottom: 8px;">Description:</span>
        <span class="details-value">${task.description}</span>
      </div>
      ` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${taskUrl}" class="button">View Task</a>
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      You can view all your tasks in your <a href="${process.env.FRONTEND_URL || 'https://growthvalley.com'}/my-tasks" style="color: #4F46E5;">Task Dashboard</a>.
    </p>
  `;

  return {
    subject: `New Task: ${task.taskTitle} - Growth Valley`,
    html: baseTemplate(content, { title: 'Growth Valley' })
  };
};

module.exports = taskAssignmentTemplate;