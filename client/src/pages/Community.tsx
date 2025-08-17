import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Star, 
  Trophy, 
  Medal, 
  Crown,
  MessageSquare,
  BookOpen,
  Headphones,
  BarChart3,
  TrendingUp,
  Award,
  Brain,
  Target,
  Zap
} from "lucide-react";

export default function Community() {
  const [activeTab, setActiveTab] = useState("contributors");

  const { data: contributors } = useQuery({
    queryKey: ["/api/community/contributors"],
    queryFn: () => fetch("/api/community/contributors?limit=10").then(res => res.json()),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/community/stats"],
    queryFn: () => fetch("/api/community/stats").then(res => res.json()),
  });

  const { data: polls } = useQuery({
    queryKey: ["/api/polls"],
    queryFn: () => fetch("/api/polls").then(res => res.json()),
  });

  const votePoll = async (pollId: string, optionIndex: number) => {
    try {
      await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex }),
      });
      // Refresh polls data
      window.location.reload();
    } catch (error) {
      console.error('Error voting on poll:', error);
    }
  };

  const achievements = [
    {
      icon: <Star className="h-8 w-8" />,
      title: "First Post",
      description: "Welcome to the community",
      color: "bg-primary/10 text-primary dark:bg-ai-teal/10 dark:text-ai-teal"
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "Active Discussant",
      description: "50+ forum replies",
      color: "bg-secondary/10 text-secondary dark:bg-ai-teal/10 dark:text-ai-teal"
    },
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: "Knowledge Seeker",
      description: "10+ resources accessed",
      color: "bg-accent/10 text-accent"
    },
    {
      icon: <Trophy className="h-8 w-8" />,
      title: "Expert Contributor",
      description: "Top 1% contributors",
      color: "bg-ai-teal/10 text-ai-teal"
    }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-orange-400" />;
      default:
        return null;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      return `#${rank}`;
    }
    return null;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12" data-testid="community-header">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Community Spotlight
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
            Connect with fellow professionals, earn recognition for your contributions, and build your expertise network
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12" data-testid="community-stats">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-primary dark:text-ai-teal mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.activeMembers?.toLocaleString() || "0"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Members</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 text-secondary dark:text-ai-teal mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.discussionsThisWeek || "0"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.questionsAnswered || "0"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Answered</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-ai-teal mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.resourcesShared || "0"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Resources</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Headphones className="h-8 w-8 text-primary dark:text-ai-teal mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.podcastListeners || "0"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Listeners</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.certificationsEarned || "0"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Certified</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Top Contributors */}
            <section data-testid="top-contributors">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center flex items-center justify-center">
                  <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
                  Top Contributors This Month
                </h2>
                
                {contributors && contributors.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-8">
                    {contributors.slice(0, 3).map((contributor: any, index: number) => (
                      <div key={contributor.id} className="text-center" data-testid={`contributor-${index}`}>
                        <div className="relative inline-block mb-4">
                          <Avatar className="w-20 h-20 mx-auto">
                            <AvatarImage src={contributor.profileImageUrl} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl font-bold">
                              {contributor.firstName?.[0]}{contributor.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                            {getRankIcon(index + 1) || <span className="text-yellow-800 text-sm font-bold">#{index + 1}</span>}
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1" data-testid={`contributor-name-${index}`}>
                          {contributor.firstName} {contributor.lastName}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                          {contributor.title || "Community Member"}
                          {contributor.company && `, ${contributor.company}`}
                        </p>
                        <div className="flex justify-center space-x-2 mb-3">
                          {contributor.expertiseTags?.slice(0, 2).map((tag: string, tagIndex: number) => (
                            <Badge key={tagIndex} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center justify-center space-x-4">
                            <span>{contributor.points || 0} points</span>
                            <span className="flex items-center space-x-1">
                              <Star className="h-4 w-4" />
                              <span>Pro</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No contributors data available yet.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Community Poll */}
            {polls && polls.length > 0 && (
              <section data-testid="community-poll">
                <Card className="bg-gradient-to-br from-primary to-secondary text-white">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-6 text-center">Community Poll</h2>
                    <div className="max-w-2xl mx-auto">
                      <h3 className="text-xl font-semibold mb-6" data-testid="poll-question">
                        {polls[0].question}
                      </h3>
                      <div className="space-y-4">
                        {polls[0].options.map((option: any, index: number) => {
                          const percentage = polls[0].totalVotes > 0 
                            ? Math.round((option.votes / polls[0].totalVotes) * 100) 
                            : 0;
                          
                          return (
                            <Button
                              key={index}
                              variant="ghost"
                              className="w-full justify-between p-4 bg-white/10 hover:bg-white/20 text-white border-white/20"
                              onClick={() => votePoll(polls[0].id, index)}
                              data-testid={`poll-option-${index}`}
                            >
                              <span>{option.text}</span>
                              <div className="flex items-center space-x-3">
                                <div className="w-32 bg-white/20 rounded-full h-2">
                                  <div 
                                    className="bg-yellow-300 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{percentage}%</span>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                      <p className="text-center mt-6 text-blue-100">
                        {polls[0].totalVotes} members participated • 
                        {polls[0].expiresAt && new Date(polls[0].expiresAt) > new Date() && (
                          <span> Poll closes {new Date(polls[0].expiresAt).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Achievement Badges */}
            <Card data-testid="achievement-badges">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-primary dark:text-ai-teal" />
                  Achievement Badges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {achievements.map((achievement, index) => (
                    <div 
                      key={index} 
                      className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      data-testid={`achievement-${index}`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${achievement.color}`}>
                        {achievement.icon}
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                        {achievement.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {achievement.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card data-testid="leaderboard">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-primary dark:text-ai-teal" />
                  Monthly Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contributors && contributors.length > 0 ? (
                  <div className="space-y-3">
                    {contributors.slice(0, 5).map((contributor: any, index: number) => (
                      <div 
                        key={contributor.id} 
                        className="flex items-center space-x-3"
                        data-testid={`leaderboard-${index}`}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-semibold">
                          {index + 1}
                        </div>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={contributor.profileImageUrl} />
                          <AvatarFallback className="text-xs">
                            {contributor.firstName?.[0]}{contributor.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {contributor.firstName} {contributor.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {contributor.points || 0} points
                          </p>
                        </div>
                        {getRankIcon(index + 1)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No leaderboard data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engagement Tips */}
            <Card data-testid="engagement-tips">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-primary dark:text-ai-teal" />
                  Boost Your Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary dark:bg-ai-teal rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">Share Knowledge</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Answer questions in forums to earn points</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-secondary dark:bg-ai-teal rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">Create Content</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Share resources and start discussions</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">Stay Active</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Regular participation increases your rank</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-ai-teal rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">Help Others</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Quality contributions earn badges</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
