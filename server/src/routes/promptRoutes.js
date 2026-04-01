const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPrompts,
  getPrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  togglePromptActive,
  getPromptsByRole,
  generatePrompt,
  getOllamaStatus,
  getFrameworkTypes
} = require('../controllers/promptController');

// All routes require authentication
router.use(protect);

// @route   GET /api/prompts/frameworks
// @desc    Get available framework types for Content Planner
// @access  Private
router.get('/frameworks', getFrameworkTypes);

// @route   POST /api/prompts/generate
// @desc    Generate AI prompt using Ollama
// @access  Private
router.post('/generate', generatePrompt);

// @route   GET /api/prompts/ollama-status
// @desc    Check Ollama health status
// @access  Private (Admin only)
router.get('/ollama-status', getOllamaStatus);

// @route   GET /api/prompts
// @desc    Get all prompts (with filters)
// @access  Private
router.get('/', getPrompts);

// @route   GET /api/prompts/by-role/:role
// @desc    Get prompts by role
// @access  Private
router.get('/by-role/:role', getPromptsByRole);

// @route   GET /api/prompts/:id
// @desc    Get single prompt
// @access  Private
router.get('/:id', getPrompt);

// @route   POST /api/prompts
// @desc    Create new prompt
// @access  Private (Admin only)
router.post('/', createPrompt);

// @route   PUT /api/prompts/:id
// @desc    Update prompt
// @access  Private (Admin only)
router.put('/:id', updatePrompt);

// @route   PUT /api/prompts/:id/toggle-active
// @desc    Toggle prompt active status
// @access  Private (Admin only)
router.put('/:id/toggle-active', togglePromptActive);

// @route   DELETE /api/prompts/:id
// @desc    Delete prompt
// @access  Private (Admin only)
router.delete('/:id', deletePrompt);

module.exports = router;