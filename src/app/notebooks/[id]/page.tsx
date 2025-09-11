'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search, Send, Paperclip, Upload, X, FileText, Loader2, Trash2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Notebook {
  id: string;
  title: string;
  description?: string;
  source_count?: number;
  updated_at: string;
  user_id: string;
}

interface Source {
  id: string;
  title: string;
  type: string;
  selected: boolean;
  filename?: string;
  file_size?: number;
  created_at?: string;
}

export default function NotebookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectAllSources, setSelectAllSources] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (params?.id) {
      fetchNotebook();
      fetchSources();
    }
  }, [params?.id]);

  const fetchNotebook = async () => {
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('id', params?.id)
        .single();

      if (error) {
        console.error('Error fetching notebook:', error);
        return;
      }

      setNotebook(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const { data, error } = await supabase
        .from('notebook_files')
        .select(`
          id,
          files (
            id,
            filename,
            file_type,
            file_size,
            created_at
          )
        `)
        .eq('notebook_id', params?.id);

      if (error) {
        console.error('Error fetching sources:', error);
        return;
      }

      const formattedSources: Source[] = data?.map((item: any) => ({
        id: item.files.id,
        title: item.files.filename,
        type: item.files.file_type,
        selected: false,
        filename: item.files.filename,
        file_size: item.files.file_size,
        created_at: item.files.created_at
      })) || [];

      setSources(formattedSources);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSelectAllSources = () => {
    const newSelectAll = !selectAllSources;
    setSelectAllSources(newSelectAll);
    setSources(sources.map(source => ({ ...source, selected: newSelectAll })));
  };

  const handleSourceToggle = (sourceId: string) => {
    setSources(sources.map(source => 
      source.id === sourceId ? { ...source, selected: !source.selected } : source
    ));
    
    // Update select all state based on individual selections
    const updatedSources = sources.map(source => 
      source.id === sourceId ? { ...source, selected: !source.selected } : source
    );
    setSelectAllSources(updatedSources.every(source => source.selected));
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isLoadingChat) return;

    const userMessage = chatMessage.trim();
    setChatMessage('');
    setIsLoadingChat(true);

    // Add user message to conversation immediately
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setConversations(prev => [...prev, newUserMessage]);

    try {
      // Get selected sources
      const selectedSources = sources.filter(source => source.selected);
      
      // Send message to chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          notebookId: params?.id,
          conversationHistory: conversations.slice(-10) // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add assistant response to conversation
      const assistantMessage = {
        role: 'assistant',
        content: data.message,
        sources: data.sources,
        timestamp: data.timestamp
      };
      setConversations(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to conversation
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setConversations(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleAddClick = () => {
    setShowUploadModal(true);
    setUploadError(null);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please select a PDF, DOC, DOCX, or TXT file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setUploadError('File size must be less than 10MB.');
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Create FormData to send file to API for processing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notebookId', params?.id as string);

      // Update progress to 50% while processing
      setUploadProgress(50);

      // Call API endpoint to process and store the file
      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process file');
      }

      const result = await response.json();
      console.log('File processing result:', result);

      // Update progress to 100% after successful processing
      setUploadProgress(100);

      // Add to sources list immediately
      const newSource: Source = {
        id: result.file.id,
        title: result.file.name,
        type: result.file.type,
        selected: false,
        filename: result.file.name,
        file_size: result.file.size,
        created_at: new Date().toISOString()
      };

      setSources(prev => [...prev, newSource]);
      setShowUploadModal(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      console.log(`File ${file.name} successfully uploaded and processed`);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteSource = (source: Source) => {
    setSourceToDelete(source);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSource = async () => {
    if (!sourceToDelete) return;

    setIsDeleting(true);
    try {
      // Remove from notebook_files table
      const { error: linkError } = await supabase
        .from('notebook_files')
        .delete()
        .eq('notebook_id', params?.id)
        .eq('file_id', sourceToDelete.id);

      if (linkError) {
        throw linkError;
      }

      // Get file path for storage deletion
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('file_path')
        .eq('id', sourceToDelete.id)
        .single();

      if (fileError) {
        console.error('Error getting file path:', fileError);
      }

      // Delete from storage if file path exists
      if (fileData?.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([fileData.file_path]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Delete from files table
      const { error: deleteError } = await supabase
        .from('files')
        .delete()
        .eq('id', sourceToDelete.id);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setSources(prev => prev.filter(source => source.id !== sourceToDelete.id));
      
      // Close confirmation dialog
      setShowDeleteConfirm(false);
      setSourceToDelete(null);

    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteSource = () => {
    setShowDeleteConfirm(false);
    setSourceToDelete(null);
  };

  const selectedSourcesCount = sources.filter(source => source.selected).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Notebook not found</div>
          <button
            onClick={() => router.push('/notebooks')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Notebooks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left Sidebar - Sources Panel */}
      <div className="w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col lg:min-h-screen">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/notebooks')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">📚</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 truncate flex-1">
              {notebook.title}
            </h1>
          </div>
          
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Sources</h2>
          
          {/* Add and Discover buttons */}
          <div className="flex gap-2 mb-4">
            <button 
              onClick={handleAddClick}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Search className="w-4 h-4" />
              Discover
            </button>
          </div>
          
          {/* Select all sources */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all"
              checked={selectAllSources}
              onChange={handleSelectAllSources}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="select-all" className="text-sm text-gray-700">
              Select all sources
            </label>
          </div>
        </div>
        
        {/* Sources List */}
        <div className="flex-1 p-4">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center gap-3 py-2 group hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
              <input
                type="checkbox"
                id={`source-${source.id}`}
                checked={source.selected}
                onChange={() => handleSourceToggle(source.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-red-600 font-medium">📄</span>
              </div>
              <label 
                htmlFor={`source-${source.id}`}
                className="text-sm text-gray-700 cursor-pointer flex-1 truncate"
              >
                {source.title}
              </label>
              <button
                onClick={() => handleDeleteSource(source)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all duration-200 text-red-600 hover:text-red-700"
                title="Delete source"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content Area - Chat */}
      <div className="flex-1 flex flex-col relative bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen lg:min-h-0">
        
        {/* Chat Messages Area - Fixed Height with Scroll */}
         <div className="flex-1 relative overflow-hidden">
           <div className="absolute inset-0 p-4 lg:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 transition-colors">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <span className="text-3xl">💬</span>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Start a conversation</h3>
                <p className="text-gray-500 max-w-md">
                  Ask questions about your uploaded documents and get AI-powered insights.
                </p>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {conversations.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`max-w-xs sm:max-w-md lg:max-w-3xl group ${
                       message.role === 'user' 
                         ? 'flex flex-row-reverse items-end gap-2 lg:gap-3' 
                         : 'flex items-end gap-2 lg:gap-3'
                     }`}>
                       {/* Avatar */}
                       <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                         message.role === 'user'
                           ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                           : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
                       }`}>
                         <span className="text-xs lg:text-sm">{message.role === 'user' ? '👤' : '🤖'}</span>
                       </div>
                       
                       {/* Message Bubble */}
                       <div className={`px-3 py-2 lg:px-4 lg:py-3 rounded-2xl shadow-sm transition-all duration-200 group-hover:shadow-md ${
                         message.role === 'user' 
                           ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md' 
                           : message.isError 
                             ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-800 border border-red-200 rounded-bl-md'
                             : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                       }`}>
                        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                        
                        {/* Sources */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/20">
                            <div className="text-sm opacity-80 mb-2 font-medium">Sources:</div>
                            <div className="space-y-1">
                              {message.sources.map((source: any, sourceIndex: number) => (
                                <div key={sourceIndex} className="text-xs opacity-70 flex items-center gap-1">
                                  <span>📄</span>
                                  <span>{source.filename}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Timestamp */}
                        <div className="text-xs opacity-60 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading Animation */}
                 {isLoadingChat && (
                   <div className="flex justify-start animate-fadeIn">
                     <div className="flex items-end gap-2 lg:gap-3">
                       <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                         <span className="text-xs lg:text-sm text-gray-600">🤖</span>
                       </div>
                       <div className="px-3 py-2 lg:px-4 lg:py-3 rounded-2xl rounded-bl-md bg-white border border-gray-100 shadow-sm">
                         <div className="flex items-center gap-2">
                           <div className="flex space-x-1">
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                           </div>
                           <span className="text-gray-600 text-xs lg:text-sm">AI is thinking...</span>
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
        
        {/* Fixed Chat Input */}
        <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200/50 p-3 lg:p-4 sticky bottom-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-2 lg:gap-3">
              <div className="flex-1 relative">
                <div className="relative">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask anything about your documents..."
                    className="w-full px-3 py-2 pr-10 lg:px-4 lg:py-3 lg:pr-12 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[40px] lg:min-h-[48px] max-h-32 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md text-sm lg:text-base"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                  />
                  <button className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Paperclip className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
                
                {/* Source Counter */}
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    {selectedSourcesCount} source{selectedSourcesCount !== 1 ? 's' : ''} active
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:block">Press Enter to send, Shift+Enter for new line</span>
                </div>
              </div>
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim() || isLoadingChat}
                className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                {isLoadingChat ? (
                  <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 lg:w-5 lg:h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{uploadError}</p>
              </div>
            )}

            <div className="mb-6">
              <div 
                onClick={handleFileSelect}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  Click to select a file or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX, TXT (max 10MB)
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {isUploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Uploading...</span>
                  <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFileSelect}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Select File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && sourceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Source</h3>
              <button
                onClick={cancelDeleteSource}
                className="text-gray-400 hover:text-gray-600"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <strong>"{sourceToDelete.title}"</strong>?
              </p>
              <p className="text-sm text-red-600">
                This action cannot be undone. The file and all associated data will be permanently removed.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDeleteSource}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSource}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}