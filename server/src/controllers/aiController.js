const Task = require('../models/Task');
const Prompt = require('../models/Prompt');
const { generateContentBrief, checkAIHealth } = require('../services/aiService');
const { getFrameworkTemplate } = require('../utils/frameworkTemplates');

// @desc    Generate AI Content Brief for a task
// @route   POST /api/ai/generate-brief
// @access  Private (Content Writer)
exports.generateContentBrief = async (req, res, next) => {
  try {
    const { taskId, frameworkType, promptId } = req.body;

    // Validate required fields
    if (!taskId || !frameworkType) {
      return res.status(400).json({
        success: false,
        message: 'Task ID and framework type are required'
      });
    }

    // Ensure frameworkType is a string (handle array from frontend)
    let framework = frameworkType;
    if (Array.isArray(framework)) {
      framework = framework[0] || '';
    }
    if (framework) {
      framework = String(framework).trim();
    }

    if (!framework) {
      return res.status(400).json({
        success: false,
        message: 'Framework type must be a valid string'
      });
    }

    // Get the task with populated project
    const task = await Task.findOne({
      _id: taskId,
      organizationId: req.user.currentOrganization
    })
      .populate('projectId', 'projectName businessName industry');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Verify user has access to this task
    const isAssignedUser = task.assignedTo?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isPerformanceMarketer = req.user.role === 'performance_marketer';

    if (!isAssignedUser && !isAdmin && !isPerformanceMarketer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }

    // Get the framework template
    const frameworkTemplate = getFrameworkTemplate(framework);
    if (!frameworkTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid framework type'
      });
    }

    // Get optional custom prompt
    let customPrompt = null;
    if (promptId) {
      const prompt = await Prompt.findById(promptId);
      if (prompt && prompt.isActive) {
        customPrompt = prompt.content;
        // Increment usage with error handling for corrupted data
        try {
          await prompt.incrementUsage();
        } catch (usageError) {
          console.warn('Failed to increment prompt usage, continuing anyway:', usageError.message);
          // Continue even if usage increment fails
        }
      }
    }

    // Build context from task and project
    const context = {
      // Project info
      projectName: task.projectId?.projectName || '',
      businessName: task.projectId?.businessName || '',
      industry: task.projectId?.industry || '',

      // Task info
      taskTitle: task.taskTitle,
      taskType: task.taskType,

      // Strategy context from task
      platform: task.strategyContext?.platform || '',
      funnelStage: task.strategyContext?.funnelStage || '',
      creativeType: task.strategyContext?.creativeType || task.assetType || '',
      hook: task.strategyContext?.hook || '',
      headline: task.strategyContext?.headline || '',
      cta: task.strategyContext?.cta || '',
      creativeAngle: task.strategyContext?.creativeAngle || '',
      messaging: task.strategyContext?.messaging || '',
      targetAudience: task.strategyContext?.targetAudience || '',
      offer: task.strategyContext?.offer || '',
      painPoints: task.strategyContext?.painPoints || [],
      desires: task.strategyContext?.desires || [],
      avatar: task.strategyContext?.avatar || {},
    };

    // Generate the content brief
    // Use user's preferred AI provider or default from env
    const aiProvider = req.user?.preferredAIProvider || process.env.AI_PROVIDER || 'ollama';
    const contentBrief = await generateContentBrief({
      framework,
      frameworkTemplate: customPrompt || frameworkTemplate,
      context,
      provider: aiProvider
    });

    // Save the generated brief to the task
    task.aiPrompt = contentBrief;
    task.aiFramework = framework;
    await task.save();

    res.status(200).json({
      success: true,
      data: {
        contentBrief,
        framework,
        task: task._id
      }
    });
  } catch (error) {
    console.error('Error generating content brief:', error);

    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        message: 'AI service not configured. Please contact administrator.',
        error: error.message
      });
    }

    if (error.message.includes('timed out')) {
      return res.status(504).json({
        success: false,
        message: 'AI service timed out. Please try again.',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate content brief',
      error: error.message
    });
  }
};

