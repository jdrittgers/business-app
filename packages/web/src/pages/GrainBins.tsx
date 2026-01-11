import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { grainBinsApi } from '../api/grain-bins.api';
import { scaleTicketsApi } from '../api/scale-tickets.api';
import {
  GrainBin,
  ScaleTicket,
  ScaleTicketStatus
} from '@business-app/shared';
import { GrainBinVisual } from '../components/grain/GrainBinVisual';
import BinModal from '../components/grain/BinModal';

// AssignBinModal component
interface AssignBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: ScaleTicket | null;
  bins: GrainBin[];
  onAssign: (binId: string, bushelsOverride?: number) => Promise<void>;
}

function AssignBinModal({ isOpen, onClose, ticket, bins, onAssign }: AssignBinModalProps) {
  const [selectedBinId, setSelectedBinId] = useState('');
  const [bushelsOverride, setBushelsOverride] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter bins by matching commodity type
  const filteredBins = bins.filter(bin =>
    !ticket?.commodityType || bin.commodityType === ticket.commodityType
  );

  useEffect(() => {
    if (filteredBins.length > 0) {
      setSelectedBinId(filteredBins[0].id);
    }
    setBushelsOverride(ticket?.netBushels?.toString() || '');
  }, [ticket, filteredBins]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBinId) return;

    setIsSubmitting(true);
    try {
      await onAssign(
        selectedBinId,
        bushelsOverride ? parseFloat(bushelsOverride) : undefined
      );
      onClose();
    } catch (error) {
      console.error('Failed to assign bin:', error);
      alert(error instanceof Error ? error.message : 'Failed to assign bin');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Assign Scale Ticket to Bin
              </h3>

              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Ticket Details:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {ticket.loadNumber && <p>Load #: {ticket.loadNumber}</p>}
                  {ticket.netBushels && <p>Net Bushels: {ticket.netBushels.toLocaleString()}</p>}
                  {ticket.commodityType && <p>Commodity: {ticket.commodityType}</p>}
                  {ticket.buyer && <p>Buyer: {ticket.buyer}</p>}
                </div>
              </div>

              {filteredBins.length === 0 ? (
                <div className="text-center py-4 text-red-600">
                  No bins available for {ticket.commodityType || 'this commodity'}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="bin" className="block text-sm font-medium text-gray-700">
                      Select Bin *
                    </label>
                    <select
                      id="bin"
                      value={selectedBinId}
                      onChange={(e) => setSelectedBinId(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    >
                      {filteredBins.map((bin) => (
                        <option key={bin.id} value={bin.id}>
                          {bin.name} - {bin.currentBushels.toLocaleString()} / {bin.capacity.toLocaleString()} bu ({bin.cropYear})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="bushels" className="block text-sm font-medium text-gray-700">
                      Bushels to Deduct
                    </label>
                    <input
                      type="number"
                      id="bushels"
                      value={bushelsOverride}
                      onChange={(e) => setBushelsOverride(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Auto-filled from ticket"
                      step="0.01"
                      min="0"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave blank to use parsed value from ticket</p>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedBinId}
                      className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Assigning...' : 'Assign Bin'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GrainBins() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [bins, setBins] = useState<GrainBin[]>([]);
  const [scaleTickets, setScaleTickets] = useState<ScaleTicket[]>([]);
  const [grainEntities, setGrainEntities] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [selectedBin, setSelectedBin] = useState<GrainBin | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ScaleTicket | null>(null);

  const businessId = user?.businessMemberships?.[0]?.businessId;

  useEffect(() => {
    if (businessId) {
      loadData();
    }
  }, [businessId]);

  const loadData = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const [binsData, ticketsData] = await Promise.all([
        grainBinsApi.getBinsByBusiness(businessId),
        scaleTicketsApi.getScaleTickets(businessId)
      ]);

      setBins(binsData);
      setScaleTickets(ticketsData);

      // Extract unique grain entities from bins
      const entities = binsData.reduce((acc: Array<{ id: string; name: string }>, bin) => {
        if (!acc.find(e => e.id === bin.grainEntityId)) {
          acc.push({
            id: bin.grainEntityId,
            name: bin.grainEntityName || bin.grainEntityId
          });
        }
        return acc;
      }, []);
      setGrainEntities(entities);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load grain bins');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        await handleFileUpload(file);
      }
    }
  }, [businessId]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        await handleFileUpload(file);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!businessId) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only PDF, JPG, and PNG are allowed.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    try {
      setUploading(true);
      const ticket = await scaleTicketsApi.uploadScaleTicket(businessId, file);

      // Add to list and start polling for parsing completion
      await loadData();
      pollTicketStatus(ticket.id);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload scale ticket');
    } finally {
      setUploading(false);
    }
  };

  const pollTicketStatus = async (ticketId: string) => {
    if (!businessId) return;

    const maxAttempts = 30;
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;

      try {
        const ticket = await scaleTicketsApi.getScaleTicket(businessId, ticketId);

        if (ticket.status === ScaleTicketStatus.PARSED || ticket.status === ScaleTicketStatus.FAILED) {
          clearInterval(poll);
          await loadData();

          if (ticket.status === ScaleTicketStatus.PARSED) {
            // Auto-open assign modal
            openAssignModal(ticket);
          } else {
            alert(`Parsing failed: ${ticket.parseError || 'Unknown error'}`);
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          alert('Parsing is taking longer than expected. Please refresh to check status.');
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(poll);
      }
    }, 1000);
  };

  const openAssignModal = (ticket: ScaleTicket) => {
    setSelectedTicket(ticket);
    setShowAssignModal(true);
  };

  const handleAssignBin = async (binId: string, bushelsOverride?: number) => {
    if (!businessId || !selectedTicket) return;

    await scaleTicketsApi.assignBinAndProcess(businessId, selectedTicket.id, {
      binId,
      bushelsOverride
    });

    await loadData();
  };

  const handleCreateBin = async (binData: any) => {
    if (!businessId) return;
    await grainBinsApi.createBin(businessId, binData);
    await loadData();
  };

  const handleUpdateBin = async (binData: any) => {
    if (!selectedBin) return;
    await grainBinsApi.updateBin(selectedBin.id, binData);
    await loadData();
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!businessId || !confirm('Are you sure you want to delete this scale ticket?')) return;

    try {
      await scaleTicketsApi.deleteScaleTicket(businessId, ticketId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete ticket');
    }
  };

  const getStatusBadge = (status: ScaleTicketStatus) => {
    const badges = {
      [ScaleTicketStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [ScaleTicketStatus.PARSED]: 'bg-blue-100 text-blue-800',
      [ScaleTicketStatus.FAILED]: 'bg-red-100 text-red-800',
      [ScaleTicketStatus.PROCESSED]: 'bg-green-100 text-green-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading grain bins...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Grain Bin Storage</h1>
          <p className="mt-2 text-gray-600">Manage your grain bins and track inventory</p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => {
              setSelectedBin(null);
              setShowBinModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Create Bin
          </button>
        </div>

        {/* Bins Grid */}
        {bins.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No grain bins yet. Create your first bin to get started!
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Bins</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {bins.map((bin) => (
                <GrainBinVisual
                  key={bin.id}
                  bin={bin}
                  onClick={() => {
                    setSelectedBin(bin);
                    setShowBinModal(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Scale Ticket Upload */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Scale Ticket</h2>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileInput}
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <div className="text-gray-600">
                <p className="text-lg font-medium">
                  {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm mt-2">PDF, JPG, PNG up to 10MB</p>
              </div>
            </label>
          </div>
        </div>

        {/* Recent Scale Tickets */}
        {scaleTickets.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Scale Tickets</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Load #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bushels
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commodity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scaleTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.fileName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.loadNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.netBushels ? ticket.netBushels.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.commodityType || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.bin?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {ticket.status === ScaleTicketStatus.PARSED && (
                          <button
                            onClick={() => openAssignModal(ticket)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Assign Bin
                          </button>
                        )}
                        {ticket.status !== ScaleTicketStatus.PROCESSED && (
                          <button
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <BinModal
        isOpen={showBinModal}
        onClose={() => {
          setShowBinModal(false);
          setSelectedBin(null);
        }}
        onSave={selectedBin ? handleUpdateBin : handleCreateBin}
        bin={selectedBin}
        grainEntities={grainEntities}
      />

      <AssignBinModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        bins={bins}
        onAssign={handleAssignBin}
      />
    </div>
  );
}
