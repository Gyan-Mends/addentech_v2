import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Edit,
  Save,
  X,
  Upload,
  Briefcase,
  Clock
} from "lucide-react";
import { Button, Card, CardBody, CardHeader, Avatar, Chip } from "@heroui/react";
import CustomInput from "~/components/CustomInput";
import { successToast, errorToast } from "~/components/toast";

interface UserProfile {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  departmentId: string;
  position: string;
  workMode: 'in-house' | 'remote';
  image: string;
  bio?: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfileFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  position: string;
  bio: string;
  image: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    position: '',
    bio: '',
    image: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users?action=getCurrentUser');
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setFormData({
          firstName: data.user.firstName || '',
          middleName: data.user.middleName || '',
          lastName: data.user.lastName || '',
          phone: data.user.phone || '',
          position: data.user.position || '',
          bio: data.user.bio || '',
          image: data.user.image || ''
        });
      } else {
        if (data.status === 401) {
          navigate('/login');
          return;
        }
        errorToast(data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      errorToast('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    if (!formData.position.trim()) {
      errors.position = 'Position is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        errorToast('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const formDataToSend = new FormData();
      
      formDataToSend.append('userId', user!._id);
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('middleName', formData.middleName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('position', formData.position);
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('image', formData.image);

      const response = await fetch('/api/users', {
        method: 'PUT',
        body: formDataToSend
      });

      const data = await response.json();

      if (data.success) {
        successToast('Profile updated successfully');
        setEditing(false);
        await loadUserProfile();
      } else {
        errorToast(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      errorToast('Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        position: user.position || '',
        bio: user.bio || '',
        image: user.image || ''
      });
    }
    setEditing(false);
    setFormErrors({});
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'manager': return 'warning';
      case 'department_head': return 'primary';
      case 'staff': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Profile Not Found</h2>
        <Button color="primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your personal information</p>
        </div>
        <div className="flex items-center space-x-2">
          {editing ? (
            <>
              <Button
                variant="light"
                onClick={handleCancel}
                startContent={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onClick={handleSubmit}
                isLoading={submitting}
                startContent={!submitting ? <Save className="w-4 h-4" /> : undefined}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button
              color="primary"
              onClick={() => setEditing(true)}
              startContent={<Edit className="w-4 h-4" />}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardBody className="text-center p-6">
              <div className="relative inline-block mb-4">
                <Avatar
                  src={editing ? formData.image : user.image}
                  name={`${user.firstName} ${user.lastName}`}
                  className="w-24 h-24 text-large"
                />
                {editing && (
                  <div className="absolute -bottom-2 -right-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="profile-image-upload"
                    />
                    <label htmlFor="profile-image-upload" className="cursor-pointer">
                      <Button
                        size="sm"
                        isIconOnly
                        color="primary"
                        className="rounded-full"
                        as="span"
                      >
                        <Upload className="w-3 h-3" />
                      </Button>
                    </label>
                  </div>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {user.firstName} {user.middleName} {user.lastName}
              </h2>
              
              <div className="space-y-2 mb-4">
                <Chip 
                  color={getRoleColor(user.role)} 
                  variant="flat" 
                  size="sm"
                  className="capitalize"
                >
                  {user.role.replace('_', ' ')}
                </Chip>
              </div>

              <div className="text-left space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Building2 className="w-4 h-4" />
                  <span>{user.department}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Briefcase className="w-4 h-4" />
                  <span>{user.position}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span className="capitalize">{user.workMode}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Account Information Card */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mt-4">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Account Information
              </h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Member Since</label>
                <p className="text-sm text-gray-900 dark:text-white">{formatDate(user.createdAt)}</p>
              </div>
              {user.lastLogin && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Login</label>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(user.lastLogin)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Updated</label>
                <p className="text-sm text-gray-900 dark:text-white">{formatDate(user.updatedAt)}</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <User className="w-5 h-5 mr-2" />
                Personal Information
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput
                  label="First Name"
                  isRequired
                  value={editing ? formData.firstName : user.firstName}
                  onChange={editing ? (value) => handleInputChange('firstName', value) : undefined}
                  readOnly={!editing}
                  error={formErrors.firstName}
                />
                <CustomInput
                  label="Middle Name"
                  value={editing ? formData.middleName : user.middleName || ''}
                  onChange={editing ? (value) => handleInputChange('middleName', value) : undefined}
                  readOnly={!editing}
                />
              </div>
              
              <CustomInput
                label="Last Name"
                isRequired
                value={editing ? formData.lastName : user.lastName}
                onChange={editing ? (value) => handleInputChange('lastName', value) : undefined}
                readOnly={!editing}
                error={formErrors.lastName}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput
                  label="Phone Number"
                  isRequired
                  value={editing ? formData.phone : user.phone}
                  onChange={editing ? (value) => handleInputChange('phone', value) : undefined}
                  readOnly={!editing}
                  error={formErrors.phone}
                />
                <CustomInput
                  label="Position"
                  isRequired
                  value={editing ? formData.position : user.position}
                  onChange={editing ? (value) => handleInputChange('position', value) : undefined}
                  readOnly={!editing}
                  error={formErrors.position}
                />
              </div>

              <CustomInput
                label="Bio"
                type="textarea"
                value={editing ? formData.bio : user.bio || ''}
                onChange={editing ? (value) => handleInputChange('bio', value) : undefined}
                readOnly={!editing}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
} 