// @desc    Regenerate AI Content Brief
// @route   POST /api/ai/regenerate-brief/:taskId
// @access  Private (Content Writer)
exports.regenerateContentBrief = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { frameworkType, promptId } = req.body;

    // Get the task
    const task = await Task.findOne({
      _id: taskId,
      organizationId: req.user.currentOrganization
    })
      .populate('projectId', 'projectName businessName industry');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Verify user has access
    const isAssignedUser = task.assignedTo?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isPerformanceMarketer = req.user.role === 'performance_marketer';
    const isGraphicDesigner = req.user.role === 'graphic_designer';

    if (!isAssignedUser && !isAdmin && !isPerformanceMarketer && !isGraphicDesigner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }

    // Use existing framework or provided one
    // Handle case where aiFramework might be stored as an array (legacy data)
    let framework = frameworkType || task.aiFramework;

    // Ensure framework is a string (handle legacy array data)
    if (Array.isArray(framework)) {
      framework = framework[0] || '';
    }
    if (framework) {
      framework = String(framework).trim();
    }

    if (!framework) {
      return res.status(400).json({
        success: false,
        message: 'Framework type is required'
      });
    }

    // Get the framework template
    const frameworkTemplate = getFrameworkTemplate(framework);

    // Get optional custom prompt
    let customPrompt = null;
    if (promptId) {
      const prompt = await Prompt.findById(promptId);
      if (prompt && prompt.isActive) {
        customPrompt = prompt.content;
        // Increment usage with error handling for corrupted data
        try {
          await prompt.incrementUsage();
        } catch (usageError) {
          console.warn('Failed to increment prompt usage, continuing anyway:', usageError.message);
          // Continue even if usage increment fails
        }
      }
    }

    // Build context
    const context = {
      projectName: task.projectId?.projectName || '',
      businessName: task.projectId?.businessName || '',
      industry: task.projectId?.industry || '',
      taskTitle: task.taskTitle,
      taskType: task.taskType,
      platform: task.strategyContext?.platform || '',
      funnelStage: task.strategyContext?.funnelStage || '',
      creativeType: task.strategyContext?.creativeType || task.assetType || '',
      hook: task.strategyContext?.hook || '',
      headline: task.strategyContext?.headline || '',
      cta: task.strategyContext?.cta || '',
      creativeAngle: task.strategyContext?.creativeAngle || '',
      messaging: task.strategyContext?.messaging || '',
      targetAudience: task.strategyContext?.targetAudience || '',
      offer: task.strategyContext?.offer || '',
      painPoints: task.strategyContext?.painPoints || [],
      desires: task.strategyContext?.desires || [],
      avatar: task.strategyContext?.avatar || {},
    };

    // Generate new content brief
    // Use user's preferred AI provider or default from env
    const aiProvider = req.user?.preferredAIProvider || process.env.AI_PROVIDER || 'ollama';
    const contentBrief = await generateContentBrief({
      framework,
      frameworkTemplate: customPrompt || frameworkTemplate,
      context,
      provider: aiProvider
    });

    // Update task
    task.aiPrompt = contentBrief;
    task.aiFramework = framework;
    await task.save();

    res.status(200).json({
      success: true,
      data: {
        contentBrief,
        framework
      }
    });
  } catch (error) {
    console.error('Error regenerating content brief:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate content brief',
      error: error.message
    });
  }
};

// @desc    Get AI service status
// @route   GET /api/ai/status
// @access  Private (Admin)
exports.getAIStatus = async (req, res, next) => {
  try {
    // Only admin can check AI status
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can check AI status'
      });
    }

    const status = await checkAIHealth();

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check AI status',
      error: error.message
    });
  }
};

