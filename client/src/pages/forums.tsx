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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, MessageCircle, Eye, ChevronUp, ChevronDown, Pin } from "lucide-react";
import type { ForumPost, InsertForumPost } from "@shared/schema";

export default function ForumsPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');


  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  const { data: posts = [], isLoading } = useQuery<ForumPost[]>({
    queryKey: ['/api/forum/posts', selectedCategory],
    queryFn: async () => {
      let url = '/api/forum/posts';
      const params = new URLSearchParams();
      
      if (selectedCategory) {
        params.append('categoryId', selectedCategory);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
    enabled: isAuthenticated
  });

  const { data: categories = [] } = useQuery<{id: number, name: string, description?: string}[]>({
    queryKey: ['/api/forum/categories'],
    enabled: isAuthenticated
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData: InsertForumPost) => {
      const response = await apiRequest('POST', '/api/forum/posts', postData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forum/posts'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Post Created",
        description: "Your discussion post has been created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    }
  });

  const voteMutation = useMutation({
    mutationFn: async ({ postId, voteType }: { postId: number; voteType: 'up' | 'down' }) => {
      const response = await apiRequest('POST', `/api/forum/posts/${postId}/vote`, { voteType });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forum/posts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to vote",
        variant: "destructive"
      });
    }
  });

  const [newPost, setNewPost] = useState<Partial<InsertForumPost>>({
    title: '',
    content: '',
    categoryId: undefined
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createPostMutation.mutate({
      ...newPost
    } as InsertForumPost);
  };

  const handleVote = (postId: number, voteType: 'up' | 'down') => {
    voteMutation.mutate({ postId, voteType });
  };

  const filteredPosts = posts.filter((post: ForumPost) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || post.categoryId?.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedPosts = [...filteredPosts].sort((a: ForumPost, b: ForumPost) => {
    // Default to recent sorting
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="campus-text-gray-500">Loading discussions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold campus-text-black">Discussion Forums</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="campus-bg-black campus-text-white hover:campus-bg-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              New Discussion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Discussion</DialogTitle>
              <DialogDescription>
                Start a new discussion thread to share ideas, ask questions, or engage with your community.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What would you like to discuss?"
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select onValueChange={(value) => setNewPost(prev => ({ ...prev, categoryId: value ? parseInt(value) : undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content *</Label>
                <Textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Share your thoughts, questions, or insights..."
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={createPostMutation.isPending}>
                {createPostMutation.isPending ? "Creating..." : "Create Discussion"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <Card className="campus-bg-white campus-border-gray-300 mb-6">
            <CardHeader>
              <CardTitle className="campus-text-black">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-2">
                <Button
                  variant={selectedCategory === '' ? 'default' : 'ghost'}
                  className={`w-full justify-start ${
                    selectedCategory === '' 
                      ? 'campus-bg-black campus-text-white' 
                      : 'campus-text-gray-700 hover:campus-bg-gray-50'
                  }`}
                  onClick={() => setSelectedCategory('')}
                >
                  All Topics
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id.toString() ? 'default' : 'ghost'}
                    className={`w-full justify-start ${
                      selectedCategory === category.id.toString()
                        ? 'campus-bg-black campus-text-white' 
                        : 'campus-text-gray-700 hover:campus-bg-gray-50'
                    }`}
                    onClick={() => setSelectedCategory(category.id.toString())}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Discussions List */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Input
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
                <Search className="w-4 h-4 absolute left-3 top-3 campus-text-gray-400" />
              </div>
            </div>
          </div>

          {sortedPosts.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 campus-text-gray-400 mx-auto mb-4" />
              <p className="campus-text-gray-500 text-lg mb-2">No discussions found</p>
              <p className="campus-text-gray-400">
                Start a new discussion or try adjusting your search
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPosts.map((post: any) => (
                <Card key={post.id} className="campus-bg-white campus-border-gray-300 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex flex-col items-center space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(post.id, 'up')}
                          className="campus-text-gray-400 hover:text-green-600"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium campus-text-gray-700">
                          {post.upvotes - post.downvotes}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(post.id, 'down')}
                          className="campus-text-gray-400 hover:text-red-600"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 
                            className="text-lg font-semibold campus-text-black hover:campus-text-gray-700 cursor-pointer"
                            onClick={() => setLocation(`/forum/post/${post.id}`)}
                          >
                            {post.title}
                            {post.isPinned && (
                              <Pin className="w-4 h-4 inline ml-2 text-yellow-500" />
                            )}
                          </h3>
                          <span className="text-xs campus-text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="campus-text-gray-600 mb-3 line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Avatar className="w-6 h-6">
                                {post.author?.profilePicture && (
                                  <AvatarImage src={post.author.profilePicture} alt={`${post.author.firstName} ${post.author.lastName}`} />
                                )}
                                <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700 text-xs">
                                  {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm campus-text-gray-700 font-medium">
                                {post.author?.firstName} {post.author?.lastName}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm campus-text-gray-500">
                              <span>
                                <MessageCircle className="w-4 h-4 mr-1 inline" />
                                {post.replyCount} replies
                              </span>
                              <span>
                                <Eye className="w-4 h-4 mr-1 inline" />
                                {post.views} views
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {post.category && (
                              <Badge variant="outline">{post.category.name}</Badge>
                            )}
                            {post.tags && post.tags.map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary">
                                #{tag}
                              </Badge>
                            ))}
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
    </div>
  );
}
