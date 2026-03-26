import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Settings, Loader2, Camera, X, Check, Pencil, Upload, HardDrive, RefreshCw, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store';
import { api } from '../lib/api';
import { ServiceCard, SERVICES } from '../components/import/ServiceCard';
import { AvatarCropModal } from '../components/AvatarCropModal';
import type { MusicService, OAuthConnectionStatus } from '../types';

export function Profile() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [connectingService, setConnectingService] = useState<MusicService | null>(null);

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all OAuth connection statuses
  const { data: connections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['oauth-connections'],
    queryFn: () => api.getOAuthConnections(),
  });

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: (data: { display_name?: string | null; bio?: string | null }) =>
      api.updateProfile(data),
    onSuccess: (updatedUser) => {
      updateUser({
        display_name: updatedUser.display_name,
        bio: updatedUser.bio,
      });
      setIsEditing(false);
    },
  });

  // Avatar delete mutation
  const deleteAvatarMutation = useMutation({
    mutationFn: () => api.deleteAvatar(),
    onSuccess: (updatedUser) => {
      updateUser({ has_avatar: updatedUser.has_avatar });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: (service: MusicService) => api.disconnectOAuth(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
    },
  });

  const handleConnect = async (service: MusicService) => {
    setConnectingService(service);
    try {
      const response = await api.startOAuthConnect(service);
      window.location.href = response.auth_url;
    } catch (error) {
      console.error('Failed to start OAuth:', error);
      setConnectingService(null);
    }
  };

  const handleDisconnect = (service: MusicService) => {
    disconnectMutation.mutate(service);
  };

  const handleBrowsePlaylists = (service: MusicService) => {
    // TODO: Navigate to Import page with playlist browser open
    console.log('Browse playlists for', service);
  };

  const getConnectionForService = (serviceId: MusicService): OAuthConnectionStatus | null => {
    if (!connections) return null;
    return connections.find(c => c.service === serviceId) || null;
  };

  const startEditing = () => {
    setEditDisplayName(user?.display_name || '');
    setEditBio(user?.bio || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditDisplayName('');
    setEditBio('');
  };

  const saveProfile = () => {
    profileMutation.mutate({
      display_name: editDisplayName || null,
      bio: editBio || null,
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file can be re-selected
    e.target.value = '';

    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
  };

  const handleCropComplete = async (blob: Blob) => {
    const file = new File([blob], 'avatar.webp', { type: 'image/webp' });

    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }
    setCropImageUrl(null);

    setIsUploadingAvatar(true);
    try {
      const updatedUser = await api.uploadAvatar(file);
      updateUser({ has_avatar: updatedUser.has_avatar });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCropCancel = () => {
    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }
    setCropImageUrl(null);
  };

  const handleDeleteAvatar = () => {
    deleteAvatarMutation.mutate();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-bold font-display text-terminal-green">
          Profile
        </h1>
        <p className="text-sm text-gray-500">
          Connect external services and manage your account
        </p>
      </motion.div>

      {/* User Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-terminal p-6"
      >
        <div className="flex gap-6 items-start">
          {/* Avatar */}
          <div className="relative flex-shrink-0 group">
            <div
              onClick={handleAvatarClick}
              className="flex overflow-hidden relative justify-center items-center w-20 h-20 rounded-full border-2 cursor-pointer border-terminal-green terminal-box-glow"
            >
              {user?.has_avatar ? (
                <img
                  src={api.getAvatarUrl()}
                  alt="Avatar"
                  className="object-cover w-full h-full"
                />
              ) : (
                <User className="w-10 h-10 text-terminal-green" />
              )}

              {/* Upload overlay */}
              {isUploadingAvatar ? (
                <div className="flex absolute inset-0 justify-center items-center bg-black/70">
                  <Loader2 className="w-6 h-6 animate-spin text-terminal-green" />
                </div>
              ) : (
                <div className="flex absolute inset-0 justify-center items-center transition-opacity opacity-0 bg-black/60 group-hover:opacity-100">
                  <Camera className="w-6 h-6 text-terminal-green" />
                </div>
              )}
            </div>

            {/* Remove avatar button */}
            {user?.has_avatar && !isUploadingAvatar && (
              <button
                onClick={handleDeleteAvatar}
                className="flex absolute -top-1 -right-1 justify-center items-center w-6 h-6 text-red-400 bg-gray-900 rounded-full border border-gray-700 transition-colors hover:bg-red-900/50 hover:border-red-500"
                title="Remove avatar"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* User details */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              /* Edit mode */
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-xs text-gray-500 font-mono">
                    Display Name
                    <span className="ml-2 text-gray-600">
                      {editDisplayName.length}/50
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value.slice(0, 50))}
                    placeholder={user?.username || 'Display name'}
                    className="px-3 py-1.5 w-full text-sm bg-black/50 rounded border font-mono text-terminal-green border-terminal-green/30 focus:border-terminal-green focus:outline-none placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-gray-500 font-mono">
                    Bio
                    <span className="ml-2 text-gray-600">
                      {editBio.length}/500
                    </span>
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value.slice(0, 500))}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="px-3 py-1.5 w-full text-sm bg-black/50 rounded border resize-none font-mono text-terminal-green border-terminal-green/30 focus:border-terminal-green focus:outline-none placeholder:text-gray-600"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveProfile}
                    disabled={profileMutation.isPending}
                    className="flex gap-1 items-center px-3 py-1 text-xs font-mono text-black rounded border bg-terminal-green border-terminal-green disabled:opacity-50"
                  >
                    {profileMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={profileMutation.isPending}
                    className="flex gap-1 items-center px-3 py-1 text-xs rounded border font-mono text-terminal-green border-terminal-green/30 hover:border-terminal-green disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
                {profileMutation.isError && (
                  <p className="text-xs text-red-400 font-mono">
                    {profileMutation.error?.message || 'Failed to update profile'}
                  </p>
                )}
              </div>
            ) : (
              /* View mode */
              <div>
                <div className="flex gap-2 items-center">
                  <div className="text-xl font-bold font-display text-terminal-green">
                    {user?.display_name || user?.username || 'Guest User'}
                  </div>
                  <button
                    onClick={startEditing}
                    className="p-1 rounded transition-colors text-gray-500 hover:text-terminal-green"
                    title="Edit profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                {user?.display_name && (
                  <div className="text-xs text-gray-500 font-mono">
                    @{user.username}
                  </div>
                )}
                {user?.bio ? (
                  <p className="mt-2 text-sm text-gray-400 font-mono whitespace-pre-wrap">
                    {user.bio}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-600 font-mono">
                    Connected to Soulseek network
                  </p>
                )}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="inline-flex gap-1.5 items-center mt-3 px-3 py-1.5 text-xs font-mono rounded border text-terminal-green border-terminal-green/30 hover:border-terminal-green hover:bg-terminal-green/10 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Panel
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* External Services */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold font-display text-terminal-green">
          External Services
        </h2>
        <p className="text-sm text-gray-500">
          Connect external services to import playlists and lists automatically
        </p>

        {isLoadingConnections ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-terminal-green" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {SERVICES.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <ServiceCard
                  service={service}
                  connection={getConnectionForService(service.id)}
                  onConnect={() => handleConnect(service.id)}
                  onDisconnect={() => handleDisconnect(service.id)}
                  onBrowse={() => handleBrowsePlaylists(service.id)}
                  isConnecting={connectingService === service.id}
                  isDisconnecting={disconnectMutation.isPending && disconnectMutation.variables === service.id}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Sharing & Upload Settings */}
      <SharingSettings />

      {/* Avatar Crop Modal */}
      {cropImageUrl && (
        <AvatarCropModal
          imageUrl={cropImageUrl}
          onCrop={handleCropComplete}
          onClose={handleCropCancel}
        />
      )}
    </div>
  );
}

