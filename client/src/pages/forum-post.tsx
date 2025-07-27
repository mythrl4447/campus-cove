import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  ChevronUp, 
  ChevronDown, 
  MessageCircle, 
  Eye, 
  Pin, 
  User,
  Send
} from "lucide-react";
import type { ForumPost, ForumReply, InsertForumReply } from "@shared/schema";

interface PostDetailProps {
  postId: string;
}

export default function ForumPostPage({ postId }: PostDetailProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  const { data: post, isLoading } = useQuery<ForumPost & { 
    author: any; 
    replies: (ForumReply & { author: any })[] 
  }>({
    queryKey: ['/api/forum/posts', postId],
    queryFn: async () => {
      const response = await fetch(`/api/forum/posts/${postId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Post not found');
        }
        throw new Error('Failed to fetch post');
      }
      return response.json();
    },
    enabled: !!postId && isAuthenticated
  });

  const voteMutation = useMutation({
    mutationFn: async ({ voteType }: { voteType: 'up' | 'down' }) => {
      const response = await apiRequest('POST', `/api/forum/posts/${postId}/vote`, { voteType });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forum/posts', postId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to vote",
        variant: "destructive"
      });
    }
  });

  const replyMutation = useMutation({
    mutationFn: async (replyData: { content: string }) => {
      const response = await apiRequest('POST', `/api/forum/posts/${postId}/replies`, replyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forum/posts', postId] });
      setReplyContent("");
      toast({
        title: "Reply Posted",
        description: "Your reply has been posted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post reply",
        variant: "destructive"
      });
    }
  });

  const handleVote = (voteType: 'up' | 'down') => {
    voteMutation.mutate({ voteType });
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply",
        variant: "destructive"
      });
      return;
    }
    replyMutation.mutate({ content: replyContent });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="campus-text-gray-500">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 campus-text-gray-400 mx-auto mb-4" />
          <p className="campus-text-gray-500 text-lg mb-2">Post not found</p>
          <Button onClick={() => setLocation('/forums')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forums
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/forums')}
          className="campus-text-gray-600 hover:campus-text-black"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Forums
        </Button>
      </div>

      {/* Main Post */}
      <Card className="campus-bg-white campus-border-gray-300 mb-6">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('up')}
                className="campus-text-gray-400 hover:text-green-600"
              >
                <ChevronUp className="w-5 h-5" />
              </Button>
              <span className="text-lg font-medium campus-text-gray-700">
                {(post.upvotes || 0) - (post.downvotes || 0)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('down')}
                className="campus-text-gray-400 hover:text-red-600"
              >
                <ChevronDown className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold campus-text-black mb-2">
                    {post.title}
                    {post.isPinned && (
                      <Pin className="w-5 h-5 inline ml-2 text-yellow-500" />
                    )}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm campus-text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        {post.author?.profilePicture && (
                          <AvatarImage src={post.author.profilePicture} alt={`${post.author.firstName} ${post.author.lastName}`} />
                        )}
                        <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700 text-xs">
                          {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {post.author?.firstName} {post.author?.lastName}
                      </span>
                    </div>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>
                      <Eye className="w-4 h-4 mr-1 inline" />
                      {post.views || 0} views
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
              <div className="prose max-w-none">
                <p className="campus-text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reply Form */}
      <Card className="campus-bg-white campus-border-gray-300 mb-6">
        <CardHeader>
          <CardTitle className="campus-text-black">Post a Reply</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <form onSubmit={handleReply} className="space-y-4">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Share your thoughts or answer..."
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={replyMutation.isPending || !replyContent.trim()}
                className="campus-bg-black campus-text-white hover:campus-bg-gray-900"
              >
                <Send className="w-4 h-4 mr-2" />
                {replyMutation.isPending ? "Posting..." : "Post Reply"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Replies */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold campus-text-black">
          {post.replies?.length || 0} {(post.replies?.length || 0) === 1 ? 'Reply' : 'Replies'}
        </h2>
        
        {post.replies && post.replies.length > 0 ? (
          post.replies.map((reply) => (
            <Card key={reply.id} className="campus-bg-white campus-border-gray-300">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="w-8 h-8">
                    {reply.author?.profilePicture && (
                      <AvatarImage src={reply.author.profilePicture} alt={`${reply.author.firstName} ${reply.author.lastName}`} />
                    )}
                    <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700 text-sm">
                      {reply.author?.firstName?.[0]}{reply.author?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium campus-text-black">
                          {reply.author?.firstName} {reply.author?.lastName}
                        </span>
                        <span className="text-sm campus-text-gray-500">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="campus-text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 campus-text-gray-400 mx-auto mb-4" />
            <p className="campus-text-gray-500">No replies yet</p>
            <p className="text-sm campus-text-gray-400">
              Be the first to share your thoughts!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}