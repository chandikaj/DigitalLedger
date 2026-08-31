import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Heart, 
  Clock, 
  MessageSquare, 
  ArrowLeft,
  Send,
  Pin
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function DiscussionDetail() {
  const [, params] = useRoute("/forums/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [replyContent, setReplyContent] = useState("");

  const discussionId = params?.id;

  const { data: discussion, isLoading: discussionLoading } = useQuery({
    queryKey: ["/api/forum/discussions", discussionId],
    queryFn: async () => {
      const response = await fetch(`/api/forum/discussions/${discussionId}`);
      if (!response.ok) throw new Error("Discussion not found");
      return response.json();
    },
    enabled: !!discussionId,
  });

  const replies = discussion?.replies || [];
  const repliesLoading = discussionLoading;

  const createReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("/api/forum/replies", "POST", {
        content,
        discussionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/discussions", discussionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/forum/discussions"] });
      setReplyContent("");
      toast({
        title: "Success",
        description: "Reply posted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post reply",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    createReplyMutation.mutate(replyContent);
  };

  const getAuthorInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  if (discussionLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading discussion...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!discussion) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <h2 className="text-2xl font-bold text-destructive mb-2">Discussion Not Found</h2>
              <p className="text-muted-foreground mb-4">The discussion you're looking for doesn't exist.</p>
              <Button onClick={() => setLocation("/forums")} data-testid="button-back-forums">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Forums
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/forums")}
          className="mb-6"
          data-testid="button-back-forums"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forums
        </Button>

        {/* Discussion Card */}
        <Card className="mb-6" data-testid="card-discussion">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={discussion.author?.profileImageUrl} alt="" />
                <AvatarFallback>
                  {getAuthorInitials(
                    discussion.author?.firstName,
                    discussion.author?.lastName,
                    discussion.author?.email
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold" data-testid="text-discussion-title">
                    {discussion.title}
                  </h1>
                  {discussion.isPinned && (
                    <Badge variant="secondary" className="gap-1" data-testid="badge-pinned">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <span data-testid="text-author-name">
                    {discussion.author?.firstName && discussion.author?.lastName
                      ? `${discussion.author.firstName} ${discussion.author.lastName}`
                      : discussion.author?.email}
                  </span>
                  {discussion.author?.title && (
                    <>
                      <span>•</span>
                      <span>{discussion.author.title}</span>
                    </>
                  )}
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                {discussion.category && (
                  <Badge className="mt-2" variant="outline" data-testid="badge-category">
                    {discussion.category.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="prose dark:prose-invert max-w-none mb-4" data-testid="text-discussion-content">
              <p className="whitespace-pre-wrap">{discussion.content}</p>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{discussion.likes || 0} likes</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span data-testid="text-reply-count">{discussion.replyCount || 0} replies</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reply Form */}
        {isAuthenticated && (
          <Card className="mb-6" data-testid="card-reply-form">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Post a Reply</h3>
              <Textarea
                placeholder="Share your thoughts..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="mb-3 min-h-[120px]"
                data-testid="textarea-reply"
              />
              <Button 
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || createReplyMutation.isPending}
                data-testid="button-submit-reply"
              >
                <Send className="h-4 w-4 mr-2" />
                {createReplyMutation.isPending ? "Posting..." : "Post Reply"}
              </Button>
            </CardContent>
          </Card>
        )}

        {!isAuthenticated && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-3">
                Please log in to reply to this discussion
              </p>
              <Button onClick={() => setLocation("/login")} data-testid="button-login">
                Log In
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Replies */}
        <div>
          <h2 className="text-xl font-bold mb-4">
            Replies ({replies?.length || 0})
          </h2>

          {repliesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : replies && replies.length > 0 ? (
            <div className="space-y-4">
              {replies.map((reply: any, index: number) => (
                <Card key={reply.id} data-testid={`card-reply-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={reply.author?.profileImageUrl} alt="" />
                        <AvatarFallback>
                          {getAuthorInitials(
                            reply.author?.firstName,
                            reply.author?.lastName,
                            reply.author?.email
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold" data-testid={`text-reply-author-${index}`}>
                            {reply.author?.firstName && reply.author?.lastName
                              ? `${reply.author.firstName} ${reply.author.lastName}`
                              : reply.author?.email}
                          </span>
                          {reply.author?.title && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">
                                {reply.author.title}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                        </p>
                        <p className="whitespace-pre-wrap" data-testid={`text-reply-content-${index}`}>
                          {reply.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <button className="flex items-center gap-1 hover:text-foreground transition">
                            <Heart className="h-3 w-3" />
                            <span>{reply.likes || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No replies yet. Be the first to reply!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
