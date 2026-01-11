
// components/ClientModal.tsx
import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { X, Save, Trash2, User, MapPin, Palette } from 'lucide-react'; // Added Palette icon

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Omit<Client, 'id'> | Client) => void;
  onDelete?: (id: string) => void;
  client: Client | null;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSave, onDelete, client }) => {
  const [name, setName] = useState(client?.name || '');
  const [address, setAddress] = useState(client?.address || '');
  // New state for color, defaulting to a light blue if not set
  const [color, setColor] = useState(client?.color || '#DBEAFE'); 

  useEffect(() => {
    if (client) {
      setName(client.name);
      setAddress(client.address || '');
      setColor(client.color || '#DBEAFE'); // Reset color if client changes or use default
    } else {
      setName('');
      setAddress('');
      setColor('#DBEAFE'); // Default color for new client
    }
  }, [client]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pass updated client object including color
    onSave({ ...client, name, address, color }); 
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">{client ? 'Edit Client' : 'Add New Client'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
              Client Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="clientName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter client name"
                required
              />
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="clientAddress"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter client address"
              />
            </div>
          </div>
          <div className="mb-6"> {/* Added Color Picker */}
            <label htmlFor="clientColor" className="block text-sm font-medium text-gray-700 mb-1">
              Client Color
            </label>
            <div className="relative flex items-center">
              {/* Note: The Palette icon is typically for visual, the color input itself is functional */}
              <Palette className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                id="clientColor"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="ml-8 p-1 h-10 w-20 block bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                title="Choose client color"
              />
              <span className="ml-3 text-gray-700">{color.toUpperCase()}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            {onDelete && client && client.id && (
              <button
                type="button"
                onClick={() => onDelete(client.id)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </button>
            )}
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;
