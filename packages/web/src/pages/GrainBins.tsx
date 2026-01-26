import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { grainBinsApi } from '../api/grain-bins.api';
import { scaleTicketsApi } from '../api/scale-tickets.api';
import { grainContractsApi } from '../api/grain-contracts.api';
import {
  GrainBin,
  ScaleTicket,
  ScaleTicketStatus
} from '@business-app/shared';
import { GrainBinVisual } from '../components/grain/GrainBinVisual';
import BinModal from '../components/grain/BinModal';
import ResponsiveTable, { Column, MobileCard } from '../components/ui/ResponsiveTable';

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
        <div className="glass-backdrop transition-opacity" onClick={onClose} />

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
      const [binsData, ticketsData, entitiesData] = await Promise.all([
        grainBinsApi.getBinsByBusiness(businessId),
        scaleTicketsApi.getScaleTickets(businessId),
        grainContractsApi.getGrainEntities(businessId)
      ]);

      setBins(binsData);
      setScaleTickets(ticketsData);

      // Map entities to the format needed by BinModal
      const entities = entitiesData.map(entity => ({
        id: entity.id,
        name: entity.name
      }));
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

  const handleDeleteBin = async () => {
    if (!selectedBin) return;
    await grainBinsApi.deleteBin(selectedBin.id);
    setShowBinModal(false);
    setSelectedBin(null);
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
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mb-4"></div>
        <div className="text-gray-500">Loading grain bins...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grain Bin Storage</h1>
          <p className="mt-1 text-gray-600">Manage your grain bins and track inventory</p>
        </div>
        <button
          onClick={() => {
            setSelectedBin(null);
            setShowBinModal(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium shadow-sm transition-colors whitespace-nowrap"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Bin
        </button>
      </div>

        {/* Bins Grid */}
        {bins.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No grain bins yet</h3>
            <p className="text-gray-500 mb-6">Create your first bin to start tracking your grain inventory.</p>
            <button
              onClick={() => {
                setSelectedBin(null);
                setShowBinModal(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Bin
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Your Bins</h2>
              <span className="text-sm text-gray-500">{bins.length} {bins.length === 1 ? 'bin' : 'bins'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Scale Ticket</h2>

          <div
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-200 ${
              dragActive
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
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
              className="cursor-pointer block"
            >
              <div className="flex flex-col items-center">
                {uploading ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mb-3"></div>
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                )}
                <p className="text-base font-medium text-gray-700">
                  {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</p>
              </div>
            </label>
          </div>
        </div>

        {/* Recent Scale Tickets */}
        {scaleTickets.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Scale Tickets</h2>
            <ResponsiveTable
              columns={[
                { key: 'fileName', header: 'File' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (ticket) => (
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  )
                },
                { key: 'loadNumber', header: 'Load #', hideOnMobile: true },
                {
                  key: 'netBushels',
                  header: 'Bushels',
                  render: (ticket) => ticket.netBushels ? ticket.netBushels.toLocaleString() : '-'
                },
                { key: 'commodityType', header: 'Commodity', hideOnMobile: true },
                {
                  key: 'bin',
                  header: 'Bin',
                  hideOnMobile: true,
                  render: (ticket) => ticket.bin?.name || '-'
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (ticket) => (
                    <div className="flex space-x-2">
                      {ticket.status === ScaleTicketStatus.PARSED && (
                        <button
                          onClick={() => openAssignModal(ticket)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Assign
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
                    </div>
                  )
                }
              ] as Column<ScaleTicket>[]}
              data={scaleTickets}
              keyExtractor={(ticket) => ticket.id}
              mobileCardRenderer={(ticket) => (
                <MobileCard
                  title={ticket.fileName}
                  subtitle={ticket.loadNumber ? `Load #${ticket.loadNumber}` : undefined}
                  status={{
                    label: ticket.status,
                    color: ticket.status === ScaleTicketStatus.PROCESSED ? 'green' :
                           ticket.status === ScaleTicketStatus.PARSED ? 'blue' :
                           ticket.status === ScaleTicketStatus.FAILED ? 'red' : 'yellow'
                  }}
                  details={[
                    { label: 'Bushels', value: ticket.netBushels ? ticket.netBushels.toLocaleString() : '-' },
                    { label: 'Commodity', value: ticket.commodityType || '-' },
                    { label: 'Bin', value: ticket.bin?.name || '-' }
                  ]}
                  actions={
                    <>
                      {ticket.status === ScaleTicketStatus.PARSED && (
                        <button
                          onClick={() => openAssignModal(ticket)}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Assign Bin
                        </button>
                      )}
                      {ticket.status !== ScaleTicketStatus.PROCESSED && (
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  }
                />
              )}
            />
          </div>
        )}

      {/* Modals */}
      <BinModal
        isOpen={showBinModal}
        onClose={() => {
          setShowBinModal(false);
          setSelectedBin(null);
        }}
        onSave={selectedBin ? handleUpdateBin : handleCreateBin}
        onDelete={selectedBin ? handleDeleteBin : undefined}
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
