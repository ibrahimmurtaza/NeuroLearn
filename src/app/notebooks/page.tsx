'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Plus, MoreVertical, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Notebook {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  source_count?: number;
}

export default function NotebooksPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [editNotebookTitle, setEditNotebookTitle] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      fetchNotebooks();
    };
    checkAuth();
  }, []);

  const fetchNotebooks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotebooks(data || []);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
      toast.error('Failed to load notebooks');
    } finally {
      setLoading(false);
    }
  };

  const createNotebook = async () => {
    if (!newNotebookTitle.trim()) {
      toast.error('Please enter a notebook title');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('notebooks')
        .insert({
          title: newNotebookTitle.trim(),
          user_id: session.user.id
        })
        .select()
        .single();

      if (error) throw error;

      setNotebooks(prev => [data, ...prev]);
      setNewNotebookTitle('');
      setShowCreateModal(false);
      toast.success('Notebook created successfully');
    } catch (error) {
      console.error('Error creating notebook:', error);
      toast.error('Failed to create notebook');
    }
  };

  const updateNotebook = async () => {
    if (!selectedNotebook || !editNotebookTitle.trim()) {
      toast.error('Please enter a notebook title');
      return;
    }

    try {
      const { error } = await supabase
        .from('notebooks')
        .update({ title: editNotebookTitle.trim() })
        .eq('id', selectedNotebook.id);

      if (error) throw error;

      setNotebooks(prev => prev.map(nb => 
        nb.id === selectedNotebook.id 
          ? { ...nb, title: editNotebookTitle.trim() }
          : nb
      ));
      setShowEditModal(false);
      setSelectedNotebook(null);
      setEditNotebookTitle('');
      toast.success('Notebook updated successfully');
    } catch (error) {
      console.error('Error updating notebook:', error);
      toast.error('Failed to update notebook');
    }
  };

  const deleteNotebook = async () => {
    if (!selectedNotebook) return;

    try {
      const { error } = await supabase
        .from('notebooks')
        .delete()
        .eq('id', selectedNotebook.id);

      if (error) throw error;

      setNotebooks(prev => prev.filter(nb => nb.id !== selectedNotebook.id));
      setShowDeleteModal(false);
      setSelectedNotebook(null);
      toast.success('Notebook deleted successfully');
    } catch (error) {
      console.error('Error deleting notebook:', error);
      toast.error('Failed to delete notebook');
    }
  };

  const handleEditClick = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setEditNotebookTitle(notebook.title);
    setShowEditModal(true);
    setDropdownOpen(null);
  };

  const handleDeleteClick = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setShowDeleteModal(true);
    setDropdownOpen(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSourceText = (count: number = 0) => {
    return count === 1 ? '1 source' : `${count} sources`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Recent notebooks</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Notebook Card */}
          <div 
            onClick={() => setShowCreateModal(true)}
            className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 min-h-[200px]"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-gray-700 font-medium">Create new notebook</span>
          </div>

          {/* Notebook Cards */}
          {notebooks.map((notebook) => (
            <div 
              key={notebook.id}
              className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-all duration-200 min-h-[200px] relative group"
              onClick={() => router.push(`/notebooks/${notebook.id}`)}
            >
              {/* Three-dot menu */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(dropdownOpen === notebook.id ? null : notebook.id);
                  }}
                  className="p-1 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
                
                {dropdownOpen === notebook.id && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(notebook);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(notebook);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Notebook Icon */}
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">😐</span>
              </div>

              {/* Notebook Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {notebook.title}
              </h3>

              {/* Metadata */}
              <p className="text-sm text-gray-500">
                {formatDate(notebook.updated_at)} • {getSourceText(notebook.source_count || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Create Notebook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Create New Notebook</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewNotebookTitle('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newNotebookTitle}
              onChange={(e) => setNewNotebookTitle(e.target.value)}
              placeholder="Enter notebook title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && createNotebook()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewNotebookTitle('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNotebook}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Notebook Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Notebook</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedNotebook(null);
                  setEditNotebookTitle('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={editNotebookTitle}
              onChange={(e) => setEditNotebookTitle(e.target.value)}
              placeholder="Enter notebook title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && updateNotebook()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedNotebook(null);
                  setEditNotebookTitle('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateNotebook}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Delete Notebook</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedNotebook(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{selectedNotebook?.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedNotebook(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteNotebook}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}