const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requirePlatformAdmin, setTenantContext } = require('../middleware/tenant');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const Plan = require('../models/Plan');
const Prompt = require('../models/Prompt');
const UsageLog = require('../models/UsageLog');

/**
 * Platform Admin Routes
 *
 * These routes are only accessible by platform_admin users.
 * Used for managing:
 * - System-wide prompts
 * - Pricing plans
 * - All organizations
 * - Platform analytics
 */

// All routes require authentication and platform admin role
router.use(protect);
router.use(requirePlatformAdmin);

/**
 * @desc    Get platform statistics
 * @route   GET /api/platform/stats
 * @access  Private (Platform Admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    // Get counts
    const totalOrganizations = await Organization.countDocuments({ isActive: true });
    const activeUsers = await User.countDocuments({ isActive: true });

    // Get active organization IDs
    const activeOrgIds = await Organization.find({ isActive: true }).distinct('_id');

    // Get users who are members of active organizations
    const activeMemberUserIds = await Membership.distinct('userId', {
      organizationId: { $in: activeOrgIds },
      status: 'active'
    });

    // Count total unique users in active organizations
    const totalUsers = activeMemberUserIds.length;

    // Get users by role (only users in active organizations)
    const usersByRole = await User.aggregate([
      { $match: { _id: { $in: activeMemberUserIds } } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get organizations by plan
    const orgsByPlan = await Organization.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await UsageLog.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOrganizations,
        activeUsers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        organizationsByPlan: orgsByPlan.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform statistics'
    });
  }
});

/**
 * @desc    Get all organizations
 * @route   GET /api/platform/organizations
 * @access  Private (Platform Admin only)
 */
router.get('/organizations', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, plan, status } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }

    if (plan) {
      query.plan = plan;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'suspended') {
      query.isActive = false;
    }

    const organizations = await Organization.find(query)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Organization.countDocuments(query);

    res.json({
      success: true,
      data: organizations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organizations'
    });
  }
});

/**
 * @desc    Get organization by ID
 * @route   GET /api/platform/organizations/:id
 * @access  Private (Platform Admin only)
 */
router.get('/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findById(id)
      .populate('owner', 'name email avatar');

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get members
    const Membership = require('../models/Membership');
    const members = await Membership.find({ organizationId: id })
      .populate('userId', 'name email avatar role')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        organization,
        members
      }
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organization'
    });
  }
});

/**
 * @desc    Suspend/unsuspend organization
 * @route   PUT /api/platform/organizations/:id/suspend
 * @access  Private (Platform Admin only)
 */
router.put('/organizations/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, suspend = true } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      id,
      {
        isActive: !suspend,
        suspendedAt: suspend ? new Date() : null,
        suspensionReason: suspend ? reason : null
      },
      { new: true }
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Log action
    await UsageLog.logAction({
      organizationId: id,
      userId: req.user._id,
      userRole: 'platform_admin',
      action: suspend ? 'platform.org.suspend' : 'platform.org.unsuspend',
      resource: 'organization',
      resourceId: id,
      details: { reason },
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      message: suspend ? 'Organization suspended' : 'Organization unsuspended',
      data: organization
    });
  } catch (error) {
    console.error('Suspend organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend organization'
    });
  }
});

