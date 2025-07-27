import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Edit, User, Mail, GraduationCap, Camera } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ProfilePage() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    major: '',
    year: '',
    bio: '',
    graduationYear: ''
  });
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        major: user.major || '',
        year: user.year || '',
        bio: user.bio || '',
        graduationYear: user.graduationYear || ''
      });
    }
  }, [user]);

  const { data: courses = [] } = useQuery({
    queryKey: ['/api/courses/my'],
    enabled: isAuthenticated
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated
  });

  if (!isAuthenticated || !user) {
    return null;
  }

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      return apiRequest('PUT', '/api/users/profile', profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    }
  });

  const handleEditProfile = () => {
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editForm);
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingPicture(true);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch('/api/users/profile-picture', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive"
      });
    } finally {
      setIsUploadingPicture(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="campus-bg-white campus-border-gray-300 overflow-hidden">
        {/* Profile Header */}
        <div className="campus-bg-gray-900 px-6 py-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt="Profile" 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700 text-2xl">
                    <User className="w-12 h-12" />
                  </AvatarFallback>
                )}
              </Avatar>
              <button
                onClick={() => document.getElementById('profile-picture-input')?.click()}
                disabled={isUploadingPicture}
                className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
              >
                <Camera className="w-4 h-4 text-gray-700" />
              </button>
              <input
                id="profile-picture-input"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-gray-300">
                {user.major} • {user.year}
              </p>
              <p className="text-gray-400 text-sm">{user.email}</p>
            </div>
            <Button className="bg-white text-black hover:bg-gray-100" onClick={handleEditProfile}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <div>
                <h2 className="text-xl font-semibold campus-text-black mb-4">About</h2>
                <Card className="campus-bg-gray-50 border-0">
                  <CardContent className="p-4">
                    <p className="campus-text-gray-700">
                      {user.bio || 'No bio available'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Current Courses */}
              <div>
                <h2 className="text-xl font-semibold campus-text-black mb-4">Current Courses</h2>
                {(courses as any[]).length === 0 ? (
                  <Card className="campus-bg-gray-50 border-0">
                    <CardContent className="p-6 text-center">
                      <GraduationCap className="w-8 h-8 campus-text-gray-400 mx-auto mb-2" />
                      <p className="campus-text-gray-500">No courses enrolled</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(courses as any[]).map((course: any) => (
                      <Card key={course.id} className="campus-bg-gray-50 border-0">
                        <CardContent className="p-4">
                          <h3 className="font-semibold campus-text-black">{course.code}</h3>
                          <p className="campus-text-gray-600 text-sm">{course.name}</p>
                          <p className="campus-text-gray-500 text-xs mt-1">{course.instructor}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>


            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold campus-text-black mb-4">Contact</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 campus-text-gray-500" />
                    <span className="text-sm campus-text-gray-700">{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <GraduationCap className="w-4 h-4 campus-text-gray-500" />
                    <span className="text-sm campus-text-gray-700">Class of {user.graduationYear || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                value={editForm.major}
                onChange={(e) => setEditForm(prev => ({ ...prev, major: e.target.value }))}
                placeholder="e.g., Computer Science"
              />
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Select 
                value={editForm.year} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, year: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freshman">Freshman</SelectItem>
                  <SelectItem value="sophomore">Sophomore</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="graduationYear">Graduation Year</Label>
              <Input
                id="graduationYear"
                value={editForm.graduationYear}
                onChange={(e) => setEditForm(prev => ({ ...prev, graduationYear: e.target.value }))}
                placeholder="e.g., 2025"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="flex-1"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
