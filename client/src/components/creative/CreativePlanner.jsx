import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, Button, Textarea, Badge } from '@/components/ui';
import {
  Image, Video, Layout, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, FileImage,
  Target, Type, Monitor, Users, FileText, Megaphone, TrendingUp, Zap, Eye, MousePointer,
  UserPlus, Send, DollarSign, Sparkles
} from 'lucide-react';
import {
  CREATIVE_TYPES,
  CREATIVE_SUBTYPES,
  CAMPAIGN_OBJECTIVES,
  CREATIVE_ROLES,
  getSubTypesForCreativeType,
  getRoleLabel
} from '@/constants/creativeTypes';
import { frameworkCategoryService } from '@/services/api';

// Icon mapping for creative types
const CREATIVE_TYPE_ICONS = {
  IMAGE: Image,
  VIDEO: Video,
  CAROUSEL: Layout
};

// Icon mapping for ad types (objectives)
const OBJECTIVE_ICONS = {
  awareness: Eye,
  nurturing: TrendingUp,
  traffic: MousePointer,
  retargeting: Target,
  engagement: Zap,
  lead_generation: UserPlus,
  conversion: Send,
  app_install: Monitor,
  sales: DollarSign,
  brand_consideration: Megaphone
};

// Objective colors
const OBJECTIVE_COLORS = {
  awareness: 'bg-blue-100 text-blue-700 border-blue-200',
  nurturing: 'bg-green-100 text-green-700 border-green-200',
  traffic: 'bg-purple-100 text-purple-700 border-purple-200',
  retargeting: 'bg-orange-100 text-orange-700 border-orange-200',
  engagement: 'bg-pink-100 text-pink-700 border-pink-200',
  lead_generation: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  conversion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  app_install: 'bg-violet-100 text-violet-700 border-violet-200',
  sales: 'bg-amber-100 text-amber-700 border-amber-200',
  brand_consideration: 'bg-indigo-100 text-indigo-700 border-indigo-200'
};

// Screen sizes (flat list without platform dependency)
const FLAT_SCREEN_SIZES = [
  { key: 'square', label: 'Square (1:1)', dimensions: '1080x1080' },
  { key: 'portrait', label: 'Portrait (4:5)', dimensions: '1080x1350' },
  { key: 'three_four', label: '3:4', dimensions: '1080x1440' },
  { key: 'story', label: 'Story (9:16)', dimensions: '1080x1920' },
  { key: 'reel', label: 'Reel (9:16)', dimensions: '1080x1920' },
  { key: 'shorts', label: 'Shorts (9:16)', dimensions: '1080x1920' },
  { key: 'video', label: 'Video (16:9)', dimensions: '1920x1080' },
  { key: 'thumbnail', label: 'Thumbnail', dimensions: '1280x720' }
];