/**
 * @desc    Get all users
 * @route   GET /api/platform/users
 * @access  Private (Platform Admin only)
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, organizationId, groupByOrg } = req.query;

    // If grouping by organization, get users grouped by their organization
    if (groupByOrg === 'true') {
      const Membership = require('../models/Membership');
      const Organization = require('../models/Organization');

      // Build membership query
      const membershipQuery = {};
      if (organizationId) {
        membershipQuery.organizationId = organizationId;
      }

      // If searching by organization name, find matching orgs first
      let matchingOrgIds = null;
      if (search) {
        const searchLower = search.toLowerCase();
        const matchingOrgs = await Organization.find({
          name: { $regex: search, $options: 'i' }
        }).select('_id');
        matchingOrgIds = matchingOrgs.map(o => o._id);
      }

      // Get memberships and populate
      const memberships = await Membership.find(membershipQuery)
        .populate('userId', 'name email role isActive createdAt')
        .populate('organizationId', 'name slug plan isActive')
        .sort({ 'organizationId.name': 1, createdAt: 1 });

      // Build grouped structure
      const groupedUsers = {};
      memberships.forEach(m => {
        if (!m.userId || !m.organizationId) return;

        // Skip if organization is not active
        if (m.organizationId.isActive === false) return;

        // Apply search filter (search in user name, email, OR organization name)
        if (search) {
          const searchLower = search.toLowerCase();
          const nameMatch = m.userId.name?.toLowerCase().includes(searchLower);
          const emailMatch = m.userId.email?.toLowerCase().includes(searchLower);
          const orgMatch = m.organizationId.name?.toLowerCase().includes(searchLower);

          // If no match in user or org name, skip this member
          if (!nameMatch && !emailMatch && !orgMatch) return;

          // If matched by org name only and not by user, we still include it
          // but only include matching users if also filtering by name/email
        }

        // Apply role filter
        if (role && m.role !== role && m.userId.role !== role) return;

        const orgId = m.organizationId._id.toString();
        if (!groupedUsers[orgId]) {
          groupedUsers[orgId] = {
            organization: m.organizationId,
            members: []
          };
        }

        groupedUsers[orgId].members.push({
          _id: m.userId._id,
          name: m.userId.name,
          email: m.userId.email,
          role: m.role || m.userId.role,
          isActive: m.userId.isActive,
          joinedAt: m.createdAt
        });
      });

      // Convert to array and sort by organization name
      let result = Object.values(groupedUsers)
        .sort((a, b) =>
          (a.organization.name || '').localeCompare(b.organization.name || '')
        );

      // If searching, filter to only include matching organizations or organizations with matching users
      if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(group => {
          // Check if organization name matches
          const orgMatches = group.organization.name?.toLowerCase().includes(searchLower);
          // Check if any member matches
          const memberMatches = group.members.some(m =>
            m.name?.toLowerCase().includes(searchLower) ||
            m.email?.toLowerCase().includes(searchLower)
          );
          return orgMatches || memberMatches;
        });

        // If organization name matches, include all members
        // If only members match, filter to show only matching members
        result = result.map(group => {
          const orgMatches = group.organization.name?.toLowerCase().includes(searchLower);
          if (orgMatches) {
            return group; // Include all members if org name matches
          }
          // Filter members to only show matching ones
          return {
            ...group,
            members: group.members.filter(m =>
              m.name?.toLowerCase().includes(searchLower) ||
              m.email?.toLowerCase().includes(searchLower)
            )
          };
        }).filter(group => group.members.length > 0);
      }

      return res.json({
        success: true,
        data: result,
        total: result.length
      });
    }

    // Non-grouped query (flat list with pagination)
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (organizationId) {
      query.currentOrganization = organizationId;
    }

    const users = await User.find(query)
      .select('-password')
      .populate('currentOrganization', 'name slug plan')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
});

/**
 * @desc    Update user role
 * @route   PUT /api/platform/users/:id/role
 * @access  Private (Platform Admin only)
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = [
      'platform_admin',
      'admin',
      'performance_marketer',
      'graphic_designer',
      'video_editor',
      'ui_ux_designer',
      'developer',
      'tester',
      'content_writer',
      'content_creator'
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log action
    await UsageLog.logAction({
      organizationId: user.currentOrganization,
      userId: req.user._id,
      userRole: 'platform_admin',
      action: 'platform.user.role_change',
      resource: 'user',
      resourceId: id,
      details: { newRole: role },
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      message: 'User role updated',
      data: user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

/**
 * @desc    Get all pricing plans
 * @route   GET /api/platform/plans
 * @access  Private (Platform Admin only)
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1, createdAt: 1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plans'
    });
  }
});

/**
 * @desc    Create pricing plan
 * @route   POST /api/platform/plans
 * @access  Private (Platform Admin only)
 */
router.post('/plans', async (req, res) => {
  try {
    const plan = await Plan.create({
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan'
    });
  }
});

/**
 * @desc    Update pricing plan
 * @route   PUT /api/platform/plans/:id
 * @access  Private (Platform Admin only)
 */
router.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plan
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan'
    });
  }
});

/**
 * @desc    Delete pricing plan
 * @route   DELETE /api/platform/plans/:id
 * @access  Private (Platform Admin only)
 */
router.delete('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any organizations are using this plan
    const orgCount = await Organization.countDocuments({ plan: id });

    if (orgCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. ${orgCount} organizations are using this plan.`
      });
    }

    const plan = await Plan.findByIdAndDelete(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan'
    });
  }
});

/**
 * @desc    Get all prompts (system-wide)
 * @route   GET /api/platform/prompts
 * @access  Private (Platform Admin only)
 */
router.get('/prompts', async (req, res) => {
  try {
    const { role, frameworkType, isActive, search } = req.query;

    const query = { organizationId: null }; // System prompts only

    // Only add role filter if it's a valid non-empty value
    if (role && role.trim() !== '') {
      query.role = role.trim();
    }
    if (frameworkType && frameworkType.trim() !== '') {
      query.frameworkType = frameworkType.trim();
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Add search functionality
    if (search && search.trim() !== '') {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    const prompts = await Prompt.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prompts'
    });
  }
});

/**
 * @desc    Create system prompt
 * @route   POST /api/platform/prompts
 * @access  Private (Platform Admin only)
 */
router.post('/prompts', async (req, res) => {
  try {
    const prompt = await Prompt.create({
      ...req.body,
      organizationId: null, // System prompt
      isSystem: true,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'System prompt created successfully',
      data: prompt
    });
  } catch (error) {
    console.error('Create prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create prompt'
    });
  }
});

/**
 * @desc    Update system prompt
 * @route   PUT /api/platform/prompts/:id
 * @access  Private (Platform Admin only)
 */
router.put('/prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const prompt = await Prompt.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    res.json({
      success: true,
      message: 'Prompt updated successfully',
      data: prompt
    });
  } catch (error) {
    console.error('Update prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prompt'
    });
  }
});

/**
 * @desc    Delete system prompt
 * @route   DELETE /api/platform/prompts/:id
 * @access  Private (Platform Admin only)
 */
router.delete('/prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const prompt = await Prompt.findById(id);

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // Only allow deleting system prompts
    if (!prompt.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete organization-specific prompts'
      });
    }

    await prompt.deleteOne();

    res.json({
      success: true,
      message: 'Prompt deleted successfully'
    });
  } catch (error) {
    console.error('Delete prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prompt'
    });
  }
});

/**
 * @desc    Get activity logs
 * @route   GET /api/platform/logs
 * @access  Private (Platform Admin only)
 */
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, organizationId, userId, action } = req.query;

    const query = {};

    if (organizationId) query.organizationId = organizationId;
    if (userId) query.userId = userId;
    if (action) query.action = action;

    const logs = await UsageLog.find(query)
      .populate('userId', 'name email role')
      .populate('organizationId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await UsageLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity logs'
    });
  }
});

module.exports = router;