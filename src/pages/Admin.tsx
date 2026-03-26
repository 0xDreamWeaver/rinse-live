import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Database, HardDrive, Users, ListMusic,
  Image, FileText, Play, Loader2, Shield, CheckCircle, XCircle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store';
import { api } from '../lib/api';
import type { AdminUser } from '../types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch system stats
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.getSystemStats(),
    refetchInterval: 30000,
  });

  // Fetch users
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getAdminUsers(),
  });

  // Fetch metadata job status (poll faster while running)
  const { data: jobStatus } = useQuery({
    queryKey: ['metadata-job-status'],
    queryFn: () => api.getMetadataJobStatus(),
    refetchInterval: (query) => query.state.data?.running ? 2000 : 10000,
  });

  // Fetch cover backfill status (poll faster while running)
  const { data: coverStatus } = useQuery({
    queryKey: ['cover-backfill-status'],
    queryFn: () => api.getCoverBackfillStatus(),
    refetchInterval: (query) => query.state.data?.running ? 2000 : 10000,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <Link
          to="/profile"
          className="inline-flex gap-1 items-center text-xs text-gray-500 transition-colors font-mono hover:text-terminal-green"
        >
          <ChevronLeft className="w-3 h-3" />
          Back to Profile
        </Link>
        <h1 className="text-4xl font-bold font-display text-terminal-green">
          Admin Panel
        </h1>
        <p className="text-sm text-gray-500">
          System statistics, maintenance actions, and user management
        </p>
      </motion.div>

      {/* System Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold font-display text-terminal-green">
          System Stats
        </h2>

        {isLoadingStats ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-terminal-green" />
          </div>
        ) : statsError ? (
          <div className="card-terminal p-4">
            <p className="text-sm text-red-400 font-mono">
              Failed to load stats: {statsError.message}
            </p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon={<Database className="w-5 h-5" />}
              label="Items"
              value={stats.total_items}
              detail={`${stats.completed_items} done / ${stats.failed_items} failed / ${stats.pending_items} pending`}
            />
            <StatCard
              icon={<HardDrive className="w-5 h-5" />}
              label="Storage"
              value={formatBytes(stats.total_storage_bytes)}
              detail={`${stats.completed_items} completed files`}
            />
            <StatCard
              icon={<ListMusic className="w-5 h-5" />}
              label="Lists"
              value={stats.total_lists}
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="Users"
              value={stats.total_users}
            />
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Metadata"
              value={stats.items_with_metadata}
              detail={`${stats.items_without_metadata} missing`}
            />
            <StatCard
              icon={<Image className="w-5 h-5" />}
              label="Covers Cached"
              value={stats.items_with_cached_covers}
              detail={`${stats.items_without_cached_covers} uncached`}
            />
          </div>
        ) : null}
      </motion.div>

      {/* Maintenance Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold font-display text-terminal-green">
          Maintenance
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MetadataJobCard jobStatus={jobStatus ?? null} />
          <CoverBackfillCard coverStatus={coverStatus ?? null} />
        </div>
      </motion.div>

      {/* User Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold font-display text-terminal-green">
          User Management
        </h2>

        {isLoadingUsers ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-terminal-green" />
          </div>
        ) : usersError ? (
          <div className="card-terminal p-4">
            <p className="text-sm text-red-400 font-mono">
              Failed to load users: {usersError.message}
            </p>
          </div>
        ) : users && users.length > 0 ? (
          <div className="card-terminal overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b border-terminal-green/20">
                    <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Username</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <UserRow
                      key={u.id}
                      adminUser={u}
                      isCurrentUser={u.id === user?.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 font-mono">No users found.</p>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="card-terminal p-4 space-y-2">
      <div className="flex gap-2 items-center text-terminal-green">
        {icon}
        <span className="text-xs text-gray-500 font-mono uppercase">{label}</span>
      </div>
      <div className="text-2xl font-bold text-terminal-green font-mono">
        {value}
      </div>
      {detail && (
        <div className="text-xs text-gray-500 font-mono">{detail}</div>
      )}
    </div>
  );
}

function ProgressBar({ processed, total }: { processed: number; total: number }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-terminal-green">{processed} / {total}</span>
        <span className="text-gray-500">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-terminal-green/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-terminal-green"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function MetadataJobCard({ jobStatus }: { jobStatus: import('../types').MetadataJobStatusResponse | null }) {
  const queryClient = useQueryClient();
  const startMutation = useMutation({
    mutationFn: () => api.startMetadataJob(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata-job-status'] });
    },
  });

  const isRunning = jobStatus?.running ?? false;
  const hasResult = startMutation.isSuccess || startMutation.isError;

  return (
    <div className="card-terminal p-5 space-y-3">
      <div className="flex gap-3 items-center">
        <FileText className={`w-5 h-5 text-terminal-green ${isRunning ? 'animate-pulse' : ''}`} />
        <div>
          <div className="text-sm font-mono text-terminal-green">Scan Library Metadata</div>
          <div className="text-xs text-gray-500">
            Fetch metadata from MusicBrainz, Discogs, etc. for items without metadata
          </div>
        </div>
      </div>

      {/* Status info */}
      {!isRunning && jobStatus && (
        <div className="text-xs text-gray-400 font-mono">
          {jobStatus.items_without_metadata} items need metadata
        </div>
      )}

      {/* Progress bar while running */}
      {isRunning && jobStatus && jobStatus.total > 0 && (
        <ProgressBar processed={jobStatus.processed} total={jobStatus.total} />
      )}

      {/* Start result feedback */}
      {startMutation.isSuccess && !isRunning && (
        <div className="flex gap-1.5 items-center text-xs font-mono text-terminal-green">
          <CheckCircle className="w-3.5 h-3.5" />
          {startMutation.data.total_items === 0
            ? 'No items need metadata lookup'
            : `Completed scan of ${startMutation.data.total_items} items`
          }
        </div>
      )}
      {startMutation.isError && (
        <div className="flex gap-1.5 items-center text-xs font-mono text-red-400">
          <XCircle className="w-3.5 h-3.5" />
          {startMutation.error instanceof Error ? startMutation.error.message : 'Failed to start job'}
        </div>
      )}

      <button
        onClick={() => startMutation.mutate()}
        disabled={startMutation.isPending || isRunning}
        className="flex gap-1.5 items-center px-3 py-1.5 text-xs font-mono rounded border text-terminal-green border-terminal-green/30 hover:border-terminal-green hover:bg-terminal-green/10 disabled:opacity-50 transition-colors"
      >
        {startMutation.isPending || isRunning ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Play className="w-3 h-3" />
        )}
        {isRunning ? `Scanning...` : startMutation.isPending ? 'Starting...' : hasResult ? 'Run Again' : 'Start'}
      </button>
    </div>
  );
}