function SharingSettings() {
  const queryClient = useQueryClient();

  const { data: uploadStatus } = useQuery({
    queryKey: ['upload-status'],
    queryFn: () => api.getUploadStatus(),
    refetchInterval: 5000,
  });

  const { data: sharingStats } = useQuery({
    queryKey: ['sharing-stats'],
    queryFn: () => api.getSharingStats(),
  });

  const configMutation = useMutation({
    mutationFn: (config: { max_upload_slots?: number; max_upload_speed_kbps?: number; sharing_enabled?: boolean }) =>
      api.updateUploadConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-status'] });
    },
  });

  const rescanMutation = useMutation({
    mutationFn: () => api.rescanShares(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharing-stats'] });
      queryClient.invalidateQueries({ queryKey: ['upload-status'] });
    },
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="space-y-4"
    >
      <h2 className="text-2xl font-bold font-display text-terminal-green">
        Sharing & Uploads
      </h2>
      <p className="text-sm text-gray-500">
        Share your downloaded files with the Soulseek network
      </p>

      <div className="card-terminal p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-mono">Shared Files</div>
            <div className="text-lg font-bold text-terminal-green font-mono">
              {sharingStats?.file_count ?? '—'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-mono">Folders</div>
            <div className="text-lg font-bold text-terminal-green font-mono">
              {sharingStats?.folder_count ?? '—'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-mono">Active / Queued</div>
            <div className="text-lg font-bold text-terminal-green font-mono">
              {uploadStatus ? `${uploadStatus.active_uploads} / ${uploadStatus.queued_uploads}` : '—'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-mono">Total Uploaded</div>
            <div className="text-lg font-bold text-terminal-green font-mono">
              {uploadStatus ? formatBytes(uploadStatus.total_bytes_uploaded) : '—'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4 pt-4 border-t border-terminal-green/10">
          {/* Sharing Toggle */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <HardDrive className="w-5 h-5 text-terminal-green" />
              <div>
                <div className="text-sm font-mono text-terminal-green">Sharing Enabled</div>
                <div className="text-xs text-gray-500">Share downloaded files with the network</div>
              </div>
            </div>
            <button
              onClick={() => configMutation.mutate({ sharing_enabled: !uploadStatus?.sharing_enabled })}
              disabled={configMutation.isPending}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                uploadStatus?.sharing_enabled ? 'bg-terminal-green' : 'bg-gray-700'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-black transition-transform ${
                uploadStatus?.sharing_enabled ? 'left-6' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Upload Slots */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <Upload className="w-5 h-5 text-terminal-green" />
              <div>
                <div className="text-sm font-mono text-terminal-green">Upload Slots</div>
                <div className="text-xs text-gray-500">Max concurrent uploads</div>
              </div>
            </div>
            <select
              value={uploadStatus?.max_upload_slots ?? 3}
              onChange={(e) => configMutation.mutate({ max_upload_slots: parseInt(e.target.value) })}
              disabled={configMutation.isPending}
              className="px-2 py-1 text-sm bg-black/50 rounded border font-mono text-terminal-green border-terminal-green/30 focus:border-terminal-green focus:outline-none"
            >
              {[1, 2, 3, 5, 8, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Speed Limit */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <Settings className="w-5 h-5 text-terminal-green" />
              <div>
                <div className="text-sm font-mono text-terminal-green">Speed Limit</div>
                <div className="text-xs text-gray-500">Max upload speed (0 = unlimited)</div>
              </div>
            </div>
            <select
              value={uploadStatus?.max_upload_speed_kbps ?? 0}
              onChange={(e) => configMutation.mutate({ max_upload_speed_kbps: parseInt(e.target.value) })}
              disabled={configMutation.isPending}
              className="px-2 py-1 text-sm bg-black/50 rounded border font-mono text-terminal-green border-terminal-green/30 focus:border-terminal-green focus:outline-none"
            >
              <option value={0}>Unlimited</option>
              <option value={128}>128 KB/s</option>
              <option value={256}>256 KB/s</option>
              <option value={512}>512 KB/s</option>
              <option value={1024}>1 MB/s</option>
              <option value={2048}>2 MB/s</option>
              <option value={5120}>5 MB/s</option>
            </select>
          </div>

          {/* Rescan Button */}
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-3 items-center">
              <RefreshCw className={`w-5 h-5 text-terminal-green ${rescanMutation.isPending ? 'animate-spin' : ''}`} />
              <div>
                <div className="text-sm font-mono text-terminal-green">Rescan Files</div>
                <div className="text-xs text-gray-500">Rebuild the shared file index</div>
              </div>
            </div>
            <button
              onClick={() => rescanMutation.mutate()}
              disabled={rescanMutation.isPending}
              className="px-3 py-1 text-xs font-mono rounded border text-terminal-green border-terminal-green/30 hover:border-terminal-green hover:bg-terminal-green/10 disabled:opacity-50 transition-colors"
            >
              {rescanMutation.isPending ? 'Scanning...' : 'Rescan'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
