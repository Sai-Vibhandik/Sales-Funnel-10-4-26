const mongoose = require('mongoose');

/**
 * Membership Model (Simplified)
 *
 * Junction collection between Users and Organizations.
 * Role is stored on User model (single role per account).
 * This model only tracks organization membership status.
 */

const membershipSchema = new mongoose.Schema({
  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'removed'],
    default: 'pending'
  },

  // Invitation tracking
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitedAt: {
    type: Date
  },
  joinedAt: {
    type: Date
  },

  // User preferences for this organization
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    taskReminders: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: true },
    projectUpdates: { type: Boolean, default: true }
  },

  // User's display name in this organization (optional)
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },

  // Department/team within organization (optional)
  department: {
    type: String,
    trim: true
  },

  // Job title within organization (optional)
  jobTitle: {
    type: String,
    trim: true
  },

  // Last activity
  lastActiveAt: {
    type: Date,
    default: Date.now
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique membership
membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

// Index for querying by organization
membershipSchema.index({ organizationId: 1, status: 1 });

// Index for querying by user
membershipSchema.index({ userId: 1, status: 1 });

// Static method to get all members of organization
membershipSchema.statics.getOrganizationMembers = async function(organizationId, options = {}) {
  const query = { organizationId, status: { $ne: 'removed' } };

  const memberships = await this.find(query)
    .populate('userId', 'name email avatar isActive role lastLogin')
    .populate('invitedBy', 'name email')
    .sort({ createdAt: 1 });

  return memberships;
};

// Static method to get user's organizations
membershipSchema.statics.getUserOrganizations = async function(userId) {
  const memberships = await this.find({
    userId,
    status: 'active'
  })
    .populate('organizationId')
    .sort({ createdAt: -1 });

  return memberships;
};

// Static method to check if user is member of organization
membershipSchema.statics.isMember = async function(userId, organizationId) {
  const membership = await this.findOne({
    userId,
    organizationId,
    status: 'active'
  });
  return !!membership;
};

// Static method to get active membership
membershipSchema.statics.getActiveMembership = async function(userId, organizationId) {
  return this.findOne({
    userId,
    organizationId,
    status: 'active'
  });
};

// Method to check if membership is active
membershipSchema.methods.isActive = function() {
  return this.status === 'active';
};

module.exports = mongoose.model('Membership', membershipSchema);