import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Users, User, ArrowRight, Search, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Course, InsertCourse } from "@shared/schema";

export default function CoursesPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
    enabled: isAuthenticated
  });

  const { data: myCourses = [] } = useQuery<Course[]>({
    queryKey: ['/api/courses/my'],
    enabled: isAuthenticated
  });

  const { data: courseMembers = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['/api/courses', selectedCourseId, 'members'],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      const response = await fetch(`/api/courses/${selectedCourseId}/members`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    },
    enabled: !!selectedCourseId && isMembersDialogOpen
  });

  const createCourseMutation = useMutation({
    mutationFn: async (courseData: InsertCourse) => {
      const resp = await apiRequest('POST', '/api/courses', courseData);
      const data = await resp.json();
      return data;
    },
    onSuccess: () => {
      // refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Course Created",
        description: "Course group has been created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create course",
        variant: "destructive"
      });
    }
  });

  const joinCourseMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const response = await apiRequest('POST', `/api/courses/${courseId}/join`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses/my'] });
      toast({
        title: "Joined Course",
        description: "You have successfully joined the course group"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join course",
        variant: "destructive"
      });
    }
  });

  const [newCourse, setNewCourse] = useState<Partial<InsertCourse>>({
    code: '',
    name: '',
    description: '',
    instructor: '',
    department: '',
    level: '',
    semester: 'Fall 2024'
  });

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name || !newCourse.instructor) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    createCourseMutation.mutate(newCourse as InsertCourse);
  };

  const handleJoinCourse = (courseId: number) => {
    joinCourseMutation.mutate(courseId);
  };

  const handleViewMembers = (courseId: number) => {
    setSelectedCourseId(courseId);
    setIsMembersDialogOpen(true);
  };

  const isUserInCourse = (courseId: number) => {
    return myCourses.some((course) => course.id === courseId);
  };

  const filteredCourses = courses.filter((course) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return course.code.toLowerCase().includes(query) ||
           course.name.toLowerCase().includes(query) ||
           (course.instructor && course.instructor.toLowerCase().includes(query)) ||
           (course.department && course.department.toLowerCase().includes(query));
  });

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="campus-text-gray-500">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold campus-text-black">Course Groups</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 campus-text-gray-400" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="campus-bg-black campus-text-white hover:campus-bg-gray-900 whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Course Group</DialogTitle>
              <DialogDescription>
                Create a new course group to organize students and share resources for a specific class.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <Label>Course Code *</Label>
                <Input
                  value={newCourse.code}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., CS 301"
                  required
                />
              </div>
              <div>
                <Label>Course Name *</Label>
                <Input
                  value={newCourse.name}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Data Structures & Algorithms"
                  required
                />
              </div>
              <div>
                <Label>Instructor *</Label>
                <Input
                  value={newCourse.instructor || ''}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, instructor: e.target.value }))}
                  placeholder="e.g., Prof. Dr. Smith"
                  required
                />
              </div>
              <div>
                <Label>Department</Label>
                <Select onValueChange={(value) => setNewCourse(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Biology">Biology</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newCourse.description || ''}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the course"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createCourseMutation.isPending}>
                {createCourseMutation.isPending ? "Creating..." : "Create Course"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Course Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 campus-text-gray-400 mx-auto mb-4" />
            <p className="campus-text-gray-500 text-lg mb-2">
              {searchQuery ? 'No course groups match your search' : 'No course groups found'}
            </p>
            <p className="campus-text-gray-400">
              {searchQuery ? 'Try a different search term' : 'Create a new course group to get started'}
            </p>
          </div>
        ) : (
          filteredCourses.map((course: Course) => {
                const isJoined = isUserInCourse(course.id);
                return (
                  <Card key={course.id} className="campus-bg-white campus-border-gray-300 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold campus-text-black">{course.code}</h3>
                          <p className="campus-text-gray-500">{course.name}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          isJoined 
                            ? 'bg-green-100 text-green-800' 
                            : 'campus-bg-gray-100 campus-text-gray-700'
                        }`}>
                          {isJoined ? 'Joined' : 'Open'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm campus-text-gray-500 mb-4">
                        <User className="w-4 h-4 mr-2" />
                        <span>{course.instructor}</span>
                        <span className="mx-2">•</span>
                        <button 
                          onClick={() => handleViewMembers(course.id)}
                          className="flex items-center hover:campus-text-black transition-colors"
                        >
                          <Users className="w-4 h-4 mr-1" />
                          <span>View Members</span>
                        </button>
                      </div>
                      {course.description && (
                        <p className="text-sm campus-text-gray-600 mb-4">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center justify-end">
                        {isJoined ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setLocation('/resources')}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleJoinCourse(course.id)}
                            disabled={joinCourseMutation.isPending}
                          >
                            {joinCourseMutation.isPending ? "Joining..." : "Join"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                </Card>
              );
            })
        )}
      </div>

      {/* Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Course Members</DialogTitle>
            <DialogDescription>
              {selectedCourseId && courses.find(c => c.id === selectedCourseId)?.name || 'Course'} members
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {isMembersLoading ? (
              <div className="text-center py-4">
                <div className="text-sm text-gray-500">Loading members...</div>
              </div>
            ) : courseMembers.length === 0 ? (
              <div className="text-center py-4">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-500">No members in this course</div>
              </div>
            ) : (
              courseMembers.map((member: any) => (
                <div key={member.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Avatar className="w-10 h-10">
                    {member.profilePicture && (
                      <AvatarImage src={member.profilePicture} alt={`${member.firstName} ${member.lastName}`} />
                    )}
                    <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700">
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {member.firstName} {member.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.major} {member.year ? `• ${member.year}` : ''}
                    </div>
                    {member.bio && (
                      <div className="text-xs text-gray-400 mt-1">
                        {member.bio}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
