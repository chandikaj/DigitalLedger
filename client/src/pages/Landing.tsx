import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Users, 
  BookOpen, 
  Podcast, 
  MessageSquare, 
  TrendingUp,
  Shield,
  Award,
  Mic,
  PlayCircle,
  Heart,
  Share,
  MessageCircle
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const stats = [
    { value: "12,847", label: "Active Members" },
    { value: "2,341", label: "Expert Discussions" },
    { value: "156", label: "Podcast Episodes" },
    { value: "843", label: "Resources Shared" },
  ];

  const newsArticles = [
    {
      id: "1",
      title: "How Machine Learning is Revolutionizing Audit Procedures in 2024",
      excerpt: "New AI-powered audit tools are showing 94% accuracy in detecting financial anomalies, transforming traditional audit methodologies across major accounting firms.",
      category: "Automation",
      timeAgo: "2 hours ago",
      likes: 47,
      comments: 12,
      shares: 8,
      imageUrl: "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    },
    {
      id: "2",
      title: "New FASB Guidelines for AI-Generated Financial Reports",
      excerpt: "The Financial Accounting Standards Board releases new guidance on transparency requirements for AI-assisted financial reporting and disclosure obligations.",
      category: "Regulatory",
      timeAgo: "5 hours ago",
      likes: 73,
      comments: 31,
      shares: 15,
      imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    },
    {
      id: "3",
      title: "AI Fraud Detection Prevents $2.3B in Losses for Fortune 500 Companies",
      excerpt: "Latest industry report shows advanced AI algorithms successfully identified and prevented fraudulent transactions with 99.2% accuracy rate.",
      category: "Fraud Detection",
      timeAgo: "1 day ago",
      likes: 89,
      comments: 24,
      shares: 19,
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    },
  ];

  const forumCategories = [
    {
      icon: <Brain className="h-6 w-6" />,
      name: "AI Implementation",
      description: "Share experiences and best practices for implementing AI solutions in accounting workflows.",
      discussions: "1,247 discussions",
      latest: "2 minutes ago",
      color: "bg-primary/10 text-primary dark:bg-ai-teal/10 dark:text-ai-teal",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      name: "Regulatory Compliance",
      description: "Navigate evolving regulations and compliance requirements for AI in financial reporting.",
      discussions: "856 discussions",
      latest: "18 minutes ago",
      color: "bg-accent/10 text-accent",
    },
    {
      icon: <Award className="h-6 w-6" />,
      name: "Learning & Development",
      description: "Career growth, certification paths, and skill development in AI accounting technologies.",
      discussions: "624 discussions",
      latest: "35 minutes ago",
      color: "bg-secondary/10 text-secondary dark:bg-ai-teal/10 dark:text-ai-teal",
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-secondary to-ai-teal py-16 text-white" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6" data-testid="hero-title">
              Welcome to <span className="text-yellow-300">Digital Ledger</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-8" data-testid="hero-subtitle">
              Join 10,000+ accounting professionals, auditors, and AI practitioners shaping the industry's digital transformation
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-gray-100"
                onClick={() => setLocation("/login")}
                data-testid="button-join-community"
              >
                Join Community
              </Button>
            </div>
          </div>
          
          {/* Community Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center" data-testid={`stat-${index}`}>
                <div className="text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-blue-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 bg-white dark:bg-dark-bg" data-testid="news-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="news-title">
                Latest AI in Accounting News
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl">
                Stay updated with curated insights from trusted sources, academic journals, and industry leaders
              </p>
            </div>
            
            {/* News Filters */}
            <div className="flex flex-wrap gap-2 mt-6 lg:mt-0">
              <Badge variant="default" data-testid="filter-all">All</Badge>
              <Badge variant="secondary" data-testid="filter-automation">Automation</Badge>
              <Badge variant="secondary" data-testid="filter-fraud">Fraud Detection</Badge>
              <Badge variant="secondary" data-testid="filter-regulatory">Regulatory</Badge>
              <Badge variant="secondary" data-testid="filter-ai">Generative AI</Badge>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsArticles.map((article) => (
              <Card key={article.id} className="hover:shadow-md transition-shadow" data-testid={`news-card-${article.id}`}>
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                  <img 
                    src={article.imageUrl} 
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" data-testid={`category-${article.id}`}>
                      {article.category}
                    </Badge>
                    <span className="text-gray-500 dark:text-gray-400 text-sm" data-testid={`time-${article.id}`}>
                      {article.timeAgo}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2" data-testid={`title-${article.id}`}>
                    {article.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3" data-testid={`excerpt-${article.id}`}>
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <button className="flex items-center space-x-1 hover:text-primary dark:hover:text-ai-teal" data-testid={`like-${article.id}`}>
                        <Heart className="h-4 w-4" />
                        <span>{article.likes}</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-primary dark:hover:text-ai-teal" data-testid={`comment-${article.id}`}>
                        <MessageCircle className="h-4 w-4" />
                        <span>{article.comments}</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-primary dark:hover:text-ai-teal" data-testid={`share-${article.id}`}>
                        <Share className="h-4 w-4" />
                        <span>{article.shares}</span>
                      </button>
                    </div>
                    <span className="text-sm font-medium text-primary dark:text-ai-teal" data-testid={`read-more-${article.id}`}>
                      Read More
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              className="bg-primary hover:bg-blue-700 text-white"
              data-testid="button-load-more-news"
            >
              Load More Articles
            </Button>
          </div>
        </div>
      </section>

      {/* Forum Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900" data-testid="forum-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="forum-title">
              Community Forums
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
              Engage with fellow professionals, share insights, and get answers to your AI accounting challenges
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forumCategories.map((category, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow" data-testid={`forum-category-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${category.color}`}>
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid={`category-name-${index}`}>
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400" data-testid={`category-discussions-${index}`}>
                        {category.discussions}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4" data-testid={`category-description-${index}`}>
                    {category.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400" data-testid={`category-latest-${index}`}>
                      Latest: {category.latest}
                    </span>
                    <span className="text-primary dark:text-ai-teal font-medium" data-testid={`category-join-${index}`}>
                      Join Discussion →
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Podcast Section */}
      <section className="py-16 bg-white dark:bg-dark-bg" data-testid="podcast-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="podcast-title">
              Digital Ledger Podcast Hub
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
              Listen to expert interviews, industry insights, and practical discussions about the future of AI in accounting
            </p>
          </div>

          {/* Featured Episode */}
          <Card className="mb-12" data-testid="featured-podcast">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-8">
                <img 
                  src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                  alt="Featured podcast episode"
                  className="w-full lg:w-80 h-64 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="default" data-testid="featured-badge">Featured Episode</Badge>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Episode 142 • 45 min</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4" data-testid="featured-title">
                    The Future of AI Auditing with Sarah Martinez, Partner at Deloitte
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6" data-testid="featured-description">
                    Sarah discusses how machine learning is transforming audit procedures, shares real-world implementation challenges, and provides insights into the next decade of AI-powered auditing.
                  </p>
                  
                  {/* Audio Player */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-4">
                      <Button size="icon" className="w-12 h-12 rounded-full" data-testid="button-play-podcast">
                        <PlayCircle className="h-6 w-6" />
                      </Button>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: "35%" }}></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>15:42</span>
                          <span>45:08</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                    <span>Published Dec 8, 2024</span>
                    <span>12,847 plays</span>
                    <span>234 likes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-secondary text-white" data-testid="cta-section">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" data-testid="cta-title">
            Ready to Transform Your Accounting Practice?
          </h2>
          <p className="text-xl text-blue-100 mb-8" data-testid="cta-description">
            Join thousands of professionals already using AI to revolutionize their accounting workflows
          </p>
          <Button 
            size="lg"
            className="bg-white text-primary hover:bg-gray-100"
            onClick={() => setLocation("/login")}
            data-testid="button-get-started"
          >
            Get Started Today
          </Button>
        </div>
      </section>
    </Layout>
  );
}
