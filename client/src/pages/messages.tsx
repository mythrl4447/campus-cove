import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Send, MoreVertical, User, Plus, MessageSquare, FileText, Edit, Users, UserMinus, UserPlus, Eye, Calendar, Paperclip, Download, File } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Message, Conversation, InsertMessage } from "@shared/schema";

export default function MessagesPage() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [groupName, setGroupName] = useState('');

  const [currentGroupMembers, setCurrentGroupMembers] = useState<any[]>([]);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{show: boolean, member: any} | null>(null);
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: isAuthenticated
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/conversations', selectedConversation, 'messages'],
    enabled: isAuthenticated && selectedConversation !== null
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/users/search', `?q=${encodeURIComponent(userSearchQuery)}`],
    enabled: userSearchQuery.length > 0
  });

  const { data: addMemberSearchResults = [] } = useQuery({
    queryKey: ['/api/users/search', `?q=${encodeURIComponent(addMemberSearchQuery)}`],
    enabled: addMemberSearchQuery.length > 0 && isManageMembersOpen
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: InsertMessage) => {
      const response = await apiRequest('POST', '/api/messages', message);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversation, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setMessageText('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const sendFileMutation = useMutation({
    mutationFn: async ({ file, conversationId }: { file: File, conversationId: number }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId.toString());
      
      const response = await fetch('/api/messages/file', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to send file');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversation, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send file",
        variant: "destructive"
      });
    }
  });

  const createConversationMutation = useMutation({
    mutationFn: async (participantIds: number[]) => {
      const response = await apiRequest('POST', '/api/conversations', { participantIds });
      return response.json();
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setSelectedConversation(conversation.id);
      setIsNewConversationOpen(false);
      setSelectedUsers([]);
      setUserSearchQuery('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create conversation",
        variant: "destructive"
      });
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ conversationId, name }: { conversationId: number, name: string }) => {
      const response = await apiRequest('PATCH', `/api/conversations/${conversationId}`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setIsEditGroupOpen(false);
      toast({
        title: "Group Updated",
        description: "Group details have been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update group",
        variant: "destructive"
      });
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: number, userId: number }) => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/members`, { userId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      loadGroupMembers();
      toast({
        title: "Member Added",
        description: "User has been added to the group."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive"
      });
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: number, userId: number }) => {
      const response = await apiRequest('DELETE', `/api/conversations/${conversationId}/members/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      loadGroupMembers();
      toast({
        title: "Member Removed",
        description: "User has been removed from the group."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive"
      });
    }
  });

  const loadGroupMembers = async () => {
    if (!selectedConversation) return;
    try {
      const response = await apiRequest('GET', `/api/conversations/${selectedConversation}/members`);
      const members = await response.json();
      setCurrentGroupMembers(members);
    } catch (error) {
      console.error('Failed to load group members:', error);
    }
  };





  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation) return;

    if (selectedFile) {
      sendFileMutation.mutate({
        file: selectedFile,
        conversationId: selectedConversation
      });
    } else if (messageText.trim()) {
      sendMessageMutation.mutate({
        content: messageText.trim(),
        conversationId: selectedConversation,
        senderId: 0 // This will be overridden by the server
      });
    }
  };

  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversation(conversationId);
  };

  const handleCreateConversation = () => {
    if (selectedUsers.length === 0) return;
    
    const participantIds = selectedUsers.map(user => user.id);
    createConversationMutation.mutate(participantIds);
  };

  const toggleUserSelection = (user: any) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const getConversationName = (conversation: any) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants?.find((p: any) => p.id !== user?.id);
    return otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Unknown User';
  };

  const getConversationSubtitle = (conversation: any) => {
    if (conversation.type === 'group') {
      return `${conversation.participants?.length || 0} members`;
    }
    return conversation.lastMessage ? 'Last seen recently' : 'Start a conversation';
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const filteredConversations = (conversations as any[]).filter((conversation: any) => {
    const name = getConversationName(conversation).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const selectedConversationData = (conversations as any[]).find((c: any) => c.id === selectedConversation);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="campus-bg-white campus-border-gray-300 h-[600px] flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r campus-border-gray-300 flex flex-col">
          <div className="p-4 border-b campus-border-gray-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold campus-text-black">Messages</h2>
              <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" title="Start new conversation">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start New Conversation</DialogTitle>
                    <DialogDescription>
                      Search for users to start a conversation with
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        placeholder="Search users by name or email..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      <Search className="w-4 h-4 absolute left-3 top-3 campus-text-gray-400" />
                    </div>
                    
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map(user => (
                          <Badge key={user.id} variant="secondary" className="cursor-pointer" onClick={() => toggleUserSelection(user)}>
                            {user.firstName} {user.lastName}
                            <span className="ml-1">×</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {userSearchQuery.length === 0 ? (
                        <p className="text-sm campus-text-gray-500 text-center py-4">
                          Start typing to search for users
                        </p>
                      ) : (searchResults as any[]).length === 0 ? (
                        <p className="text-sm campus-text-gray-500 text-center py-4">
                          No users found matching "{userSearchQuery}"
                        </p>
                      ) : (
                        (searchResults as any[]).map((user: any) => {
                          const isSelected = selectedUsers.some(u => u.id === user.id);
                          return (
                            <div
                              key={user.id}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? 'campus-bg-gray-100' : 'hover:campus-bg-gray-50'
                              }`}
                              onClick={() => toggleUserSelection(user)}
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700 text-sm">
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="font-medium campus-text-black">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-sm campus-text-gray-500">{user.email}</p>
                                  {user.major && (
                                    <p className="text-xs campus-text-gray-400">{user.major} • Class of {user.graduationYear}</p>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full campus-bg-black flex items-center justify-center">
                                    <span className="text-xs text-white">✓</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    <Button
                      className="w-full"
                      onClick={handleCreateConversation}
                      disabled={selectedUsers.length === 0 || createConversationMutation.isPending}
                    >
                      {createConversationMutation.isPending ? "Creating..." : 
                        selectedUsers.length === 1 ? "Start Conversation" : 
                        `Start Group Chat (${selectedUsers.length} people)`
                      }
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative">
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 campus-text-gray-400" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="p-4 text-center">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm campus-text-gray-500">Loading...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="w-12 h-12 campus-text-gray-400 mx-auto mb-3" />
                <p className="campus-text-gray-500">No conversations yet</p>
                <p className="text-sm campus-text-gray-400 mb-4">Start a conversation with other students</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNewConversationOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            ) : (
              filteredConversations.map((conversation: any) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b border-gray-100 hover:campus-bg-gray-50 cursor-pointer transition-colors ${
                    selectedConversation === conversation.id ? 'campus-bg-gray-100' : ''
                  }`}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      {(() => {
                        if (conversation.type === 'direct' && conversation.participants?.length > 0) {
                          const otherParticipant = conversation.participants.find((p: any) => p.id !== user?.id);
                          if (otherParticipant?.profilePicture) {
                            return <AvatarImage src={otherParticipant.profilePicture} alt={`${otherParticipant.firstName} ${otherParticipant.lastName}`} />;
                          }
                        }
                        return null;
                      })()}
                      <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700">
                        {conversation.type === 'group' ? (
                          <User className="w-5 h-5" />
                        ) : (() => {
                          const otherParticipant = conversation.participants?.find((p: any) => p.id !== user?.id);
                          return otherParticipant ? `${otherParticipant.firstName?.[0] || ''}${otherParticipant.lastName?.[0] || ''}` : <User className="w-5 h-5" />;
                        })()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium campus-text-black truncate">
                          {getConversationName(conversation)}
                        </h3>
                        <span className="text-xs campus-text-gray-500">
                          {conversation.lastMessage && formatMessageTime(conversation.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm campus-text-gray-600 truncate">
                        {conversation.lastMessage ? (
                          <>
                            {conversation.lastMessage.sender.id === user?.id ? 'You: ' : `${conversation.lastMessage.sender.firstName}: `}
                            {conversation.lastMessage.content}
                          </>
                        ) : (
                          'No messages yet'
                        )}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs campus-text-gray-500">
                          {getConversationSubtitle(conversation)}
                        </span>
                        {conversation.lastMessage && conversation.lastMessage.sender.id !== user?.id && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation && selectedConversationData ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b campus-border-gray-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700">
                        {selectedConversationData.type === 'group' ? (
                          <User className="w-5 h-5" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold campus-text-black">
                        {getConversationName(selectedConversationData)}
                      </h3>
                      <p className="text-sm campus-text-gray-500">
                        {getConversationSubtitle(selectedConversationData)}
                      </p>
                      {selectedConversationData.type === 'group' && selectedConversationData.description && (
                        <p className="text-xs campus-text-gray-400 mt-1">
                          {selectedConversationData.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4 campus-text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {selectedConversationData.type === 'group' ? (
                          <>
                            <DropdownMenuItem onClick={async () => {
                              await loadGroupMembers();
                              setIsGroupDetailsOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Group Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setGroupName(selectedConversationData.name || '');

                              setIsEditGroupOpen(true);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Group
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              await loadGroupMembers();
                              setIsManageMembersOpen(true);
                            }}>
                              <Users className="w-4 h-4 mr-2" />
                              Manage Members
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              // Leave group functionality
                              toast({
                                title: "Feature Coming Soon",
                                description: "Leave group functionality will be available soon."
                              });
                            }}>
                              <UserMinus className="w-4 h-4 mr-2" />
                              Leave Group
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => {
                              const otherParticipant = selectedConversationData.participants?.find(
                                (p: any) => p.id !== user?.id
                              );
                              if (otherParticipant) {
                                setProfileUser(otherParticipant);
                                setIsViewProfileOpen(true);
                              }
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm campus-text-gray-500">Loading messages...</p>
                  </div>
                ) : (messages as any[]).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="campus-text-gray-500">No messages yet</p>
                    <p className="text-sm campus-text-gray-400">Send a message to start the conversation</p>
                  </div>
                ) : (
                  (messages as any[]).map((message: any) => {
                    const isOwnMessage = message.sender.id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex items-start space-x-3 ${isOwnMessage ? 'justify-end' : ''}`}
                      >
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            {message.sender.profilePicture && (
                              <AvatarImage src={message.sender.profilePicture} alt={`${message.sender.firstName} ${message.sender.lastName}`} />
                            )}
                            <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700 text-sm">
                              {message.sender.firstName?.[0]}{message.sender.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`flex-1 ${isOwnMessage ? 'flex justify-end' : ''}`}>
                          <div className="max-w-md">
                            <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                              <span className="text-xs campus-text-gray-500">
                                {formatMessageTime(message.createdAt)}
                              </span>
                              <span className="text-sm font-medium campus-text-black">
                                {isOwnMessage ? 'You' : `${message.sender.firstName} ${message.sender.lastName}`}
                              </span>
                            </div>
                            <div className={`rounded-lg p-3 ${
                              isOwnMessage 
                                ? 'campus-bg-black campus-text-white' 
                                : 'campus-bg-gray-100 campus-text-gray-900'
                            }`}>
                              {message.fileUrl ? (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <File className="w-4 h-4" />
                                    <span className="text-sm font-medium">{message.fileName || 'File'}</span>
                                  </div>
                                  {message.content && <p className="text-sm">{message.content}</p>}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`text-xs ${isOwnMessage ? 'campus-text-white hover:campus-bg-gray-800' : 'campus-text-black hover:campus-bg-gray-200'}`}
                                    onClick={() => window.open(message.fileUrl, '_blank')}
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Download
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-sm">{message.content}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {isOwnMessage && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            {user?.profilePicture && (
                              <AvatarImage src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} />
                            )}
                            <AvatarFallback className="campus-bg-gray-700 campus-text-white text-sm">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t campus-border-gray-300">
                <form onSubmit={handleSendMessage} className="space-y-2">
                  {selectedFile && (
                    <div className="flex items-center justify-between p-2 campus-bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <File className="w-4 h-4 campus-text-gray-500" />
                        <span className="text-sm campus-text-gray-700">{selectedFile.name}</span>
                        <span className="text-xs campus-text-gray-500">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                      <Input
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="campus-bg-black campus-text-white hover:campus-bg-gray-900"
                      disabled={(!messageText.trim() && !selectedFile) || sendMessageMutation.isPending || sendFileMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 campus-bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 campus-text-gray-400" />
                </div>
                <p className="campus-text-gray-500 text-lg mb-2">Select a conversation</p>
                <p className="text-sm campus-text-gray-400">
                  Choose a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group Details</DialogTitle>
            <DialogDescription>
              Update the group name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Group Name</label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => {
                if (selectedConversation) {
                  updateGroupMutation.mutate({
                    conversationId: selectedConversation,
                    name: groupName
                  });
                }
              }}
              disabled={updateGroupMutation.isPending}
            >
              {updateGroupMutation.isPending ? "Updating..." : "Update Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
            <DialogDescription>
              {selectedConversationData?.participants?.length || 0} members in this group
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-3">
            {selectedConversationData?.participants?.map((participant: any) => (
              <div key={participant.id} className="flex items-center space-x-3 p-2 rounded-lg hover:campus-bg-gray-50">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700">
                    {participant.firstName?.[0]}{participant.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium campus-text-black">
                    {participant.firstName} {participant.lastName}
                    {participant.id === user?.id && " (You)"}
                  </p>
                  <p className="text-sm campus-text-gray-500">{participant.email}</p>
                  {participant.major && (
                    <p className="text-xs campus-text-gray-400">{participant.major} • Class of {participant.graduationYear}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Details Dialog */}
      <Dialog open={isGroupDetailsOpen} onOpenChange={setIsGroupDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Details</DialogTitle>
            <DialogDescription>
              View group information and members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Group Name</Label>
              <p className="text-sm campus-text-gray-700">{selectedConversationData?.name || 'Unnamed Group'}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm campus-text-gray-700">
                {selectedConversationData?.createdAt ? 
                  new Date(selectedConversationData.createdAt).toLocaleDateString() : 
                  'Unknown'
                }
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Members ({currentGroupMembers.length})</Label>
              <div className="max-h-32 overflow-y-auto space-y-2 mt-2">
                {currentGroupMembers.map((member: any) => (
                  <div key={member.id} className="flex items-center space-x-2 p-2 rounded campus-bg-gray-50">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">{member.firstName?.[0]}{member.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.firstName} {member.lastName}</span>
                    {member.id === user?.id && <Badge variant="secondary" className="text-xs">You</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={isManageMembersOpen} onOpenChange={(open) => {
        setIsManageMembersOpen(open);
        if (!open) {
          setAddMemberSearchQuery('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Members</DialogTitle>
            <DialogDescription>
              Add or remove members from this group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Current Members</Label>
              <div className="max-h-32 overflow-y-auto space-y-2 mt-2">
                {currentGroupMembers.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded campus-bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">{member.firstName?.[0]}{member.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.firstName} {member.lastName}</span>
                      {member.id === user?.id && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </div>
                    {member.id !== user?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmRemoveMember({show: true, member})}
                        disabled={removeMemberMutation.isPending}
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Add Members</Label>
              <div className="space-y-2 mt-2">
                <div className="relative">
                  <Input
                    placeholder="Search users to add..."
                    value={addMemberSearchQuery}
                    onChange={(e) => setAddMemberSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-3 campus-text-gray-400" />
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {addMemberSearchQuery.length === 0 ? (
                    <p className="text-sm campus-text-gray-500 text-center py-4">
                      Start typing to search for users to add
                    </p>
                  ) : (addMemberSearchResults as any[]).length === 0 ? (
                    <p className="text-sm campus-text-gray-500 text-center py-4">
                      No users found matching "{addMemberSearchQuery}"
                    </p>
                  ) : (
                    (addMemberSearchResults as any[])
                      .filter((user: any) => !currentGroupMembers.some((member: any) => member.id === user.id))
                      .map((user: any) => (
                        <div key={user.id} className="flex items-center justify-between p-2 rounded campus-bg-gray-50">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <span className="text-sm">{user.firstName} {user.lastName}</span>
                              <p className="text-xs campus-text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selectedConversation && addMemberMutation.mutate({ 
                              conversationId: selectedConversation, 
                              userId: user.id 
                            })}
                            disabled={addMemberMutation.isPending}
                          >
                            <UserPlus className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Member Dialog */}
      <Dialog open={confirmRemoveMember?.show || false} onOpenChange={(open) => !open && setConfirmRemoveMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {confirmRemoveMember?.member?.firstName} {confirmRemoveMember?.member?.lastName} from this group?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setConfirmRemoveMember(null)}
              disabled={removeMemberMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedConversation && confirmRemoveMember?.member) {
                  removeMemberMutation.mutate({ 
                    conversationId: selectedConversation, 
                    userId: confirmRemoveMember.member.id 
                  });
                  setConfirmRemoveMember(null);
                }
              }}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Profile Dialog */}
      <Dialog open={isViewProfileOpen} onOpenChange={setIsViewProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {profileUser && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  {profileUser.profilePicture && (
                    <AvatarImage src={profileUser.profilePicture} alt={`${profileUser.firstName} ${profileUser.lastName}`} />
                  )}
                  <AvatarFallback className="text-xl campus-bg-gray-300 campus-text-gray-700">
                    {profileUser.firstName?.[0]}{profileUser.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold campus-text-black">
                    {profileUser.firstName} {profileUser.lastName}
                  </h3>
                  <p className="text-sm campus-text-gray-500">{profileUser.email}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs campus-text-gray-500">Academic Information</Label>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm campus-text-black">
                      <span className="font-medium">Major:</span> {profileUser.major || 'Not specified'}
                    </p>
                    <p className="text-sm campus-text-black">
                      <span className="font-medium">Year:</span> {profileUser.year || 'Not specified'}
                    </p>
                    <p className="text-sm campus-text-black">
                      <span className="font-medium">Graduation Year:</span> {profileUser.graduationYear || 'Not specified'}
                    </p>
                  </div>
                </div>
                
                {profileUser.location && (
                  <div>
                    <Label className="text-xs campus-text-gray-500">Location</Label>
                    <p className="text-sm campus-text-black mt-1">{profileUser.location}</p>
                  </div>
                )}
                
                {profileUser.bio && (
                  <div>
                    <Label className="text-xs campus-text-gray-500">Bio</Label>
                    <p className="text-sm campus-text-black mt-1">{profileUser.bio}</p>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs campus-text-gray-500">Member Since</Label>
                  <p className="text-sm campus-text-black mt-1">
                    {new Date(profileUser.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
