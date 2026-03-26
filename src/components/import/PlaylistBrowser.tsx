import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, LinkIcon, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { PlaylistCard } from './PlaylistCard';
import { SERVICES } from './services';
import type { MusicService, OAuthConnectionStatus, ExternalPlaylist } from '../../types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 'all'] as const;
type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];

interface PlaylistBrowserProps {
  connections: OAuthConnectionStatus[] | undefined;
  isLoadingConnections: boolean;
  onViewPlaylist: (service: MusicService, playlist: ExternalPlaylist) => void;
  onImportPlaylist: (service: MusicService, playlist: ExternalPlaylist) => void;
  importingPlaylistId: string | null;
}

export function PlaylistBrowser({
  connections,
  isLoadingConnections,
  onViewPlaylist,
  onImportPlaylist,
  importingPlaylistId,
}: PlaylistBrowserProps) {
  const [activeService, setActiveService] = useState<MusicService>('spotify');
  const [connectingService, setConnectingService] = useState<MusicService | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<PageSizeOption>(25);
  const [showFloatingBar, setShowFloatingBar] = useState(false);
  const queryClient = useQueryClient();

  const bottomBarRef = useRef<HTMLDivElement>(null);
  const playlistsStartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [floatingBarStyle, setFloatingBarStyle] = useState<React.CSSProperties>({});

  // Get connection for active service
  const getConnectionForService = (serviceId: MusicService): OAuthConnectionStatus | null => {
    if (!connections) return null;
    return connections.find(c => c.service === serviceId) || null;
  };

  const activeConnection = getConnectionForService(activeService);
  const isConnected = activeConnection?.connected ?? false;
  const activeServiceConfig = SERVICES.find(s => s.id === activeService);

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: (service: MusicService) => api.disconnectOAuth(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
    },
  });

  // Reset page when service changes
  const handleServiceChange = (service: MusicService) => {
    setActiveService(service);
    setCurrentPage(0);
  };

  // Calculate effective limit for API call
  const effectiveLimit = itemsPerPage === 'all' ? 500 : itemsPerPage;
  const effectiveOffset = itemsPerPage === 'all' ? 0 : currentPage * itemsPerPage;

  // Fetch playlists for active connected service
  const {
    data: playlistsData,
    isLoading: isLoadingPlaylists,
    refetch: refetchPlaylists,
    isRefetching,
  } = useQuery({
    queryKey: ['playlists', activeService, itemsPerPage, currentPage],
    queryFn: () => api.getServicePlaylists(activeService, effectiveLimit, effectiveOffset),
    enabled: isConnected && SERVICES.find(s => s.id === activeService)?.enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update floating bar position to match container
  useEffect(() => {
    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setFloatingBarStyle({
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [playlistsData]);

  // Intersection observers to show/hide floating bar
  useEffect(() => {
    if (!bottomBarRef.current || !playlistsStartRef.current) return;

    let topIsVisible = true;
    let bottomIsVisible = true;

    const updateVisibility = () => {
      // Show floating bar when: top marker is NOT visible AND bottom bar is NOT visible
      setShowFloatingBar(!topIsVisible && !bottomIsVisible);
    };

    // Observer for the top of playlists section
    const topObserver = new IntersectionObserver(
      ([entry]) => {
        topIsVisible = entry.isIntersecting;
        updateVisibility();
      },
      { threshold: 0 }
    );

    // Observer for the bottom pagination bar
    const bottomObserver = new IntersectionObserver(
      ([entry]) => {
        bottomIsVisible = entry.isIntersecting;
        updateVisibility();
      },
      { threshold: 0.1 }
    );

    topObserver.observe(playlistsStartRef.current);
    bottomObserver.observe(bottomBarRef.current);

    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, [playlistsData]);

  // Pagination calculations
  const totalPlaylists = playlistsData?.total ?? 0;
  const isShowingAll = itemsPerPage === 'all';
  const numericItemsPerPage = isShowingAll ? totalPlaylists : itemsPerPage;
  const totalPages = isShowingAll ? 1 : Math.ceil(totalPlaylists / numericItemsPerPage);
  const startItem = isShowingAll ? 1 : currentPage * numericItemsPerPage + 1;
  const endItem = isShowingAll ? totalPlaylists : Math.min((currentPage + 1) * numericItemsPerPage, totalPlaylists);

  const handlePageSizeChange = (newSize: PageSizeOption) => {
    setItemsPerPage(newSize);
    setCurrentPage(0); // Reset to first page when changing page size
  };

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const pages: (number | 'ellipsis')[] = [];

    if (currentPage <= 2) {
      // Near start: show first 4 + ellipsis + last
      pages.push(0, 1, 2, 3, 'ellipsis', totalPages - 1);
    } else if (currentPage >= totalPages - 3) {
      // Near end: show first + ellipsis + last 4
      pages.push(0, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
    } else {
      // Middle: show first + ellipsis + current-1, current, current+1 + ellipsis + last
      pages.push(0, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages - 1);
    }

    return pages;
  };

  const handleConnect = async (service: MusicService) => {
    setConnectingService(service);
    try {
      const response = await api.startOAuthConnect(service);
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = response.auth_url;
    } catch (error) {
      console.error('Failed to start OAuth:', error);
      setConnectingService(null);
    }
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(activeService);
  };

  return (
    <div ref={containerRef} className="border border-dark-500 bg-dark-800/30">
      {/* Service Tabs */}
      <div className="flex border-b border-dark-500">
        {SERVICES.map((service) => {
          const conn = getConnectionForService(service.id);
          const isActive = activeService === service.id;
          const isServiceConnected = conn?.connected ?? false;

          return (
            <button
              key={service.id}
              onClick={() => handleServiceChange(service.id)}
              disabled={!service.enabled}
              className={`flex items-center gap-2 px-4 py-3 font-mono text-sm transition-colors relative ${
                isActive
                  ? 'text-terminal-green bg-dark-700/50'
                  : service.enabled
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-dark-700/30'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              <service.Icon size={18} />
              <span>{service.name}</span>
              {isServiceConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              )}
              {!service.enabled && (
                <span className="ml-1 text-xs text-yellow-600">Soon</span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeServiceTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-terminal-green"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Service Content */}
      <div className="p-4">
        {isLoadingConnections ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-terminal-green" />
          </div>
        ) : !activeServiceConfig?.enabled ? (
          <div className="py-12 text-center">
            <div className="flex justify-center mb-4 text-gray-600">
              {activeServiceConfig && <activeServiceConfig.Icon size={48} />}
            </div>
            <p className="text-gray-500">{activeServiceConfig?.name} integration coming soon</p>
          </div>
        ) : !isConnected ? (
          <div className="py-12 text-center">
            <div className="flex justify-center mb-4 text-gray-500">
              {activeServiceConfig && <activeServiceConfig.Icon size={48} />}
            </div>
            <p className="mb-4 text-gray-400">
              Connect your {activeServiceConfig?.name} account to import playlists
            </p>
            <button
              onClick={() => handleConnect(activeService)}
              disabled={connectingService === activeService}
              className="flex gap-2 items-center mx-auto btn-primary"
            >
              {connectingService === activeService ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              Connect {activeServiceConfig?.name}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected Header */}
            <div className="flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <span
                  className="text-sm px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: activeServiceConfig?.color + '20',
                    color: activeServiceConfig?.color,
                  }}
                >
                  Connected{activeConnection?.username ? ` as ${activeConnection.username}` : ''}
                </span>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="text-xs text-gray-500 transition-colors hover:text-red-500"
                >
                  Disconnect
                </button>
              </div>
              <button
                onClick={() => refetchPlaylists()}
                disabled={isRefetching}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-terminal-green transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Playlists Container */}
            <div className="relative">
              {/* Top marker for intersection observer */}
              <div ref={playlistsStartRef} className="absolute top-0 left-0 w-full h-px" />

              {/* Fixed Floating Pagination Bar (top) */}
              <AnimatePresence>
                {playlistsData && totalPlaylists > 0 && showFloatingBar && (
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    style={floatingBarStyle}
                    className="fixed top-0 z-40 p-3 pt-6 -mt-3 border-b bg-dark-800 border-x border-dark-500"
                  >
                    <div className="flex justify-between items-center">
                      {/* Items per page dropdown */}
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500">Show</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            const val = e.target.value;
                            handlePageSizeChange(val === 'all' ? 'all' : Number(val));
                          }}
                          className="px-2 py-1 text-sm text-gray-300 rounded border bg-dark-700 border-dark-500 focus:outline-none focus:border-terminal-green"
                        >
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                              {size === 'all' ? 'All' : size}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-500">{isShowingAll ? '' : 'per page'}</span>
                      </div>

                      {/* Page range info */}
                      <div className="font-mono text-sm text-gray-400">
                        {isShowingAll ? `${totalPlaylists} playlists` : `${startItem}-${endItem} of ${totalPlaylists}`}
                      </div>

                      {/* Page navigation - hidden when showing all */}
                      {!isShowingAll && (
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 0}
                            className="p-1.5 text-gray-500 hover:text-terminal-green disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {getPageNumbers().map((page, idx) =>
                            page === 'ellipsis' ? (
                              <span key={`ellipsis-top-${idx}`} className="px-2 text-gray-600">
                                ...
                              </span>
                            ) : (
                              <button
                                key={`top-${page}`}
                                onClick={() => setCurrentPage(page)}
                                className={`w-7 h-7 text-sm font-mono rounded transition-colors ${
                                  currentPage === page
                                    ? 'bg-terminal-green/20 text-terminal-green'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-dark-700'
                                }`}
                              >
                                {page + 1}
                              </button>
                            )
                          )}

                          <button
                            onClick={handleNextPage}
                            disabled={currentPage >= totalPages - 1}
                            className="p-1.5 text-gray-500 hover:text-terminal-green disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {isShowingAll && <div className="w-24" />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Playlists Grid */}
              {isLoadingPlaylists ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-terminal-green" />
                </div>
              ) : playlistsData?.playlists && playlistsData.playlists.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <AnimatePresence>
                    {playlistsData.playlists.map((playlist, index) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onView={() => onViewPlaylist(activeService, playlist)}
                        onImport={() => onImportPlaylist(activeService, playlist)}
                        isImporting={importingPlaylistId === playlist.id}
                        index={index}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <p>No playlists found</p>
                </div>
              )}

              {/* Bottom Pagination Controls */}
              {playlistsData && totalPlaylists > 0 && (
                <div
                  ref={bottomBarRef}
                  className="p-3 -mx-4 mt-4 -mb-4 border-t backdrop-blur-sm bg-dark-800/95 border-dark-500"
                >
                  <div className="flex justify-between items-center">
                    {/* Items per page dropdown */}
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-500">Show</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          const val = e.target.value;
                          handlePageSizeChange(val === 'all' ? 'all' : Number(val));
                        }}
                        className="px-2 py-1 text-sm text-gray-300 rounded border bg-dark-700 border-dark-500 focus:outline-none focus:border-terminal-green"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size === 'all' ? 'All' : size}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-gray-500">{isShowingAll ? '' : 'per page'}</span>
                    </div>

                    {/* Page range info */}
                    <div className="font-mono text-sm text-gray-400">
                      {isShowingAll ? `${totalPlaylists} playlists` : `${startItem}-${endItem} of ${totalPlaylists}`}
                    </div>

                    {/* Page navigation - hidden when showing all */}
                    {!isShowingAll && (
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={handlePrevPage}
                          disabled={currentPage === 0}
                          className="p-1.5 text-gray-500 hover:text-terminal-green disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {getPageNumbers().map((page, idx) =>
                          page === 'ellipsis' ? (
                            <span key={`ellipsis-bottom-${idx}`} className="px-2 text-gray-600">
                              ...
                            </span>
                          ) : (
                            <button
                              key={`bottom-${page}`}
                              onClick={() => setCurrentPage(page)}
                              className={`w-7 h-7 text-sm font-mono rounded transition-colors ${
                                currentPage === page
                                  ? 'bg-terminal-green/20 text-terminal-green'
                                  : 'text-gray-500 hover:text-gray-300 hover:bg-dark-700'
                              }`}
                            >
                              {page + 1}
                            </button>
                          )
                        )}

                        <button
                          onClick={handleNextPage}
                          disabled={currentPage >= totalPages - 1}
                          className="p-1.5 text-gray-500 hover:text-terminal-green disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {isShowingAll && <div />}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
