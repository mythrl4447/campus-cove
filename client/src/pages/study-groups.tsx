import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Users, MapPin, Calendar, Clock, ArrowRight, User, CalendarCheck, Eye, X, CalendarPlus, MoreVertical, Edit, UserMinus, UserPlus, Trash2, BookOpen } from "lucide-react";
import type { StudyGroup, InsertStudyGroup, Course } from "@shared/schema";
import { format } from "date-fns";

export default function StudyGroupsPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<any>(null);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const [isScheduleSessionOpen, setIsScheduleSessionOpen] = useState(false);
  const [selectedGroupForSession, setSelectedGroupForSession] = useState<StudyGroup | null>(null);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<StudyGroup | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', description: '', courseId: '' });
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<(StudyGroup & { members?: any[] }) | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  const { data: studyGroups = [], isLoading } = useQuery<StudyGroup[]>({
    queryKey: ['/api/study-groups'],
    enabled: isAuthenticated
  });

  const { data: myGroups = [] } = useQuery<StudyGroup[]>({
    queryKey: ['/api/study-groups/my'],
    enabled: isAuthenticated
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['/api/courses/my'],
    enabled: isAuthenticated
  });

  const fetchGroupMembers = async (groupId: number) => {
    const response = await fetch(`/api/study-groups/${groupId}/members`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch members');
    return response.json();
  };

  const viewMembersHandler = async (group: StudyGroup) => {
    try {
      const members = await fetchGroupMembers(group.id);
      setSelectedGroupMembers({ group, members });
      setIsViewMembersOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load group members",
        variant: "destructive"
      });
    }
  };

  const viewGroupDetailsHandler = async (group: StudyGroup) => {
    try {
      const members = await fetchGroupMembers(group.id);
      setSelectedGroupDetails({ ...group, members });
      setIsGroupDetailsOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load group details",
        variant: "destructive"
      });
    }
  };

  const editGroupHandler = (group: StudyGroup) => {
    setSelectedGroupForEdit(group);
    setEditFormData({
      name: group.name,
      description: group.description || '',
      courseId: group.courseId?.toString() || ''
    });
    setIsEditGroupOpen(true);
  };

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: InsertStudyGroup) => {
      const response = await apiRequest('POST', '/api/study-groups', groupData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Study Group Created",
        description: "Your study group has been created successfully! Calendar events added."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create study group",
        variant: "destructive"
      });
    }
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await apiRequest('POST', `/api/study-groups/${groupId}/join`);
      return response.json();
    },  
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: "Joined Study Group",
        description: "You have successfully joined the study group! Calendar events added."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join study group",
        variant: "destructive"
      });
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await apiRequest('DELETE', `/api/study-groups/${groupId}/leave`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: "Left Study Group",
        description: "You have successfully left the study group."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to leave study group",
        variant: "destructive"
      });
    }
  });

  const editGroupMutation = useMutation({
    mutationFn: async ({ groupId, data }: { groupId: number, data: { name: string, description: string, courseId: string } }) => {
      const response = await apiRequest('PATCH', `/api/study-groups/${groupId}`, {
        name: data.name,
        description: data.description,
        courseId: data.courseId === 'none' || data.courseId === '' ? null : parseInt(data.courseId)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update study group');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-groups/my'] });
      setIsEditGroupOpen(false);
      toast({
        title: "Study Group Updated",
        description: "Study group has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update study group",
        variant: "destructive"
      });
    }
  });

  const scheduleSessionMutation = useMutation({
    mutationFn: async ({ groupId, sessionData }: { groupId: number, sessionData: any }) => {
      const response = await apiRequest('POST', `/api/study-groups/${groupId}/sessions`, sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setIsScheduleSessionOpen(false);
      toast({
        title: "Session Scheduled",
        description: "Study session scheduled for all group members!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule session",
        variant: "destructive"
      });
    }
  });

  const [newGroup, setNewGroup] = useState<Partial<InsertStudyGroup>>({
    name: '',
    description: '',
    courseId: undefined,
    maxMembers: 6,
    schedule: '',
    location: '',
    meetingDate: undefined,
    endDate: undefined,
    isRecurring: false,
    recurringPattern: undefined
  });

  const [sessionData, setSessionData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: ''
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name || (!newGroup.schedule && !newGroup.meetingDate)) {
      toast({
        title: "Error",
        description: "Please fill in group name and either schedule or meeting date",
        variant: "destructive"
      });
      return;
    }

    // Convert date strings to proper format for server
    const groupToSubmit = {
      ...newGroup,
      courseId: newGroup.courseId ? parseInt(String(newGroup.courseId)) : null,
      maxMembers: parseInt(newGroup.maxMembers?.toString() || "4"),
      meetingDate: newGroup.meetingDate ? new Date(newGroup.meetingDate) : null,
      endDate: newGroup.endDate ? new Date(newGroup.endDate) : null,
    };

    createGroupMutation.mutate(groupToSubmit as InsertStudyGroup);
  };

  const handleJoinGroup = (groupId: number) => {
    joinGroupMutation.mutate(groupId);
  };

  const handleScheduleSession = (group: StudyGroup) => {
    setSelectedGroupForSession(group);
    setSessionData({
      title: `${group.name} - Study Session`,
      description: '',
      startDate: '',
      endDate: '',
      location: group.location || ''
    });
    setIsScheduleSessionOpen(true);
  };

  const handleSubmitSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionData.title || !sessionData.startDate || !selectedGroupForSession) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    scheduleSessionMutation.mutate({
      groupId: selectedGroupForSession.id,
      sessionData
    });
  };

  const isUserInGroup = (groupId: number) => {
    return myGroups.some((group: StudyGroup) => group.id === groupId);
  };

  const availableGroups = studyGroups.filter((group: StudyGroup) => !isUserInGroup(group.id));

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="campus-text-gray-500">Loading study groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold campus-text-black">Study Groups</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="campus-bg-black campus-text-white hover:campus-bg-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Study Group</DialogTitle>
              <DialogDescription>
                Create a study group to collaborate with other students in your courses.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <Label>Group Name *</Label>
                <Input
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., CS 301 Study Group"
                  required
                />
              </div>
              <div>
                <Label>Course</Label>
                <Select onValueChange={(value) => setNewGroup(prev => ({ ...prev, courseId: value ? parseInt(value) : undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course: Course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newGroup.description ?? ''}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the study group goals and focus"
                  rows={3}
                />
              </div>
              <div>
                <Label>Meeting Schedule</Label>
                <Input
                  value={newGroup.schedule ?? ''}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, schedule: e.target.value }))}
                  placeholder="e.g., Tuesdays 3:00 PM (optional if you set specific dates)"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Meeting Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={newGroup.meetingDate ? new Date(newGroup.meetingDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setNewGroup(prev => ({ 
                      ...prev, 
                      meetingDate: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                  />
                </div>
                <div>
                  <Label>End Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={newGroup.endDate ? new Date(newGroup.endDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setNewGroup(prev => ({ 
                      ...prev, 
                      endDate: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={newGroup.isRecurring}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="recurring">Recurring meetings</Label>
                </div>
                
                {newGroup.isRecurring && (
                  <Select onValueChange={(value) => setNewGroup(prev => ({ ...prev, recurringPattern: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label>Location</Label>
                <Input
                  value={newGroup.location ?? ''}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Library Room 203"
                />
              </div>
              <div>
                <Label>Max Members</Label>
                <Select 
                  value={newGroup.maxMembers?.toString() ?? "6"} 
                  onValueChange={(value) => setNewGroup(prev => ({ ...prev, maxMembers: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 members</SelectItem>
                    <SelectItem value="4">4 members</SelectItem>
                    <SelectItem value="5">5 members</SelectItem>
                    <SelectItem value="6">6 members</SelectItem>
                    <SelectItem value="8">8 members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* My Groups */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold campus-text-black mb-4">My Study Groups</h2>
            {myGroups.length === 0 ? (
              <Card className="campus-bg-white campus-border-gray-300">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 campus-text-gray-400 mx-auto mb-4" />
                  <p className="campus-text-gray-500 mb-2">You haven't joined any study groups yet</p>
                  <p className="text-sm campus-text-gray-400">
                    Browse available groups below or create your own
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myGroups.map((group: any) => (
                  <Card key={group.id} className="campus-bg-white campus-border-gray-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold campus-text-black">{group.name}</h3>
                          <p className="campus-text-gray-500 text-sm">
                            {group.course ? `${group.course.code} - ${group.course.name}` : 'General Study Group'}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <div className="flex items-center text-sm campus-text-gray-500 mb-4">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{group.memberCount} members</span>
                        <span className="mx-2">•</span>
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{group.meetingDate ? 
                          format(new Date(group.meetingDate), "MMM d 'at' HH:mm") : 
                          group.schedule || 'No schedule'
                        }</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map((i) => (
                            <Avatar key={i} className="w-8 h-8 border-2 border-white">
                              <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700 text-xs">
                                <User className="w-3 h-3" />
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {group.memberCount > 3 && (
                            <Avatar className="w-8 h-8 border-2 border-white">
                              <AvatarFallback className="campus-bg-gray-700 campus-text-white text-xs">
                                +{group.memberCount - 3}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => viewMembersHandler(group)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => viewGroupDetailsHandler(group)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => editGroupHandler(group)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Group
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => leaveGroupMutation.mutate(group.id)}
                                className="text-red-600"
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Leave Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Available Groups */}
          <div>
            <h2 className="text-xl font-semibold campus-text-black mb-4">Available Study Groups</h2>
            {availableGroups.length === 0 ? (
              <Card className="campus-bg-white campus-border-gray-300">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 campus-text-gray-400 mx-auto mb-4" />
                  <p className="campus-text-gray-500 mb-2">No available study groups</p>
                  <p className="text-sm campus-text-gray-400">
                    Be the first to create a study group for your course
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableGroups.map((group: any) => (
                  <Card key={group.id} className="campus-bg-white campus-border-gray-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold campus-text-black">{group.name}</h3>
                              <p className="campus-text-gray-500 text-sm">
                                {group.course ? `${group.course.code} - ${group.course.name}` : 'General Study Group'}
                              </p>
                            </div>
                            <Badge variant="outline">Open</Badge>
                          </div>
                          <div className="flex items-center text-sm campus-text-gray-500 mb-4">
                            <Users className="w-4 h-4 mr-2" />
                            <span>{group.memberCount}/{group.maxMembers} members</span>
                            <span className="mx-2">•</span>
                            <Clock className="w-4 h-4 mr-2" />
                            <span>{group.meetingDate ? 
                              format(new Date(group.meetingDate), "MMM d 'at' HH:mm") : 
                              group.schedule || 'No schedule set'
                            }</span>
                            {group.location && (
                              <>
                                <span className="mx-2">•</span>
                                <MapPin className="w-4 h-4 mr-2" />
                                <span>{group.location}</span>
                              </>
                            )}
                          </div>
                          {group.description && (
                            <p className="campus-text-gray-600 text-sm mb-4">
                              {group.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <span className="text-sm campus-text-gray-500">
                                Created by {group.creator?.firstName} {group.creator?.lastName}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewMembersHandler(group)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Members
                              </Button>
                              <Button
                                onClick={() => handleJoinGroup(group.id)}
                                className="campus-bg-black campus-text-white hover:campus-bg-gray-900"
                                disabled={joinGroupMutation.isPending || group.memberCount >= group.maxMembers}
                              >
                                {group.memberCount >= group.maxMembers ? "Full" :
                                 joinGroupMutation.isPending ? "Joining..." : "Join Group"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">


          {/* Upcoming Sessions */}
          <Card className="campus-bg-white campus-border-gray-300">
            <CardHeader>
              <CardTitle className="campus-text-black">Upcoming Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {myGroups.length === 0 ? (
                <div className="text-center py-4">
                  <Calendar className="w-8 h-8 campus-text-gray-400 mx-auto mb-2" />
                  <p className="text-sm campus-text-gray-500">No upcoming sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myGroups.slice(0, 3).map((group: any) => (
                    <div key={group.id} className="flex items-center justify-between p-3 campus-bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium campus-text-black">{group.name}</p>
                        <p className="text-xs campus-text-gray-500">{group.schedule}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleScheduleSession(group)}
                      >
                        <CalendarPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Members Dialog */}
      <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedGroupMembers?.group?.name} Members
            </DialogTitle>
            <DialogDescription>
              View all members in this study group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedGroupMembers?.members?.map((member: any) => (
              <div key={member.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <Avatar className="h-10 w-10">
                  {member.profilePicture && (
                    <AvatarImage src={member.profilePicture} alt={`${member.firstName} ${member.lastName}`} />
                  )}
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {member.firstName?.charAt(0) || 'U'}{member.lastName?.charAt(0) || ''}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {member.major} {member.year && `• ${member.year}`}
                  </p>
                </div>
                {member.id === selectedGroupMembers?.group?.creatorId && (
                  <Badge variant="secondary" className="text-xs">
                    Creator
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Session Dialog */}
      <Dialog open={isScheduleSessionOpen} onOpenChange={setIsScheduleSessionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Study Session</DialogTitle>
            <DialogDescription>
              Schedule a study session for {selectedGroupForSession?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitSession} className="space-y-4">
            <div>
              <Label>Session Title *</Label>
              <Input
                value={sessionData.title}
                onChange={(e) => setSessionData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Midterm Review Session"
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={sessionData.description}
                onChange={(e) => setSessionData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What will you study during this session?"
                rows={2}
              />
            </div>
            <div>
              <Label>Start Date & Time *</Label>
              <Input
                type="datetime-local"
                value={sessionData.startDate}
                onChange={(e) => setSessionData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>End Date & Time</Label>
              <Input
                type="datetime-local"
                value={sessionData.endDate}
                onChange={(e) => setSessionData(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={sessionData.location}
                onChange={(e) => setSessionData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Library Room 203"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit"
                disabled={scheduleSessionMutation.isPending}
                className="flex-1"
              >
                {scheduleSessionMutation.isPending ? 'Scheduling...' : 'Schedule Session'}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsScheduleSessionOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Study Group</DialogTitle>
            <DialogDescription>
              Update the details of your study group.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (selectedGroupForEdit) {
              editGroupMutation.mutate({ 
                groupId: selectedGroupForEdit.id, 
                data: editFormData 
              });
            }
          }} className="space-y-4">
            <div>
              <Label>Group Name *</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., CS101 Study Group"
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What will your group focus on?"
                rows={3}
              />
            </div>
            <div>
              <Label>Course</Label>
              <Select value={editFormData.courseId} onValueChange={(value) => setEditFormData(prev => ({ ...prev, courseId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific course</SelectItem>
                  {courses?.map((course: Course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit"
                disabled={editGroupMutation.isPending}
                className="flex-1"
              >
                {editGroupMutation.isPending ? 'Updating...' : 'Update Group'}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsEditGroupOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Group Details Dialog */}
      <Dialog open={isGroupDetailsOpen} onOpenChange={setIsGroupDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedGroupDetails?.name}
            </DialogTitle>
            <DialogDescription>
              Complete details and member information
            </DialogDescription>
          </DialogHeader>
          {selectedGroupDetails && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedGroupDetails.description || 'No description provided'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{selectedGroupDetails.members?.length || 0}/{selectedGroupDetails.maxMembers} members</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {selectedGroupDetails.meetingDate ? 
                      format(new Date(selectedGroupDetails.meetingDate), "MMM d 'at' HH:mm") : 
                      selectedGroupDetails.schedule || 'No schedule set'
                    }
                  </span>
                </div>
                
                {selectedGroupDetails.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedGroupDetails.location}</span>
                  </div>
                )}
                
                {selectedGroupDetails.courseId && (
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>Course ID: {selectedGroupDetails.courseId}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-3">Members</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedGroupDetails.members?.map((member: any) => (
                    <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {member.firstName?.charAt(0) || 'U'}{member.lastName?.charAt(0) || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {member.major} {member.year && `• ${member.year}`}
                        </p>
                      </div>
                      {member.id === selectedGroupDetails.creatorId && (
                        <Badge variant="secondary" className="text-xs">
                          Creator
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
