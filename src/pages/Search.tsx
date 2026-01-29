import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Plus, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

export function Search() {
  const [mode, setMode] = useState<'item' | 'list'>('item');
  const [query, setQuery] = useState('');
  const [listQueries, setListQueries] = useState<string[]>(['']);
  const [listName, setListName] = useState('');

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

  const searchItemMutation = useMutation({
    mutationFn: (query: string) => api.searchItem(query),
    onSuccess: () => {
      setQuery('');
    },
  });

  const searchListMutation = useMutation({
    mutationFn: (data: { queries: string[]; name?: string }) =>
      api.searchList(data.queries, data.name),
    onSuccess: () => {
      setListQueries(['']);
      setListName('');
    },
  });

  const handleSearchItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchItemMutation.mutate(query);
    }
  };

  const handleSearchList = (e: React.FormEvent) => {
    e.preventDefault();
    const validQueries = listQueries.filter((q) => q.trim());
    if (validQueries.length > 0) {
      searchListMutation.mutate({
        queries: validQueries,
        name: listName || undefined,
      });
    }
  };

  const addListQuery = () => {
    setListQueries([...listQueries, '']);
  };

  const updateListQuery = (index: number, value: string) => {
    const newQueries = [...listQueries];
    newQueries[index] = value;
    setListQueries(newQueries);
  };

  const removeListQuery = (index: number) => {
    setListQueries(listQueries.filter((_, i) => i !== index));
  };

  // Filter suggestions based on query
  const suggestions =
    items?.filter(
      (item) =>
        item.download_status === 'completed' &&
        item.filename.toLowerCase().includes(query.toLowerCase())
    ) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-display font-bold text-terminal-green">
          Search Network
        </h1>
        <p className="text-gray-500 text-sm">
          Find and download files from the Soulseek network
        </p>
      </motion.div>

      {/* Mode Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        {[
          { id: 'item', label: 'Single Item' },
          { id: 'list', label: 'Batch List' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id as 'item' | 'list')}
            className={`px-6 py-3 font-mono transition-all duration-200 relative ${
              mode === tab.id
                ? 'text-terminal-green'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {mode === tab.id && (
              <motion.div
                layoutId="searchTab"
                className="absolute inset-0 border-2 border-terminal-green terminal-box-glow"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Search Forms */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, x: mode === 'item' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="card-terminal"
      >
        {mode === 'item' ? (
          <form onSubmit={handleSearchItem} className="space-y-6">
            <div>
              <label className="block text-sm font-mono text-terminal-green mb-2">
                Query
              </label>
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Artist - Track Name"
                  className="input-terminal w-full pl-12"
                  disabled={searchItemMutation.isPending}
                />
              </div>
            </div>

            {/* Suggestions */}
            {query && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 text-sm font-mono text-gray-500">
                  <Sparkles className="w-4 h-4" />
                  <span>Already Downloaded</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setQuery(item.filename)}
                      className="px-3 py-1 bg-dark-700 border border-terminal-green/30
                               text-terminal-green text-sm font-mono
                               hover:border-terminal-green hover:bg-dark-600
                               transition-all duration-200"
                    >
                      {item.filename}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!query.trim() || searchItemMutation.isPending}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchItemMutation.isPending ? 'SEARCHING...' : 'SEARCH & DOWNLOAD'}
            </button>

            {searchItemMutation.isError && (
              <div className="p-4 border border-red-500 bg-red-500/10 text-red-500 font-mono text-sm">
                Error: {(searchItemMutation.error as Error).message}
              </div>
            )}

            {searchItemMutation.isSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 border border-terminal-green bg-terminal-green/10 text-terminal-green font-mono text-sm"
              >
                Successfully queued download!
              </motion.div>
            )}
          </form>
        ) : (
          <form onSubmit={handleSearchList} className="space-y-6">
            <div>
              <label className="block text-sm font-mono text-terminal-green mb-2">
                List Name (Optional)
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="My Playlist"
                className="input-terminal w-full"
                disabled={searchListMutation.isPending}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-mono text-terminal-green">
                Queries ({listQueries.filter((q) => q.trim()).length})
              </label>

              {listQueries.map((query, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => updateListQuery(index, e.target.value)}
                    placeholder={`Track ${index + 1}`}
                    className="input-terminal flex-1"
                    disabled={searchListMutation.isPending}
                  />
                  {listQueries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeListQuery(index)}
                      className="btn-secondary px-3"
                      disabled={searchListMutation.isPending}
                    >
                      ✕
                    </button>
                  )}
                </motion.div>
              ))}

              <button
                type="button"
                onClick={addListQuery}
                className="btn-secondary w-full flex items-center justify-center gap-2"
                disabled={searchListMutation.isPending}
              >
                <Plus className="w-4 h-4" />
                Add Query
              </button>
            </div>

            <button
              type="submit"
              disabled={
                listQueries.filter((q) => q.trim()).length === 0 ||
                searchListMutation.isPending
              }
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchListMutation.isPending
                ? 'SEARCHING...'
                : `SEARCH & DOWNLOAD ${listQueries.filter((q) => q.trim()).length} ITEMS`}
            </button>

            {searchListMutation.isError && (
              <div className="p-4 border border-red-500 bg-red-500/10 text-red-500 font-mono text-sm">
                Error: {(searchListMutation.error as Error).message}
              </div>
            )}

            {searchListMutation.isSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 border border-terminal-green bg-terminal-green/10 text-terminal-green font-mono text-sm"
              >
                Successfully queued list download!
              </motion.div>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
}
