import React, { useState } from 'react';
import { PhotoRecord } from '../../types';
import { downloadPhoto, dispatchPhotoEmail } from '../../services/emailService';
import { updatePhotoEmailStatus, deletePhoto, incrementDownloadCount } from '../../services/storage';
import {
  Download,
  Mail,
  Send,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Search,
  X,
  Copy,
  ExternalLink,
  Clock,
} from 'lucide-react';

interface PhotoHistoryProps {
  photos: PhotoRecord[];
  eventName: string;
  onRefresh: () => void;
}

export const PhotoHistory: React.FC<PhotoHistoryProps> = ({
  photos,
  eventName,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'downloaded' | 'accepted' | 'not_requested' | 'failed'>('all');
  const [inspectPhoto, setInspectPhoto] = useState<PhotoRecord | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const filteredPhotos = photos.filter((p) => {
    if (statusFilter === 'downloaded' && (!p.downloadCount || p.downloadCount <= 0)) return false;
    if (statusFilter === 'accepted' && p.emailStatus !== 'provider_accepted' && p.emailStatus !== 'delivered' && p.status !== 'email_sent') return false;
    if (statusFilter === 'not_requested' && p.emailStatus !== 'not_requested' && p.email) return false;
    if (statusFilter === 'failed' && p.emailStatus !== 'delivery_failed' && p.emailStatus !== 'bounced' && p.status !== 'email_failed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmail = p.email?.toLowerCase().includes(q);
      const matchFile = p.fileName?.toLowerCase().includes(q);
      const matchTmpl = p.templateName?.toLowerCase().includes(q);
      const matchToken = (p.photoToken || p.token)?.toLowerCase().includes(q);
      if (!matchEmail && !matchFile && !matchTmpl && !matchToken) return false;
    }
    return true;
  });

  const handleDownload = async (photo: PhotoRecord) => {
    downloadPhoto(photo.generatedPhotoUrl || photo.finalUrl, photo.fileName);
    await incrementDownloadCount(photo.id);
    onRefresh();
  };

  const handleResend = async (photo: PhotoRecord) => {
    if (!photo.email) {
      alert('This photo has no recipient email recorded.');
      return;
    }

    setResendingId(photo.id);
    try {
      await updatePhotoEmailStatus(photo.id, 'sending');
      const result = await dispatchPhotoEmail({
        recipientEmail: photo.email,
        eventName,
        photoRecord: photo,
      });

      if (result.success) {
        await updatePhotoEmailStatus(photo.id, 'provider_accepted', { sentAt: result.dispatchedAt });
        alert(`Email request accepted by provider for ${photo.email}`);
      } else {
        await updatePhotoEmailStatus(photo.id, 'delivery_failed');
        alert(`Delivery failure: ${result.error}`);
      }
      onRefresh();
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (confirm('Delete this photo record permanently?')) {
      await deletePhoto(photoId);
      onRefresh();
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/photo/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#17201B] font-['Manrope']">
            Generated Photos ({photos.length})
          </h2>
          <p className="text-xs text-[#66706A]">
            Audit trail of attendee souvenirs, unique tokens, and delivery states
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#66706A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email, token, file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-[#FAFAF7] border border-[#E5E9E6] rounded-xl text-xs text-[#17201B] placeholder:text-[#66706A] focus:outline-none focus:border-[#006B3C]"
          />
        </div>
      </div>

      {/* Filter Tabs with Underline */}
      <div className="flex items-center gap-6 border-b border-[#E5E9E6] overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All Photos' },
          { id: 'downloaded', label: 'Downloaded' },
          { id: 'accepted', label: 'Email Accepted' },
          { id: 'not_requested', label: 'No Email (QR)' },
          { id: 'failed', label: 'Failed' },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`min-h-[38px] text-xs font-medium relative whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#006B3C] font-semibold'
                  : 'text-[#66706A] hover:text-[#17201B]'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3C] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-[#FFFFFF] border border-[#E5E9E6]">
          <p className="text-xs text-[#66706A]">No photo records match this view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredPhotos.map((photo) => {
            const token = photo.photoToken || photo.token;
            const dateDisplay = new Date(photo.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const photoUrl = photo.generatedPhotoUrl || photo.finalUrl;

            return (
              <div
                key={photo.id}
                className="rounded-2xl border border-[#E5E9E6] bg-[#FFFFFF] p-3 flex flex-col justify-between shadow-xs transition-shadow hover:shadow-sm"
              >
                <div>
                  {/* Photo Preview Container */}
                  <div
                    onClick={() => setInspectPhoto(photo)}
                    className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border border-[#E5E9E6] bg-[#FAFAF7] flex items-center justify-center group"
                  >
                    <img
                      src={photoUrl}
                      alt={photo.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[11px] font-medium bg-white/95 text-[#17201B] px-3 py-1 rounded-lg shadow-sm flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-[#006B3C]" /> Inspect
                      </span>
                    </div>

                    {/* Status Indicator */}
                    <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md border border-[#E5E9E6] text-[10px] font-medium flex items-center gap-1 shadow-xs">
                      {photo.downloadCount && photo.downloadCount > 0 ? (
                        <span className="text-[#006B3C] font-semibold flex items-center gap-1">
                          <Download className="w-3 h-3" /> Saved ({photo.downloadCount})
                        </span>
                      ) : photo.emailStatus === 'provider_accepted' ? (
                        <span className="text-[#006B3C] font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Accepted
                        </span>
                      ) : photo.emailStatus === 'delivery_failed' ? (
                        <span className="text-[#B42318] font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Failed
                        </span>
                      ) : (
                        <span className="text-[#17201B]">
                          QR Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-[#17201B] truncate">
                      {photo.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#006B3C] shrink-0" />
                          <span className="truncate">{photo.email}</span>
                        </span>
                      ) : (
                        <span className="text-[#66706A] italic">QR Handoff / Anonymous</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#66706A]">
                      <span>{photo.templateName || 'Souvenir'}</span>
                      <span>·</span>
                      <span className="font-mono">{photo.aspectRatio}</span>
                      <span>·</span>
                      <span>{dateDisplay}</span>
                    </div>
                  </div>

                  {/* Token & Dedicated Visitor Page Link */}
                  <div className="mt-2 pt-2 border-t border-[#E5E9E6] flex items-center justify-between text-[11px] text-[#66706A]">
                    <a
                      href={`/photo/${token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-medium text-[#006B3C] hover:underline flex items-center gap-1"
                      title="Open visitor souvenir page"
                    >
                      <span>#{token}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => handleCopyLink(token)}
                      className="inline-flex items-center gap-1 hover:text-[#006B3C] text-[#66706A] font-medium cursor-pointer"
                      title="Copy page link"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedToken === token ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-3 pt-2 border-t border-[#E5E9E6] flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownload(photo)}
                      className="h-8 px-2.5 rounded-lg bg-[#FAFAF7] hover:bg-[#EAF4EE] text-[#17201B] text-xs font-medium flex items-center gap-1 border border-[#E5E9E6] active:scale-95 transition-all cursor-pointer"
                      title="Direct download file"
                    >
                      <Download className="w-3.5 h-3.5 text-[#006B3C]" />
                      <span>Download</span>
                    </button>

                    {photo.email && (
                      <button
                        onClick={() => handleResend(photo)}
                        disabled={resendingId === photo.id}
                        className="h-8 px-2.5 rounded-lg bg-[#FAFAF7] hover:bg-[#EAF4EE] text-[#17201B] text-xs font-medium flex items-center gap-1 border border-[#E5E9E6] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                        title="Resend to email"
                      >
                        <Send className="w-3.5 h-3.5 text-[#006B3C]" />
                        <span>{resendingId === photo.id ? 'Sending...' : 'Resend'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="p-1.5 text-[#66706A] hover:text-[#B42318] rounded-lg active:scale-90 transition-transform cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Modal */}
      {inspectPhoto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E9E6] rounded-2xl p-5 max-w-lg w-full shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#17201B] font-['Manrope']">
                  Souvenir #{inspectPhoto.photoToken || inspectPhoto.token}
                </h3>
                <p className="text-xs text-[#66706A]">
                  Created at {new Date(inspectPhoto.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectPhoto(null)}
                className="text-[#66706A] hover:text-[#17201B] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full max-h-[50vh] bg-[#FAFAF7] rounded-xl border border-[#E5E9E6] flex items-center justify-center p-2 overflow-hidden">
              <img
                src={inspectPhoto.generatedPhotoUrl || inspectPhoto.finalUrl}
                alt="Full preview"
                className="max-h-[46vh] max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Inspect Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAFAF7] p-3 rounded-xl border border-[#E5E9E6]">
              <div>
                <span className="text-[#66706A] block">Email Status:</span>
                <span className="font-semibold text-[#17201B]">
                  {inspectPhoto.emailStatus || 'not_requested'}
                </span>
              </div>
              <div>
                <span className="text-[#66706A] block">Download Count:</span>
                <span className="font-semibold text-[#17201B]">
                  {inspectPhoto.downloadCount || 0} saves
                </span>
              </div>
              <div>
                <span className="text-[#66706A] block">Aspect Ratio:</span>
                <span className="font-semibold text-[#17201B]">
                  {inspectPhoto.aspectRatio}
                </span>
              </div>
              <div>
                <span className="text-[#66706A] block">Visitor Page:</span>
                <a
                  href={`/photo/${inspectPhoto.photoToken || inspectPhoto.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[#006B3C] hover:underline flex items-center gap-1"
                >
                  <span>Open Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleDownload(inspectPhoto)}
                className="h-10 px-4 rounded-xl bg-[#006B3C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
