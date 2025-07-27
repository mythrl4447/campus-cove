import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Search, Download, FileText, Grid3X3, List, CloudUpload, Filter } from "lucide-react";
import type { Resource, Course } from "@shared/schema";

export default function ResourcesPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["notes", "slides"]);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  const { data: resources = [], isLoading } = useQuery<(Resource & { uploader: any; course: Course })[]>({
    queryKey: ['/api/resources', selectedCourse],
    queryFn: async () => {
      let url = '/api/resources';
      const params = new URLSearchParams();
      
      if (selectedCourse && selectedCourse !== 'all') {
        params.append('courseId', selectedCourse);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
    enabled: isAuthenticated
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['/api/courses/my'],
    enabled: isAuthenticated
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/resources', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      setIsUploadDialogOpen(false);
      setUploadFile(null);
      toast({
        title: "Resource Uploaded",
        description: "Your resource has been uploaded successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload resource",
        variant: "destructive"
      });
    }
  });

  const downloadMutation = useMutation({
    mutationFn: async (resourceId: number) => {
      const response = await fetch(`/api/resources/${resourceId}/download`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Download failed');
      }
      return { response, resourceId };
    },
    onSuccess: async ({ response, resourceId }) => {
      const resource = resources.find((r) => r.id === resourceId);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource?.title || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    },
    onError: (error: any) => {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download resource",
        variant: "destructive"
      });
    }
  });

  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    type: 'notes',
    courseId: ''
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !newResource.title || !newResource.courseId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select a file",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', newResource.title);
    formData.append('description', newResource.description);
    formData.append('type', newResource.type);
    formData.append('courseId', newResource.courseId);

    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleDownload = (resourceId: number) => {
    downloadMutation.mutate(resourceId);
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes(prev => [...prev, type]);
    } else {
      setSelectedTypes(prev => prev.filter(t => t !== type));
    }
  };

  const filteredResources = resources.filter((resource: any) => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(resource.type);
    return matchesSearch && matchesType;
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📊';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    return '📎';
  };

  const getResourceTypeDisplay = (type: string) => {
    switch (type) {
      case 'notes': return 'Notes';
      case 'slides': return 'Slides';
      case 'ebook': return 'eBook';
      case 'practice_test': return 'Practice Test';
      default: return type;
    }
  };

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'notes': return 'bg-blue-100 text-blue-800';
      case 'slides': return 'bg-green-100 text-green-800';
      case 'ebook': return 'bg-purple-100 text-purple-800';
      case 'practice_test': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="campus-text-gray-500">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold campus-text-black">Resource Library</h1>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="campus-bg-black campus-text-white hover:campus-bg-gray-900">
              <Upload className="w-4 h-4 mr-2" />
              Upload Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Resource</DialogTitle>
              <DialogDescription>
                Upload a resource file to share with your course members. Supported formats: PDF, DOC, PPT, TXT.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={newResource.title}
                  onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Chapter 5 Notes"
                  required
                />
              </div>
              <div>
                <Label>Course *</Label>
                <Select onValueChange={(value) => setNewResource(prev => ({ ...prev, courseId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(courses) && courses.length > 0 ? (
                      courses.map((course: Course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No courses available - Join a course first
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newResource.type} onValueChange={(value) => setNewResource(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="slides">Slides</SelectItem>
                    <SelectItem value="ebook">eBook</SelectItem>
                    <SelectItem value="practice_test">Practice Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newResource.description}
                  onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the resource"
                />
              </div>
              <div>
                <Label>File *</Label>
                <div className="border-2 border-dashed campus-border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <CloudUpload className="w-8 h-8 campus-text-gray-400 mx-auto mb-2" />
                    <p className="text-sm campus-text-gray-500 mb-1">
                      {uploadFile ? uploadFile.name : "Click to browse or drag & drop files here"}
                    </p>
                    <p className="text-xs campus-text-gray-400">PDF, DOC, PPT files up to 10MB</p>
                  </label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "Uploading..." : "Upload Resource"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Search and Filters */}
        <div className="lg:col-span-1">
          <Card className="campus-bg-white campus-border-gray-300 mb-6">
            <CardContent className="p-6">
              <div className="mb-4">
                <Label className="campus-text-gray-700">Search Resources</Label>
                <div className="relative mt-2">
                  <Input
                    placeholder="Search by title, course..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-3 campus-text-gray-400" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="campus-text-gray-700">Resource Type</Label>
                  <div className="space-y-2 mt-2">
                    {[
                      { id: 'notes', label: 'Notes' },
                      { id: 'slides', label: 'Slides' },
                      { id: 'ebook', label: 'eBooks' },
                      { id: 'practice_test', label: 'Practice Tests' }
                    ].map((type) => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.id}
                          checked={selectedTypes.includes(type.id)}
                          onCheckedChange={(checked) => handleTypeChange(type.id, checked as boolean)}
                        />
                        <Label htmlFor={type.id} className="text-sm campus-text-gray-700">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="campus-text-gray-700">Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {Array.isArray(courses) && courses.length > 0 && courses.map((course: Course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resources Grid */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm campus-text-gray-500">
                Showing {filteredResources.length} resources
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

          </div>

          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 campus-text-gray-400 mx-auto mb-4" />
              <p className="campus-text-gray-500 text-lg mb-2">No resources found</p>
              <p className="campus-text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
              {filteredResources.map((resource: any) => (
                <Card key={resource.id} className="campus-bg-white campus-border-gray-300 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center flex-1">
                        <div className="w-10 h-10 campus-bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-lg">{getFileIcon(resource.mimeType)}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold campus-text-black">{resource.title}</h3>
                          <p className="text-xs campus-text-gray-500">{resource.course?.code}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getResourceTypeColor(resource.type)}`}>
                        {getResourceTypeDisplay(resource.type)}
                      </span>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center text-xs campus-text-gray-500 mb-2">
                        <span>Uploaded by {resource.uploader?.firstName} {resource.uploader?.lastName}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs campus-text-gray-500">
                        <span><Download className="w-3 h-3 mr-1 inline" />{resource.downloads} downloads</span>
                        <span>{formatFileSize(resource.fileSize)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(resource.id)}
                      className="w-full campus-bg-black campus-text-white hover:campus-bg-gray-900"
                      size="sm"
                      disabled={downloadMutation.isPending}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloadMutation.isPending ? "Downloading..." : "Download"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
