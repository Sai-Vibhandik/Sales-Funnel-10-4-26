import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { clientService } from '@/services/api';
import { Card, CardBody, Button, Input, Modal } from '@/components/ui';
import { Users, UserPlus, Building, Search, Edit2, Trash2, X, Mail, Phone, Globe, MapPin } from 'lucide-react';

const clientSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  mobile: z.string().min(10, 'Please enter a valid mobile number'),
  alternatePhone: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  'address.street': z.string().optional().or(z.literal('')),
  'address.city': z.string().optional().or(z.literal('')),
  'address.state': z.string().optional().or(z.literal('')),
  'address.country': z.string().optional().or(z.literal('')),
  'address.zipCode': z.string().optional().or(z.literal('')),
});

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      customerName: '',
      businessName: '',
      email: '',
      mobile: '',
      alternatePhone: '',
      industry: '',
      website: '',
      description: '',
      notes: '',
      'address.street': '',
      'address.city': '',
      'address.state': '',
      'address.country': '',
      'address.zipCode': '',
    },
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientService.getClients();
      setClients(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchClients();
      return;
    }
    try {
      setLoading(true);
      const response = await clientService.searchClients(searchTerm);
      setClients(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to search clients');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingClient(null);
    reset({
      customerName: '',
      businessName: '',
      email: '',
      mobile: '',
      alternatePhone: '',
      industry: '',
      website: '',
      description: '',
      notes: '',
      'address.street': '',
      'address.city': '',
      'address.state': '',
      'address.country': '',
      'address.zipCode': '',
    });
    setShowModal(true);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    reset({
      customerName: client.customerName || '',
      businessName: client.businessName || '',
      email: client.email || '',
      mobile: client.mobile || '',
      alternatePhone: client.alternatePhone || '',
      industry: client.industry || '',
      website: client.website || '',
      description: client.description || '',
      notes: client.notes || '',
      'address.street': client.address?.street || '',
      'address.city': client.address?.city || '',
      'address.state': client.address?.state || '',
      'address.country': client.address?.country || '',
      'address.zipCode': client.address?.zipCode || '',
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      const formattedData = {
        customerName: data.customerName,
        businessName: data.businessName,
        email: data.email,
        mobile: data.mobile,
        alternatePhone: data.alternatePhone || undefined,
        industry: data.industry || undefined,
        website: data.website || undefined,
        description: data.description || undefined,
        notes: data.notes || undefined,
        address: {
          street: data['address.street'] || undefined,
          city: data['address.city'] || undefined,
          state: data['address.state'] || undefined,
          country: data['address.country'] || undefined,
          zipCode: data['address.zipCode'] || undefined,
        },
      };

      if (editingClient) {
        await clientService.updateClient(editingClient._id, formattedData);
        toast.success('Client updated successfully');
      } else {
        await clientService.createClient(formattedData);
        toast.success('Client created successfully');
      }
      setShowModal(false);
      fetchClients();
    } catch (error) {
      toast.error(error.message || 'Failed to save client');
    }
  };

  const handleDelete = async (clientId) => {
    try {
      await clientService.deleteClient(clientId);
      toast.success('Client deleted successfully');
      setDeleteConfirm(null);
      fetchClients();
    } catch (error) {
      toast.error(error.message || 'Failed to delete client');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage client accounts and information</p>
        </div>
        <Button onClick={openAddModal}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardBody className="py-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, business, email, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  fetchClients();
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardBody>
      </Card>

      {/* Clients List */}
      {loading ? (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 mt-4">Loading clients...</p>
          </CardBody>
        </Card>
      ) : clients.length === 0 ? (
        <Card>
          <CardBody className="py-12">
            <div className="text-center">
              <Building className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try a different search term' : 'Get started by adding your first client'}
              </p>
              {!searchTerm && (
                <Button onClick={openAddModal}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card key={client._id} className="hover:shadow-md transition-shadow">
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Building className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{client.customerName}</h3>
                      <p className="text-sm text-gray-500">{client.businessName}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(client)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(client)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{client.mobile}</span>
                  </div>
                  {client.industry && (
                    <div className="text-gray-500">
                      <span className="font-medium">Industry:</span> {client.industry}
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline truncate"
                      >
                        {client.website}
                      </a>
                    </div>
                  )}
                  {client.address && (client.address.street || client.address.city || client.address.state || client.address.country || client.address.zipCode) && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{[client.address.city, client.address.state, client.address.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h2>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h3>
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
                  label="Email *"
                  type="email"
                  placeholder="john@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Input
                  label="Mobile *"
                  placeholder="+1 234 567 890"
                  error={errors.mobile?.message}
                  {...register('mobile')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Alternate Phone"
                  placeholder="+1 234 567 891"
                  error={errors.alternatePhone?.message}
                  {...register('alternatePhone')}
                />
                <Input
                  label="Industry"
                  placeholder="Technology, E-commerce, etc."
                  error={errors.industry?.message}
                  {...register('industry')}
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Website"
                  placeholder="https://example.com"
                  error={errors.website?.message}
                  {...register('website')}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Address</h3>
              <Input
                label="Street"
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
                  label="State"
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
                  label="Zip Code"
                  placeholder="10001"
                  error={errors['address.zipCode']?.message}
                  {...register('address.zipCode')}
                />
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Additional Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Brief description of the client..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[80px]"
                  {...register('description')}
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  placeholder="Internal notes about this client..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[80px]"
                  {...register('notes')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingClient ? 'Update Client' : 'Create Client'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <div className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Client</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm?.customerName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deleteConfirm._id)}
              >
                Delete Client
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}