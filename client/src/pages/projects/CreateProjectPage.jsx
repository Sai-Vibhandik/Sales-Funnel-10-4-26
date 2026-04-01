import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { projectService, clientService } from '@/services/api';
import { Card, CardBody, CardHeader, Button, Input } from '@/components/ui';
import { ArrowLeft, Search, User, Building, Mail, Phone, X, Loader2, MapPin } from 'lucide-react';

const projectSchema = z.object({
  projectName: z.string().min(2, 'Project name must be at least 2 characters').optional().or(z.literal('')),
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  mobile: z.string().min(10, 'Please enter a valid mobile number'),
  email: z.string().email('Please enter a valid email'),
  industry: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  budget: z.string().optional().or(z.literal('')),
  timelineStartDate: z.string().optional().or(z.literal('')),
  timelineEndDate: z.string().optional().or(z.literal('')),
  'address.street': z.string().optional().or(z.literal('')),
  'address.city': z.string().optional().or(z.literal('')),
  'address.state': z.string().optional().or(z.literal('')),
  'address.country': z.string().optional().or(z.literal('')),
  'address.zipCode': z.string().optional().or(z.literal('')),
});

export default function CreateProjectPage() {
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectName: '',
      customerName: '',
      businessName: '',
      mobile: '',
      email: '',
      industry: '',
      description: '',
      budget: '',
      timelineStartDate: '',
      timelineEndDate: '',
      'address.street': '',
      'address.city': '',
      'address.state': '',
      'address.country': '',
      'address.zipCode': '',
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search clients
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearch.length < 2) {
        setClients([]);
        return;
      }

      try {
        setSearchLoading(true);
        const response = await clientService.searchClients(clientSearch);
        setClients(response.data || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error searching clients:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchClients, 300);
    return () => clearTimeout(debounceTimer);
  }, [clientSearch]);

  const handleSelectClient = (client) => {
    console.log('Selected client data:', client);
    console.log('Client address:', client.address);

    setSelectedClient(client);
    setClientSearch('');
    setShowDropdown(false);
    setClients([]);

    // Prefill form with client data
    setValue('customerName', client.customerName || '');
    setValue('businessName', client.businessName || '');
    setValue('email', client.email || '');
    setValue('mobile', client.mobile || '');
    if (client.industry) setValue('industry', client.industry);
    if (client.description) setValue('description', client.description);

    // Prefill address - handle both nested object and flat structure
    const addressData = client.address || {};
    console.log('Address data to set:', addressData);

    setValue('address.street', addressData.street || '');
    setValue('address.city', addressData.city || '');
    setValue('address.state', addressData.state || '');
    setValue('address.country', addressData.country || '');
    setValue('address.zipCode', addressData.zipCode || '');
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setValue('customerName', '');
    setValue('businessName', '');
    setValue('email', '');
    setValue('mobile', '');
    setValue('industry', '');
    setValue('description', '');
    setValue('address.street', '');
    setValue('address.city', '');
    setValue('address.state', '');
    setValue('address.country', '');
    setValue('address.zipCode', '');
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Build address object - only include if there are values
      const addressData = {
        street: data['address.street']?.trim() || undefined,
        city: data['address.city']?.trim() || undefined,
        state: data['address.state']?.trim() || undefined,
        country: data['address.country']?.trim() || undefined,
        zipCode: data['address.zipCode']?.trim() || undefined,
      };

      // Check if any address field has a value
      const hasAddress = Object.values(addressData).some(v => v !== undefined);

      // Transform data for API
      const projectData = {
        customerName: data.customerName,
        businessName: data.businessName,
        mobile: data.mobile,
        email: data.email,
        projectName: data.projectName || undefined,
        industry: data.industry || undefined,
        description: data.description || undefined,
        budget: data.budget ? Number(data.budget) : undefined,
        timeline: (data.timelineStartDate || data.timelineEndDate) ? {
          startDate: data.timelineStartDate ? new Date(data.timelineStartDate) : undefined,
          endDate: data.timelineEndDate ? new Date(data.timelineEndDate) : undefined,
        } : undefined,
        // Only include address if there are values
        ...(hasAddress ? { address: addressData } : {}),
      };

      // Add client reference if selected
      if (selectedClient) {
        projectData.client = selectedClient._id;
        // If client is selected and no address was entered, use client's address
        if (!hasAddress && selectedClient.address) {
          const clientAddress = selectedClient.address;
          if (clientAddress.street || clientAddress.city || clientAddress.state || clientAddress.country || clientAddress.zipCode) {
            projectData.address = {
              street: clientAddress.street || undefined,
              city: clientAddress.city || undefined,
              state: clientAddress.state || undefined,
              country: clientAddress.country || undefined,
              zipCode: clientAddress.zipCode || undefined,
            };
          }
        }
      }

      const response = await projectService.createProject(projectData);
      toast.success('Project created successfully!');
      // Redirect to team assignment page
      navigate(`/projects/${response.data._id}/assign-team`);
    } catch (error) {
      toast.error(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-gray-600 mt-1">
            Start a new client project and begin the onboarding process.
          </p>
        </div>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Select Client</h2>
          <p className="text-sm text-gray-500 mt-1">
            Search and select an existing client to auto-fill their details.
          </p>
        </CardHeader>
        <CardBody className="pt-2">
          {selectedClient ? (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Building className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedClient.customerName}</h3>
                    <p className="text-sm text-gray-600">{selectedClient.businessName}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {selectedClient.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedClient.mobile}
                      </span>
                    </div>
                    {(() => {
                      const addr = selectedClient.address || {};
                      const addressParts = [addr.street, addr.city, addr.state, addr.country, addr.zipCode].filter(Boolean);
                      if (addressParts.length > 0) {
                        return (
                          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{addressParts.join(', ')}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <button
                  onClick={handleClearClient}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients by name, business, or email..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                onFocus={() => clients.length > 0 && setShowDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}

              {/* Search Results Dropdown */}
              {showDropdown && clients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {clients.map((client) => {
                    const clientAddress = client.address || {};
                    const hasAddress = clientAddress.city || clientAddress.state || clientAddress.country;
                    return (
                      <button
                        key={client._id}
                        type="button"
                        onClick={() => handleSelectClient(client)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{client.customerName}</p>
                            <p className="text-sm text-gray-500 truncate">{client.businessName} • {client.email}</p>
                            {hasAddress && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {[clientAddress.city, clientAddress.state, clientAddress.country].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {showDropdown && clientSearch.length >= 2 && !searchLoading && clients.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                  No clients found. Enter details manually below.
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the project and customer details below.
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Project Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Project Name"
                  placeholder="TechStart Landing Page"
                  error={errors.projectName?.message}
                  {...register('projectName')}
                />
                <Input
                  label="Industry"
                  placeholder="Technology, E-commerce, etc."
                  error={errors.industry?.message}
                  {...register('industry')}
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Brief description of the project..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[100px]"
                  {...register('description')}
                />
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Customer Name *"
                  placeholder="John Doe"
                  error={errors.customerName?.message}
                  {...register('customerName')}
                />
                <Input
                  label="Business Name *"
                  placeholder="Acme Corporation"
                  error={errors.businessName?.message}
                  {...register('businessName')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Mobile Number *"
                  placeholder="+1 234 567 890"
                  error={errors.mobile?.message}
                  {...register('mobile')}
                />
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="john@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              {/* Address Fields */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Address
                </h4>
                <Input
                  label="Street Address"
                  placeholder="123 Main Street"
                  error={errors['address.street']?.message}
                  {...register('address.street')}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="City"
                    placeholder="New York"
                    error={errors['address.city']?.message}
                    {...register('address.city')}
                  />
                  <Input
                    label="State/Province"
                    placeholder="NY"
                    error={errors['address.state']?.message}
                    {...register('address.state')}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Country"
                    placeholder="United States"
                    error={errors['address.country']?.message}
                    {...register('address.country')}
                  />
                  <Input
                    label="Zip/Postal Code"
                    placeholder="10001"
                    error={errors['address.zipCode']?.message}
                    {...register('address.zipCode')}
                  />
                </div>
              </div>
            </div>

            {/* Budget & Timeline */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Budget & Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Budget ($)"
                  type="number"
                  min={0}
                  placeholder="5000"
                  error={errors.budget?.message}
                  {...register('budget')}
                />
                <Input
                  label="Start Date"
                  type="date"
                  error={errors.timelineStartDate?.message}
                  {...register('timelineStartDate')}
                />
                <Input
                  label="End Date"
                  type="date"
                  error={errors.timelineEndDate?.message}
                  {...register('timelineEndDate')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/projects')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Project
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}