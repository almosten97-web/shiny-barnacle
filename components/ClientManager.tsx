import React, { useState, useEffect } from 'react';
import ClientModal from './ClientModal';
import { Client } from '../types';
import { PlusCircle, Edit, Users } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[]; // Now directly receives clients from parent
  onAddClient: (newClient: Omit<Client, 'id'>) => Promise<void>;
  onUpdateClient: (updatedClient: Client) => Promise<void>;
  onDeleteClient: (clientId: string) => Promise<void>;
}

const ClientManager: React.FC<ClientManagerProps> = ({
  clients, // Use the clients prop directly
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const handleOpenAddClientModal = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEditClientModal = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleSaveClient = async (clientData: Omit<Client, 'id'> | Client) => {
    if ((clientData as Client).id) {
      // It's an existing client (editing)
      await onUpdateClient(clientData as Client);
    } else {
      // It's a new client (adding)
      // onAddClient will handle adding to Firestore and ID generation
      await onAddClient(clientData as Omit<Client, 'id'>);
    }
    handleCloseModal();
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      await onDeleteClient(clientId);
      handleCloseModal();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Users className="w-8 h-8 mr-3 text-indigo-600" />
          Client Management
        </h1>
        <button
          onClick={handleOpenAddClientModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          Add New Client
        </button>
      </div>

      {/* Client List Display */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {clients.length === 0 ? (
            <li className="px-4 py-5 sm:px-6 text-gray-500">No clients added yet. Click "Add New Client" to get started.</li>
          ) : (
            clients.map((client) => (
              <li key={client.id} className="block hover:bg-gray-50">
                <div className="flex items-center px-4 py-4 sm:px-6">
                  <div className="min-w-0 flex-1 flex items-center">
                    <div className="flex-shrink-0" style={{ backgroundColor: client.color || '#DBEAFE', width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #ccc' }}></div>
                    <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                      <div>
                        <p className="text-sm font-medium text-indigo-600 truncate">{client.name}</p>
                        <p className="mt-2 flex items-center text-sm text-gray-500">
                          {client.address}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleOpenEditClientModal(client)}
                      className="ml-4 p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                    >
                      <Edit className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <ClientModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveClient}
        onDelete={handleDeleteClient}
        client={selectedClient}
      />
    </div>
  );
};

export default ClientManager;