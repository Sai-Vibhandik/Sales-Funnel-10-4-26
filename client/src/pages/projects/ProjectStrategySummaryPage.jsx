import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, Button, Spinner } from '@/components/ui';
import { ArrowLeft, Building2, User, Mail, Phone, DollarSign, Target, Gift, TrendingUp, FileText, Lightbulb, Download } from 'lucide-react';
import { strategySummaryService, projectService } from '@/services/api';

const SECTION_ICONS = {
  project: Building2,
  marketResearch: Target,
  offer: Gift,
  trafficStrategy: TrendingUp,
  landingPage: FileText,
  creativeStrategy: Lightbulb
};

export default function ProjectStrategySummaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectRes, summaryRes] = await Promise.all([
        projectService.getProject(id),
        strategySummaryService.getSummary(id)
      ]);
      setProject(projectRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to load strategy summary');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadText = async () => {
    try {
      const response = await strategySummaryService.getTextSummary(id);
      // Create blob and download
      const blob = new Blob([response], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strategy-summary-${id}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to download summary');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Strategy Summary</h1>
        </div>
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-500">No strategy data available for this project.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/projects/${id}`)} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Strategy Summary</h1>
            <p className="text-gray-600">{project?.projectName || project?.businessName}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={handleDownloadText}>
          <Download className="w-4 h-4 mr-2" />
          Download Summary
        </Button>
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Project Overview</h2>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Customer Name</label>
                <p className="font-medium text-gray-900">{summary.project?.customerName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Business Name</label>
                <p className="font-medium text-gray-900">{summary.project?.businessName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium text-gray-900">{summary.project?.email || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Mobile</label>
                <p className="font-medium text-gray-900">{summary.project?.mobile || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Industry</label>
                <p className="font-medium text-gray-900">{summary.project?.industry || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <label className="text-sm text-gray-500">Budget</label>
                <p className="font-medium text-gray-900">
                  {summary.project?.budget ? `$${summary.project.budget.toLocaleString()}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Market Research */}
      {summary.marketResearch && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Market Research</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6 space-y-4">
            {summary.marketResearch.avatar && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Target Audience</label>
                  <p className="font-medium text-gray-900">
                    {summary.marketResearch.avatar.ageRange} {summary.marketResearch.avatar.profession}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Location</label>
                  <p className="font-medium text-gray-900">{summary.marketResearch.avatar.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Income Level</label>
                  <p className="font-medium text-gray-900">{summary.marketResearch.avatar.income || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Interests</label>
                  <p className="font-medium text-gray-900">
                    {summary.marketResearch.avatar.interests?.join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            )}
            {summary.marketResearch.painPoints?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Pain Points</label>
                <ul className="mt-2 space-y-1">
                  {summary.marketResearch.painPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-red-500 mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.marketResearch.desires?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Desires</label>
                <ul className="mt-2 space-y-1">
                  {summary.marketResearch.desires.map((desire, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 mt-1">•</span>
                      {desire}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Offer Engineering */}
      {summary.offer && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Offer Engineering</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {summary.offer.functionalValue && (
                <div>
                  <label className="text-sm text-gray-500">Functional Value</label>
                  <p className="mt-1 text-gray-900">{summary.offer.functionalValue}</p>
                </div>
              )}
              {summary.offer.emotionalValue && (
                <div>
                  <label className="text-sm text-gray-500">Emotional Value</label>
                  <p className="mt-1 text-gray-900">{summary.offer.emotionalValue}</p>
                </div>
              )}
              {summary.offer.socialValue && (
                <div>
                  <label className="text-sm text-gray-500">Social Value</label>
                  <p className="mt-1 text-gray-900">{summary.offer.socialValue}</p>
                </div>
              )}
              {summary.offer.economicValue && (
                <div>
                  <label className="text-sm text-gray-500">Economic Value</label>
                  <p className="mt-1 text-gray-900">{summary.offer.economicValue}</p>
                </div>
              )}
              {summary.offer.experientialValue && (
                <div>
                  <label className="text-sm text-gray-500">Experiential Value</label>
                  <p className="mt-1 text-gray-900">{summary.offer.experientialValue}</p>
                </div>
              )}
              {summary.offer.pricing?.basePrice && (
                <div>
                  <label className="text-sm text-gray-500">Base Price</label>
                  <p className="mt-1 text-gray-900 font-semibold">
                    ${summary.offer.pricing.basePrice.toLocaleString()} {summary.offer.pricing.currency || 'USD'}
                  </p>
                </div>
              )}
            </div>
            {summary.offer.bonuses?.length > 0 && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700">Bonuses</label>
                <div className="mt-2 space-y-2">
                  {summary.offer.bonuses.map((bonus, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-gray-900">{bonus.title}</span>
                      <span className="text-purple-600 font-medium">${bonus.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Traffic Strategy */}
      {summary.trafficStrategy && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Traffic Strategy</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500">Selected Channels</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.trafficStrategy.channels?.filter(c => c.isSelected).map((channel, idx) => (
                    <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                      {channel.name}
                    </span>
                  ))}
                </div>
              </div>
              {summary.trafficStrategy.totalBudget && (
                <div>
                  <label className="text-sm text-gray-500">Total Budget</label>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    ${summary.trafficStrategy.totalBudget.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            {summary.trafficStrategy.hooks?.length > 0 && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700">Hooks</label>
                <div className="mt-2 space-y-2">
                  {summary.trafficStrategy.hooks.map((hook, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500 uppercase">{hook.type}</span>
                      <p className="text-gray-900 mt-1">{hook.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Landing Page */}
      {summary.landingPage && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-600" />
              <h2 className="text-lg font-semibold text-gray-900">Landing Page Strategy</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500">Page Type</label>
                <p className="mt-1 font-medium text-gray-900">
                  {summary.landingPage.type?.replace(/_/g, ' ') || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Lead Capture Method</label>
                <p className="mt-1 font-medium text-gray-900">
                  {summary.landingPage.leadCapture?.method || 'N/A'}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-500">Headline</label>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {summary.landingPage.headline || 'N/A'}
                </p>
              </div>
              {summary.landingPage.subheadline && (
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-500">Subheadline</label>
                  <p className="mt-1 text-gray-900">{summary.landingPage.subheadline}</p>
                </div>
              )}
              {summary.landingPage.ctaText && (
                <div>
                  <label className="text-sm text-gray-500">Call to Action</label>
                  <p className="mt-1 font-semibold text-cyan-600">{summary.landingPage.ctaText}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Creative Strategy */}
      {summary.creativeStrategy && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-semibold text-gray-900">Creative Strategy</h2>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            {summary.creativeStrategy.adTypes?.length > 0 && (
              <div className="space-y-4">
                {summary.creativeStrategy.adTypes.map((adType, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">{adType.typeName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {adType.creatives?.imageCreatives !== undefined && (
                        <div>
                          <span className="text-gray-500">Image Creatives:</span>
                          <span className="ml-2 font-medium">{adType.creatives.imageCreatives}</span>
                        </div>
                      )}
                      {adType.creatives?.videoCreatives !== undefined && (
                        <div>
                          <span className="text-gray-500">Video Creatives:</span>
                          <span className="ml-2 font-medium">{adType.creatives.videoCreatives}</span>
                        </div>
                      )}
                      {adType.creatives?.carouselCreatives !== undefined && (
                        <div>
                          <span className="text-gray-500">Carousel Creatives:</span>
                          <span className="ml-2 font-medium">{adType.creatives.carouselCreatives}</span>
                        </div>
                      )}
                      {adType.creatives?.platforms?.length > 0 && (
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-gray-500">Platforms:</span>
                          <span className="ml-2">{adType.creatives.platforms.join(', ')}</span>
                        </div>
                      )}
                      {adType.creatives?.hook && (
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-gray-500">Hook:</span>
                          <span className="ml-2">{adType.creatives.hook}</span>
                        </div>
                      )}
                      {adType.creatives?.headline && (
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-gray-500">Headline:</span>
                          <span className="ml-2 font-medium">{adType.creatives.headline}</span>
                        </div>
                      )}
                      {adType.creatives?.cta && (
                        <div>
                          <span className="text-gray-500">CTA:</span>
                          <span className="ml-2 font-medium text-yellow-600">{adType.creatives.cta}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {summary.creativeStrategy.additionalNotes && (
              <div className="mt-4">
                <label className="text-sm text-gray-500">Additional Notes</label>
                <p className="mt-1 text-gray-900">{summary.creativeStrategy.additionalNotes}</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Project
        </Button>
        {/* <Button onClick={() => navigate(`/creative-strategy?projectId=${id}`)}>
          <Lightbulb className="w-4 h-4 mr-2" />
          Edit Creative Strategy
        </Button> */}
      </div>
    </div>
  );
}