const express = require('express');
const router = express.Router();
const {
  getCreativeStrategy,
  upsertCreativeStrategy,
  addCreative,
  updateCreative,
  deleteCreative,
  generateCreativeCards,
  addAdType,
  removeAdType,
  updateAdType,
  updateAdditionalNotes
} = require('../controllers/creativeController');
const { protect, authorize } = require('../middleware/auth');
const { checkStageAccess } = require('../middleware/stageGating');

// All routes are protected and require admin or performance_marketer role
router.use(protect);
router.use(authorize('admin', 'performance_marketer'));

// Creative strategy routes - require landingPage stage to be completed
router.route('/:projectId')
  .get(checkStageAccess('creativeStrategy'), getCreativeStrategy)
  .post(checkStageAccess('creativeStrategy'), upsertCreativeStrategy);

// Generate creative cards
router.post('/:projectId/generate', checkStageAccess('creativeStrategy'), generateCreativeCards);

// Ad type routes
router.post('/:projectId/ad-types', checkStageAccess('creativeStrategy'), addAdType);
router.put('/:projectId/ad-types/:typeKey', checkStageAccess('creativeStrategy'), updateAdType);
router.delete('/:projectId/ad-types/:typeKey', checkStageAccess('creativeStrategy'), removeAdType);

// Additional notes
router.put('/:projectId/notes', checkStageAccess('creativeStrategy'), updateAdditionalNotes);

// Creative item routes
router.post('/:projectId/stages/:stage/creatives', checkStageAccess('creativeStrategy'), addCreative);
router.put('/:projectId/stages/:stage/creatives/:creativeId', checkStageAccess('creativeStrategy'), updateCreative);
router.delete('/:projectId/stages/:stage/creatives/:creativeId', checkStageAccess('creativeStrategy'), deleteCreative);

module.exports = router;