// @desc    Get available frameworks
// @route   GET /api/ai/frameworks
// @access  Private
exports.getFrameworks = async (req, res, next) => {
  try {
    const frameworks = [
      { value: 'PAS', label: 'PAS - Problem-Agitate-Solution', description: 'Identify problem, amplify pain, present solution' },
      { value: 'AIDA', label: 'AIDA - Attention-Interest-Desire-Action', description: 'Classic marketing framework for conversions' },
      { value: 'BAB', label: 'BAB - Before-After-Bridge', description: 'Show transformation from pain to pleasure' },
      { value: '4C', label: '4C - Clear-Concise-Compelling-Credible', description: 'Clear communication framework' },
      { value: 'STORY', label: 'STORY - Storytelling Framework', description: 'Hook-Relate-Educate-Stimulate-Transition' },
      { value: 'DIRECT_RESPONSE', label: 'Direct Response', description: 'Headline-Offer-CTA focused copy' },
      { value: 'HOOKS', label: 'Hook Generator', description: 'Generate multiple scroll-stopping hooks' },
      { value: 'OBJECTION', label: 'Objection Handling', description: 'Acknowledge-Isolate-Reframe-Prove-Overcome' },
      { value: 'PASTOR', label: 'PASTOR - Problem-Amplify-Story-Testimony-Offer-Response', description: 'Complete persuasion framework' },
      { value: 'QUEST', label: 'QUEST - Qualify-Understand-Educate-Stimulate-Transition', description: 'Nurturing content framework' },
      { value: 'ACCA', label: 'ACCA - Awareness-Comparison-Consideration-Action', description: 'Consideration stage framework' },
      { value: 'FAB', label: 'FAB - Features-Advantages-Benefits', description: 'Transform features into emotional benefits' },
      { value: '5A', label: '5A - Aware-Appeal-Ask-Act-Assess', description: 'Engagement-focused framework' },
      { value: 'SLAP', label: 'SLAP - Stop-Look-Act-Purchase', description: 'Quick-conversion framework' },
      { value: 'HOOK_STORY_OFFER', label: 'Hook-Story-Offer', description: 'Social media content formula' },
      { value: '4P', label: '4P - Picture-Promise-Prove-Push', description: 'Persuasive copy framework' },
      { value: 'MASTER', label: 'MASTER - Multi-Framework', description: 'Intelligent combination of frameworks' },
    ];

    res.status(200).json({
      success: true,
      data: frameworks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available AI providers
// @route   GET /api/ai/providers
// @access  Private
exports.getAIProviders = async (req, res, next) => {
  try {
    const providers = [
      {
        value: 'ollama',
        label: 'Ollama (GLM-5)',
        description: 'Local or cloud-based Ollama with GLM-5 model',
        requiresApiKey: true
      },
      {
        value: 'gemini',
        label: 'Google Gemini',
        description: 'Google Gemini 2.5 Flash model',
        requiresApiKey: true
      },
      {
        value: 'openai',
        label: 'OpenAI',
        description: 'GPT-3.5/GPT-4 models',
        requiresApiKey: true
      },
      {
        value: 'deepseek',
        label: 'DeepSeek',
        description: 'DeepSeek Chat model',
        requiresApiKey: true
      },
      // {
      //   value: 'hypereal',
      //   label: 'Hypereal AI',
      //   description: 'Claude Sonnet via Hypereal',
      //   requiresApiKey: true
      // }
    ];

    // Get user's preferred provider
    const preferredProvider = req.user.preferredAIProvider || 'ollama';

    // Check health status for each provider
    const status = await checkAIHealth();

    res.status(200).json({
      success: true,
      data: {
        providers,
        preferredProvider,
        currentProvider: process.env.AI_PROVIDER || 'ollama',
        status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set user's preferred AI provider
// @route   PUT /api/ai/provider
// @access  Private
exports.setAIProvider = async (req, res, next) => {
  try {
    const { provider } = req.body;
    const validProviders = ['ollama', 'gemini', 'openai', 'deepseek'];

    if (!provider || !validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be one of: ollama, gemini, openai, deepseek'
      });
    }

    // Update user's preferred provider
    req.user.preferredAIProvider = provider;
    await req.user.save();

    res.status(200).json({
      success: true,
      message: `AI provider set to ${provider}`,
      data: {
        preferredProvider: provider
      }
    });
  } catch (error) {
    next(error);
  }
};