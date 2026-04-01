import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import organizationService from '@/services/organizationService';
import { Button, Input, Card, CardBody } from '@/components/ui';
import { Check, Sparkles, Users, Zap, Shield, ArrowRight } from 'lucide-react';

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Organization name too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      'Up to 3 team members',
      'Up to 3 projects',
      '50 AI calls per month',
      '1GB storage',
      'Basic support',
    ],
    limits: {
      maxUsers: 3,
      maxProjects: 3,
      aiCallsPerMonth: 50,
      storageLimitMB: 1024,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    description: 'Great for small teams',
    features: [
      'Up to 5 team members',
      'Up to 10 projects',
      '200 AI calls per month',
      '5GB storage',
      'Priority support',
    ],
    limits: {
      maxUsers: 5,
      maxProjects: 10,
      aiCallsPerMonth: 200,
      storageLimitMB: 5120,
    },
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    description: 'For growing agencies',
    features: [
      'Up to 15 team members',
      'Unlimited projects',
      '1000 AI calls per month',
      '25GB storage',
      'Advanced analytics',
      'Custom branding',
      'Priority support',
    ],
    limits: {
      maxUsers: 15,
      maxProjects: -1,
      aiCallsPerMonth: 1000,
      storageLimitMB: 25600,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    description: 'For large organizations',
    features: [
      'Unlimited team members',
      'Unlimited projects',
      'Unlimited AI calls',
      '100GB storage',
      'SSO integration',
      'Custom domain',
      'Dedicated support',
      'SLA guarantee',
    ],
    limits: {
      maxUsers: -1,
      maxProjects: -1,
      aiCallsPerMonth: -1,
      storageLimitMB: 102400,
    },
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState(PLANS);
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    // Fetch plans from API if available
    const fetchPlans = async () => {
      try {
        const response = await organizationService.getPlans();
        if (response.success && response.data?.length > 0) {
          // Map API plans to our format
          const apiPlans = response.data.map(plan => ({
            id: plan.tier,
            name: plan.name,
            price: plan.monthlyPrice,
            description: plan.description || '',
            features: plan.featureList?.map(f => f.text) || [],
            limits: plan.limits,
            highlighted: plan.badge?.text === 'Most Popular',
          }));
          setPlans(apiPlans.length > 0 ? apiPlans : PLANS);
        }
      } catch (error) {
        console.log('Using default plans');
      }
    };
    fetchPlans();
  }, []);

  const handleCreateOrganization = async (data) => {
    setLoading(true);
    try {
      const response = await organizationService.createOrganization({
        name: data.name,
        description: data.description,
        plan: selectedPlan,
      });

      console.log('Organization creation response:', response);
      console.log('Response success:', response?.success);

      if (response && response.success) {
        toast.success('Organization created successfully! Redirecting...');

        // Clear any stale auth data
        localStorage.removeItem('user');

        // Use a short delay then force full page reload
        setTimeout(() => {
          console.log('Redirecting to home page...');
          window.location.href = '/';
        }, 1000);
      } else {
        console.error('Organization creation failed:', response);
        toast.error(response?.message || 'Failed to create organization');
        setLoading(false);
      }
    } catch (error) {
      console.error('Organization creation error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create organization');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GV</span>
              </div>
              <span className="font-semibold text-gray-900">Growth Valley</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-20 pb-12 px-4">
        {step === 1 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
              <p className="text-gray-600">Select the plan that best fits your needs</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative cursor-pointer rounded-xl border-2 p-5 transition-all ${
                    selectedPlan === plan.id
                      ? 'border-primary-500 bg-primary-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${plan.highlighted ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-500 text-sm">/month</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {plan.features.slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 5 && (
                      <li className="text-sm text-gray-400">
                        +{plan.features.length - 5} more features
                      </li>
                    )}
                  </ul>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === plan.id
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedPlan === plan.id && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button
                size="lg"
                onClick={() => setStep(2)}
                className="px-8"
              >
                Continue with {plans.find(p => p.id === selectedPlan)?.name} Plan
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-lg mx-auto">
            <Card>
              <CardBody className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Name Your Organization</h2>
                  <p className="text-gray-600">This will be your agency's workspace name</p>
                </div>

                <form onSubmit={handleSubmit(handleCreateOrganization)} className="space-y-4">
                  <Input
                    label="Organization Name"
                    placeholder="e.g., Acme Marketing Agency"
                    error={errors.name?.message}
                    {...register('name')}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      placeholder="Brief description of your organization"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Selected Plan</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-primary-600">
                          {plans.find(p => p.id === selectedPlan)?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {plans.find(p => p.id === selectedPlan)?.price === 0
                            ? 'Free forever'
                            : `$${plans.find(p => p.id === selectedPlan)?.price}/month`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Change plan
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={loading}
                  >
                    Create Organization
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}