function CoverBackfillCard({ coverStatus }: { coverStatus: import('../types').CoverBackfillStatusResponse | null }) {
  const queryClient = useQueryClient();
  const startMutation = useMutation({
    mutationFn: () => api.startCoverBackfill(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-backfill-status'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const isRunning = coverStatus?.running ?? false;
  const hasResult = startMutation.isSuccess || startMutation.isError;

  return (
    <div className="card-terminal p-5 space-y-3">
      <div className="flex gap-3 items-center">
        <Image className={`w-5 h-5 text-terminal-green ${isRunning ? 'animate-pulse' : ''}`} />
        <div>
          <div className="text-sm font-mono text-terminal-green">Backfill Cover Art</div>
          <div className="text-xs text-gray-500">
            Download and cache cover art for items with uncached album art URLs
          </div>
        </div>
      </div>

      {/* Progress bar while running */}
      {isRunning && coverStatus && coverStatus.total > 0 && (
        <div className="space-y-1">
          <ProgressBar processed={coverStatus.processed} total={coverStatus.total} />
          {coverStatus.failed > 0 && (
            <div className="text-xs text-yellow-500 font-mono">
              {coverStatus.failed} failed
            </div>
          )}
        </div>
      )}

      {/* Start result feedback */}
      {startMutation.isSuccess && !isRunning && (
        <div className="flex gap-1.5 items-center text-xs font-mono text-terminal-green">
          <CheckCircle className="w-3.5 h-3.5" />
          {startMutation.data.total_items === 0
            ? 'No items need cover art caching'
            : `Completed backfill of ${startMutation.data.total_items} items`
          }
        </div>
      )}
      {/* Show final stats after completion if polled status shows it just finished */}
      {!isRunning && !startMutation.isSuccess && coverStatus && coverStatus.total > 0 && coverStatus.processed > 0 && (
        <div className="flex gap-1.5 items-center text-xs font-mono text-terminal-green">
          <CheckCircle className="w-3.5 h-3.5" />
          Last run: {coverStatus.processed} processed{coverStatus.failed > 0 ? `, ${coverStatus.failed} failed` : ''}
        </div>
      )}
      {startMutation.isError && (
        <div className="flex gap-1.5 items-center text-xs font-mono text-red-400">
          <XCircle className="w-3.5 h-3.5" />
          {startMutation.error instanceof Error ? startMutation.error.message : 'Failed to start job'}
        </div>
      )}

      <button
        onClick={() => startMutation.mutate()}
        disabled={startMutation.isPending || isRunning}
        className="flex gap-1.5 items-center px-3 py-1.5 text-xs font-mono rounded border text-terminal-green border-terminal-green/30 hover:border-terminal-green hover:bg-terminal-green/10 disabled:opacity-50 transition-colors"
      >
        {startMutation.isPending || isRunning ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Play className="w-3 h-3" />
        )}
        {isRunning ? 'Caching...' : startMutation.isPending ? 'Starting...' : hasResult ? 'Run Again' : 'Start'}
      </button>
    </div>
  );
}

function UserRow({
  adminUser,
  isCurrentUser,
}: {
  adminUser: AdminUser;
  isCurrentUser: boolean;
}) {
  const queryClient = useQueryClient();
  const roleMutation = useMutation({
    mutationFn: (role: string) => api.updateUserRole(adminUser.id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <tr className="border-b border-terminal-green/10 hover:bg-terminal-green/5">
      <td className="px-4 py-3 text-terminal-green">
        <div className="flex gap-2 items-center">
          {adminUser.username}
          {isCurrentUser && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-terminal-green/20 text-terminal-green">
              you
            </span>
          )}
          {adminUser.role === 'admin' && (
            <Shield className="w-3 h-3 text-terminal-green opacity-60" />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-400">
        {adminUser.email || '—'}
      </td>
      <td className="px-4 py-3">
        <select
          value={adminUser.role}
          onChange={(e) => roleMutation.mutate(e.target.value)}
          disabled={isCurrentUser || roleMutation.isPending}
          className="px-2 py-1 text-xs bg-black/50 rounded border font-mono text-terminal-green border-terminal-green/30 focus:border-terminal-green focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="admin">admin</option>
          <option value="user">user</option>
          <option value="viewer">viewer</option>
        </select>
        {roleMutation.isError && (
          <span className="ml-2 text-xs text-red-400">
            {roleMutation.error?.message || 'Failed'}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500">
        {formatDate(adminUser.created_at)}
      </td>
    </tr>
  );
}