// Generate unique ID for creative rows
const generateId = () => `creative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Default creative row
const createEmptyCreative = () => ({
  _id: generateId(),
  name: '',
  adType: '',
  creativeType: 'IMAGE',
  subType: '',
  screenSizes: [],
  assignedRole: '',
  assignedTeamMembers: [],
  contentWriter: '', // Content Planner assigned to this creative
  adIntent: '', // Ad intent (e.g., "UGC ads, testimonial ads")
  aiFramework: '', // AI Framework for content planner
  aiSubCategory: '', // Subcategory for the framework
  notes: ''
});

// Framework options for content planner
const FRAMEWORK_OPTIONS = [
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

// Map role keys to project assignedTeam fields
const ROLE_TO_TEAM_FIELD = {
  'content_writer': { arrayField: 'contentWriters', legacyField: 'contentWriter' },
  'graphic_designer': { arrayField: 'graphicDesigners', legacyField: 'graphicDesigner' },
  'video_editor': { arrayField: 'videoEditors', legacyField: 'videoEditor' }
};

export default function CreativePlanner({
  projectId,
  initialData,
  onSave,
  isCompleted,
  project,
  readOnly = false
}) {
  const [saving, setSaving] = useState(false);
  const [projectAssignedTeam, setProjectAssignedTeam] = useState({});
  const [creativePlan, setCreativePlan] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [subCategories, setSubCategories] = useState([]); // Subcategories for selected framework
  const [allSubCategories, setAllSubCategories] = useState([]); // All subcategories

  // Fetch all subcategories on mount
  useEffect(() => {
    const fetchAllSubCategories = async () => {
      try {
        const response = await frameworkCategoryService.getCategories();
        setAllSubCategories(response.data || []);
      } catch (error) {
        console.error('Failed to fetch subcategories:', error);
      }
    };
    fetchAllSubCategories();
  }, []);

  // Extract project assigned team from project prop - this is the ONLY source of team members
  useEffect(() => {
    console.log('=== CreativePlanner: Extracting project-assigned team ===');
    console.log('Project prop:', project);

    if (project?.assignedTeam) {
      console.log('assignedTeam found with keys:', Object.keys(project.assignedTeam));
      console.log('contentWriters:', project.assignedTeam.contentWriters);
      console.log('graphicDesigners:', project.assignedTeam.graphicDesigners);
      console.log('videoEditors:', project.assignedTeam.videoEditors);

      setProjectAssignedTeam(project.assignedTeam);
    } else {
      console.log('No assignedTeam in project');
      setProjectAssignedTeam({});
    }
  }, [project]);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.creativePlan && initialData.creativePlan.length > 0) {
        const migratedPlan = initialData.creativePlan.map(item => ({
          _id: item._id || generateId(),
          name: item.name || '',
          adType: item.objective || item.adType || '',
          creativeType: item.creativeType || 'IMAGE',
          subType: item.subType || item.adType || '',
          screenSizes: item.screenSizes || [],
          assignedRole: item.assignedRole || '',
          assignedTeamMembers: item.assignedTeamMembers || [],
          contentWriter: item.contentWriter || '', // Content Planner
          adIntent: item.adIntent || '', // Ad intent
          aiFramework: item.aiFramework || item.framework || '', // AI Framework (support legacy 'framework')
          aiSubCategory: item.aiSubCategory || item.subCategory || '', // Subcategory (support legacy 'subCategory')
          notes: item.notes || ''
        }));
        setCreativePlan(migratedPlan);
        // Expand all cards initially
        const expanded = {};
        migratedPlan.forEach(item => {
          expanded[item._id] = true;
        });
        setExpandedCards(expanded);
      }

      if (initialData.additionalNotes) {
        setAdditionalNotes(initialData.additionalNotes);
      }
    }
  }, [initialData]);

  // Toggle card expansion
  const toggleCard = (rowId) => {
    setExpandedCards(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  // Add new creative row
  const addCreativeRow = () => {
    const newId = generateId();
    setCreativePlan(prev => [...prev, { ...createEmptyCreative(), _id: newId }]);
    setExpandedCards(prev => ({ ...prev, [newId]: true }));
  };

  // Remove creative row
  const removeCreativeRow = (rowId) => {
    setCreativePlan(prev => prev.filter(row => row._id !== rowId));
    setExpandedCards(prev => {
      const newExpanded = { ...prev };
      delete newExpanded[rowId];
      return newExpanded;
    });
  };

  // Update creative row field
  const updateCreativeRow = (rowId, field, value) => {
    setCreativePlan(prev =>
      prev.map(row => {
        if (row._id !== rowId) return row;

        const updatedRow = { ...row, [field]: value };

        // Reset sub-type when creative type changes
        if (field === 'creativeType') {
          updatedRow.subType = '';
        }

        // When role changes, clear the team member selection so user can manually select
        if (field === 'assignedRole') {
          updatedRow.assignedTeamMembers = [];
          console.log(`Role changed to "${value}", cleared team member selection for manual assignment`);
        }

        // Reset aiSubCategory when aiFramework changes
        if (field === 'aiFramework') {
          updatedRow.aiSubCategory = '';
        }

        return updatedRow;
      })
    );
  };

  // Get subcategories for a specific framework
  const getSubCategoriesForFramework = (frameworkType) => {
    if (!frameworkType) return [];
    return allSubCategories.filter(c => c.frameworkType === frameworkType);
  };

  // Handle screen size toggle
  const toggleScreenSize = (rowId, sizeKey) => {
    setCreativePlan(prev =>
      prev.map(row => {
        if (row._id !== rowId) return row;

        const currentSizes = row.screenSizes || [];
        const newSizes = currentSizes.includes(sizeKey)
          ? currentSizes.filter(s => s !== sizeKey)
          : [...currentSizes, sizeKey];

        return { ...row, screenSizes: newSizes };
      })
    );
  };

  // Get the project-assigned team members for a role (set by Admin during project creation)
  // These are the available members that can be manually selected for each creative
  const getProjectAssignedMembers = (role) => {
    console.log('=== getProjectAssignedMembers called ===');
    console.log('Role requested:', role);

    if (!role) {
      console.log('No role provided, returning empty array');
      return [];
    }

    const fieldConfig = ROLE_TO_TEAM_FIELD[role];
    console.log('fieldConfig for role:', fieldConfig);

    if (!fieldConfig) {
      console.log('No fieldConfig found for role:', role);
      return [];
    }

    if (!projectAssignedTeam || Object.keys(projectAssignedTeam).length === 0) {
      console.log('No projectAssignedTeam data available');
      return [];
    }

    const assignedMembers = [];

    // Check new array field first (preferred)
    const arrayField = projectAssignedTeam[fieldConfig.arrayField];
    console.log(`Array field "${fieldConfig.arrayField}":`, arrayField);

    if (arrayField && Array.isArray(arrayField) && arrayField.length > 0) {
      arrayField.forEach(member => {
        // Handle both populated objects and ObjectId strings
        if (member) {
          if (typeof member === 'object' && member !== null) {
            // Populated object with _id and name
            if (member._id || member.name) {
              assignedMembers.push({
                _id: member._id?.toString?.() || member._id || String(member),
                name: member.name || 'Unknown',
                isProjectAssigned: true
              });
            }
          } else if (typeof member === 'string') {
            // ObjectId string
            assignedMembers.push({
              _id: member,
              name: 'Team Member',
              isProjectAssigned: true
            });
          }
        }
      });
      console.log(`Found ${assignedMembers.length} members from array field`);
    }

    // Fall back to legacy field if no array field data
    if (assignedMembers.length === 0) {
      const legacyField = projectAssignedTeam[fieldConfig.legacyField];
      console.log(`Checking legacy field "${fieldConfig.legacyField}":`, legacyField);

      if (legacyField) {
        if (typeof legacyField === 'object' && legacyField !== null) {
          // Populated object
          assignedMembers.push({
            _id: legacyField._id?.toString?.() || legacyField._id || String(legacyField),
            name: legacyField.name || 'Unknown',
            isProjectAssigned: true
          });
          console.log('Found 1 member from legacy field (object)');
        } else if (typeof legacyField === 'string') {
          // ObjectId string
          assignedMembers.push({
            _id: legacyField,
            name: 'Team Member',
            isProjectAssigned: true
          });
          console.log('Found 1 member from legacy field (string)');
        }
      }
    }

    console.log(`Returning ${assignedMembers.length} project-assigned members for role "${role}"`);
    return assignedMembers;
  };

  // Get Content Planners from project assigned team
  const getContentWriters = () => {
    console.log('=== getContentWriters called ===');
    console.log('projectAssignedTeam:', projectAssignedTeam);

    if (!projectAssignedTeam || Object.keys(projectAssignedTeam).length === 0) {
      console.log('No projectAssignedTeam data available');
      return [];
    }

    const contentWriters = [];

    // Check new array field first
    const arrayField = projectAssignedTeam.contentWriters;
    console.log('contentWriters array field:', arrayField);

    if (arrayField && Array.isArray(arrayField) && arrayField.length > 0) {
      arrayField.forEach(member => {
        console.log('Processing contentWriter member:', member);

        // Handle both populated objects and ObjectId strings
        if (member) {
          if (typeof member === 'object' && member !== null) {
            // Populated object with _id and name
            if (member._id || member.name) {
              contentWriters.push({
                _id: member._id?.toString?.() || member._id || String(member),
                name: member.name || 'Unknown'
              });
            }
          } else if (typeof member === 'string') {
            // ObjectId string - need to fetch name (use placeholder for now)
            contentWriters.push({
              _id: member,
              name: 'Team Member' // Placeholder - actual name should be populated
            });
          }
        }
      });
      console.log(`Found ${contentWriters.length} Content Planners from array field`);
    }

    // Fall back to legacy field if no array field data
    if (contentWriters.length === 0) {
      const legacyField = projectAssignedTeam.contentWriter;
      console.log('Checking legacy contentWriter field:', legacyField);

      if (legacyField) {
        if (typeof legacyField === 'object' && legacyField !== null) {
          // Populated object
          contentWriters.push({
            _id: legacyField._id?.toString?.() || legacyField._id || String(legacyField),
            name: legacyField.name || 'Unknown'
          });
          console.log('Found 1 Content Planner from legacy field (object)');
        } else if (typeof legacyField === 'string') {
          // ObjectId string
          contentWriters.push({
            _id: legacyField,
            name: 'Team Member'
          });
          console.log('Found 1 Content Planner from legacy field (string)');
        }
      }
    }

    console.log(`getContentWriters returning ${contentWriters.length} writers:`, contentWriters);
    return contentWriters;
  };

  // Memoize Content Planners to avoid recalculating on every render
  const availableContentWriters = useMemo(() => {
    return getContentWriters();
  }, [projectAssignedTeam]);

  // Calculate totals
  const totalCreatives = creativePlan.length;
  const imageCount = creativePlan.filter(c => c.creativeType === 'IMAGE').length;
  const videoCount = creativePlan.filter(c => c.creativeType === 'VIDEO').length;
  const carouselCount = creativePlan.filter(c => c.creativeType === 'CAROUSEL').length;

  // Handle save
  const handleSave = async (markComplete = false) => {
    try {
      setSaving(true);

      const validCreatives = creativePlan.filter(row =>
        row.adType &&
        row.creativeType &&
        row.subType &&
        row.screenSizes.length > 0 &&
        row.assignedRole &&
        row.assignedTeamMembers.length > 0
      );

      if (markComplete && validCreatives.length === 0) {
        toast.error('Please add at least one creative with all fields filled');
        setSaving(false);
        return;
      }

      const data = {
        creativePlan: creativePlan.map((row, index) => ({
          creativeType: row.creativeType,
          subType: row.subType,
          objective: row.adType,
          screenSizes: row.screenSizes || [],
          assignedRole: row.assignedRole || '',
          assignedTeamMembers: row.assignedTeamMembers || [],
          contentWriter: row.contentWriter || '', // Content Planner
          adIntent: row.adIntent || '', // Ad intent
          aiFramework: row.aiFramework || '', // AI Framework
          aiSubCategory: row.aiSubCategory || '', // Subcategory
          notes: row.notes || '',
          name: row.name || `Creative ${index + 1}`,
          order: index,
          _id: row._id && !row._id.toString().startsWith('creative_') ? row._id : undefined
        })),
        additionalNotes,
        isCompleted: markComplete
      };

      await onSave(data, markComplete);
      toast.success(markComplete ? 'Creative strategy completed!' : 'Progress saved!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-semibold text-sm">
          2
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Creative Strategy</h2>
          <p className="text-sm text-gray-500">Define your creatives and assign team members from the project team</p>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-green-800">Creative Strategy Completed!</h3>
            <p className="text-sm text-green-600">All creative plan details have been saved.</p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {creativePlan.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-primary-600">{totalCreatives}</div>
            <div className="text-sm text-gray-500">Total Creatives</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{imageCount}</span>
            </div>
            <div className="text-sm text-gray-500">Image</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold text-purple-600">{videoCount}</span>
            </div>
            <div className="text-sm text-gray-500">Video</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-amber-600">{carouselCount}</span>
            </div>
            <div className="text-sm text-gray-500">Carousel</div>
          </div>
        </div>
      )}

      {/* Creative Cards */}
      <div className="space-y-4">
        {creativePlan.map((row, index) => {
          const subTypes = getSubTypesForCreativeType(row.creativeType);
          const isExpanded = expandedCards[row._id];

          return (
            <Card key={row._id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
              {/* Card Header - Always Visible */}
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                onClick={() => toggleCard(row._id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100 text-primary-600 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {row.name || `Creative ${index + 1}`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {row.adType && (
                        <Badge className={`${OBJECTIVE_COLORS[row.adType] || 'bg-gray-100 text-gray-700'} text-xs`}>
                          {CAMPAIGN_OBJECTIVES.find(o => o.key === row.adType)?.label || row.adType}
                        </Badge>
                      )}
                      {row.creativeType && (
                        <Badge variant="secondary" className="text-xs">
                          {CREATIVE_TYPES.find(t => t.key === row.creativeType)?.label || row.creativeType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCreativeRow(row._id);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {/* Card Body - Collapsible */}
              {isExpanded && (
                <CardBody className="p-4 space-y-4">
                  {/* Row 1: Creative Name & Ad Type */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Creative Name */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        Creative Name
                      </label>
                      <input
                        type="text"
                        value={row.name || ''}
                        onChange={(e) => updateCreativeRow(row._id, 'name', e.target.value)}
                        placeholder={`Creative ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={readOnly}
                      />
                    </div>

                    {/* Ad Type (Objective) */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Target className="w-4 h-4 text-gray-400" />
                        Ad Type
                      </label>
                      <select
                        value={row.adType || ''}
                        onChange={(e) => updateCreativeRow(row._id, 'adType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={readOnly}
                      >
                        <option value="">Select ad type...</option>
                        {CAMPAIGN_OBJECTIVES.map(obj => (
                          <option key={obj.key} value={obj.key}>{obj.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Creative Type & Sub-Type */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Creative Type */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Type className="w-4 h-4 text-gray-400" />
                        Creative Type
                      </label>
                      <select
                        value={row.creativeType}
                        onChange={(e) => updateCreativeRow(row._id, 'creativeType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {CREATIVE_TYPES.map(type => (
                          <option key={type.key} value={type.key}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sub-Type */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <FileImage className="w-4 h-4 text-gray-400" />
                        Sub Type
                      </label>
                      <select
                        value={row.subType || ''}
                        onChange={(e) => updateCreativeRow(row._id, 'subType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select sub-type...</option>
                        {subTypes.map(subType => (
                          <option key={subType} value={subType}>{subType}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Screen Sizes */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Monitor className="w-4 h-4 text-gray-400" />
                      Screen Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {FLAT_SCREEN_SIZES.map(size => {
                        const isSelected = (row.screenSizes || []).includes(size.key);
                        return (
                          <button
                            key={size.key}
                            onClick={() => toggleScreenSize(row._id, size.key)}
                            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                              isSelected
                                ? 'bg-primary-100 border-primary-300 text-primary-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary-200 hover:bg-primary-50'
                            }`}
                          >
                            {size.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 4: Assigned Role & Team Members */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Assigned Role */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        Production Role
                      </label>
                      <select
                        value={row.assignedRole || ''}
                        onChange={(e) => updateCreativeRow(row._id, 'assignedRole', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select role...</option>
                        {CREATIVE_ROLES.filter(role => role.key !== 'content_writer').map(role => (
                          <option key={role.key} value={role.key}>{role.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Who creates the visual creative
                      </p>
                    </div>

                    {/* Team Members - Dropdown for manual selection */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <UserPlus className="w-4 h-4 text-gray-400" />
                        Team Member
                      </label>
                      {row.assignedRole ? (
                        <div className="space-y-1">
                          <select
                            value={(row.assignedTeamMembers && row.assignedTeamMembers[0]) || ''}
                            onChange={(e) => updateCreativeRow(row._id, 'assignedTeamMembers', e.target.value ? [e.target.value] : [])}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">Select team member...</option>
                            {getProjectAssignedMembers(row.assignedRole).map(member => (
                              <option key={member._id} value={member._id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                          {getProjectAssignedMembers(row.assignedRole).length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                              ⚠️ No team members assigned for this role. Contact Admin to assign.
                            </p>
                          )}
                          {getProjectAssignedMembers(row.assignedRole).length > 0 && (
                            <p className="text-xs text-gray-500">
                              Select from team members assigned to this project
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          Select a role first to see available team members
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 4.5: Content Planner */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        Content Planner
                      </label>
                      <select
                        value={row.contentWriter || ''}
                        onChange={(e) => updateCreativeRow(row._id, 'contentWriter', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select Content Planner...</option>
                        {availableContentWriters.map(writer => (
                          <option key={writer._id} value={writer._id}>
                            {writer.name}
                          </option>
                        ))}
                      </select>
                      {availableContentWriters.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ No Content Planners assigned to project. Contact Admin.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        &nbsp;
                      </label>
                      <p className="text-xs text-gray-500 italic">
                        The Content Planner creates the copy/text for this creative.
                        Select from writers assigned to the project by Admin.
                      </p>
                    </div>
                  </div>

                  {/* Row 4.6: Framework & Subcategory for Content Planner */}
                  {row.contentWriter && (
                    <div className="grid grid-cols-2 gap-4 bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          AI Framework
                        </label>
                        <select
                          value={row.aiFramework || ''}
                          onChange={(e) => updateCreativeRow(row._id, 'aiFramework', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                          <option value="">Select Framework...</option>
                          {FRAMEWORK_OPTIONS.map(fw => (
                            <option key={fw.value} value={fw.value}>{fw.label}</option>
                          ))}
                        </select>
                        {row.aiFramework && (
                          <p className="text-xs text-gray-500 mt-1">
                            {FRAMEWORK_OPTIONS.find(fw => fw.value === row.aiFramework)?.description}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subcategory <span className="text-gray-400">(Optional)</span>
                        </label>
                        <select
                          value={row.aiSubCategory || ''}
                          onChange={(e) => updateCreativeRow(row._id, 'aiSubCategory', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          disabled={!row.aiFramework}
                        >
                          <option value="">No subcategory (framework-level)</option>
                          {getSubCategoriesForFramework(row.aiFramework).map(cat => (
                            <option key={cat._id} value={cat.key}>
                              {cat.displayName}{cat.isSystem ? ' (Default)' : ''}
                            </option>
                          ))}
                        </select>
                        {row.aiFramework && getSubCategoriesForFramework(row.aiFramework).length === 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            No subcategories available for this framework
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Row 5: Ad Intent */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <Target className="w-4 h-4 text-gray-400" />
                      Ad Intent
                    </label>
                    <input
                      type="text"
                      value={row.adIntent || ''}
                      onChange={(e) => updateCreativeRow(row._id, 'adIntent', e.target.value)}
                      placeholder="e.g., UGC ads, testimonial ads, product demo..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Define the type of ads (e.g., UGC ads, testimonial ads, product demo)
                    </p>
                  </div>

                  {/* Row 6: Notes */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <Textarea
                      value={row.notes || ''}
                      onChange={(e) => updateCreativeRow(row._id, 'notes', e.target.value)}
                      placeholder="Add any notes or instructions..."
                      rows={2}
                    />
                  </div>
                </CardBody>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Creative Button */}
      {!readOnly && (
        <Button
          variant="outline"
          onClick={addCreativeRow}
          className="w-full py-3 border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Creative
        </Button>
      )}

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
        </CardHeader>
        <CardBody>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Add any additional notes or instructions for the creative strategy..."
            rows={4}
            disabled={readOnly}
          />
        </CardBody>
      </Card>

      {/* Actions */}
      {!readOnly && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            Save Progress
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || isCompleted}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete & Continue
          </Button>
        </div>
      )}
    </div>
  );
}