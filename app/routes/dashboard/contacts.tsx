import { useState, useEffect } from "react";
import { Trash2, Eye, Phone, Mail, Building, MessageSquare } from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import ConfirmModal from "~/components/confirmModal";
import { Button, useDisclosure } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";
import { contactAPI, type Contact } from "~/services/api";

const ContactMonitoring = () => {
  // State management
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Confirm modal state
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Load contacts on component mount
  useEffect(() => {
    loadContacts();
  }, []);

  // Load contact messages from database
  const loadContacts = async () => {
    setLoading(true);
    try {
      const response = await contactAPI.getAll();
      if (response.success && response.contacts) {
        setContacts(response.contacts);
      } else {
        errorToast('Failed to load contact messages: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading contact messages:', error);
      errorToast('Failed to load contact messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Table columns configuration
  const columns: Column<Contact>[] = [
    {
      key: 'firstName',
      title: 'Contact Person',
      sortable: true,
      searchable: true,
      render: (value: string, record: Contact) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {`${record.firstName} ${record.middleName || ''} ${record.lastName}`.trim()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{record.number}</div>
          </div>
        </div>
      )
    },
    {
      key: 'company',
      title: 'Company',
      sortable: true,
      searchable: true,
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <Building className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900 dark:text-white">
            {value || 'Not specified'}
          </span>
        </div>
      )
    },
    {
      key: 'description',
      title: 'Message Preview',
      sortable: false,
      searchable: true,
      render: (value: string) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-900 dark:text-white truncate" title={value}>
            {value || 'No message'}
          </p>
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Received',
      sortable: true,
      searchable: false,
      render: (value: string) => (
        <div className="text-sm">
          <div className="text-gray-900 dark:text-white">
            {new Date(value).toLocaleDateString()}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {new Date(value).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      searchable: false,
      width: '100px',
      align: 'center',
      render: (_, record: Contact) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isIconOnly
            onPress={() => handleView(record)}
            title="View Message"
          >
            <Eye size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="danger"
            isIconOnly
            onPress={() => handleDelete(record)}
            title="Delete Message"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  // Handle view contact message
  const handleView = (contact: Contact) => {
    setSelectedContact(contact);
    setDrawerOpen(true);
  };

  // Handle delete contact message
  const handleDelete = (contact: Contact) => {
    setContactToDelete(contact);
    onConfirmOpen();
  };

  // Confirm delete contact message
  const confirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      const response = await contactAPI.delete(contactToDelete._id);
      if (response.success) {
        setContacts(prev => prev.filter(c => c._id !== contactToDelete._id));
        successToast('Contact message deleted successfully');
        onConfirmOpenChange();
        setContactToDelete(null);
      } else {
        errorToast('Failed to delete contact message: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting contact message:', error);
      errorToast('Failed to delete contact message. Please check your connection.');
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedContact(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Mail className="w-8 h-8 mr-3 text-blue-600" />
            Contact Messages
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage contact messages from visitors
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Read-only monitoring interface
        </div>
      </div>

      {/* Statistics Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Messages</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{contacts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent Messages</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {contacts.filter(c => new Date(c.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={contacts}
        columns={columns}
        loading={loading}
        pageSize={10}
        searchPlaceholder="Search contact messages..."
        emptyText="No contact messages found"
      />

      {/* Contact Message Details Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title="Contact Message Details"
        size="md"
      >
        {selectedContact && (
          <div className="space-y-6">
            {/* Contact Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {selectedContact.firstName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {selectedContact.lastName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {selectedContact.number}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {selectedContact.company || 'Not specified'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message
                </label>
                <div className="text-sm text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded min-h-[100px]">
                  {selectedContact.description || 'No message provided'}
                </div>
              </div>
            </div>

            {/* Message Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Message Information</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Received Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedContact.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                color="danger"
                variant="flat"
                onPress={() => {
                  handleDelete(selectedContact);
                  setDrawerOpen(false);
                }}
                className="flex-1"
              >
                Delete Message
              </Button>
              <Button
                variant="flat"
                onPress={handleCloseDrawer}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        header="Delete Contact Message"
        content={
          contactToDelete 
            ? `Are you sure you want to delete the message from "${contactToDelete.firstName} ${contactToDelete.lastName}"? This action cannot be undone.`
            : "Are you sure you want to delete this contact message?"
        }
      >
        <div className="flex gap-3">
          <Button
            color="danger"
            onPress={confirmDelete}
            className="flex-1"
          >
            Delete
          </Button>
          <Button
            variant="flat"
            onPress={() => {
              onConfirmOpenChange();
              setContactToDelete(null);
            }}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default ContactMonitoring; 