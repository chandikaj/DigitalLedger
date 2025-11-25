import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Target, 
  Lightbulb, 
  BookOpen,
  TrendingUp,
  Handshake,
  Compass,
  Heart,
  Shield
} from "lucide-react";

export default function About() {
  return (
    <Layout>
      <div className="container mx-auto py-12 px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6" data-testid="text-about-title">
            About The Digital Ledger
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto" data-testid="text-about-subtitle">
            Empowering corporate finance and accounting professionals with insights, knowledge, and community.
          </p>
        </div>

        {/* Who We Are Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-who-we-are-title">
              Who We Are
            </h2>
          </div>
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-8 dark:from-primary/10 dark:to-secondary/10">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed" data-testid="text-who-we-are-p1">
              We are a group of motivated finance and accounting professionals who are passionate about 
              understanding the world around us — the markets, the profession, and the forces shaping the 
              future of corporate finance. We're naturally curious, always learning, and constantly exchanging 
              ideas about what truly matters today for anyone who wants to excel in this field.
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed" data-testid="text-who-we-are-p2">
              As knowledge-seekers and knowledge-sharers, we work together to analyze changing market 
              conditions, shifts in regulations, and emerging best practices. We collaborate with some of the 
              best minds in the industry, gather insights from diverse sources, and translate that into practical 
              understanding for our community.
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed" data-testid="text-who-we-are-p3">
              At our core, we're knowledge aggregators. We're driven by the desire to help not just ourselves, 
              but also our colleagues, our organizations, and the broader profession. Our goal is to give you a 
              clear window into the future — to help you see what's coming, navigate change with confidence, 
              and stay ahead in an environment that's evolving faster than ever.
            </p>
          </div>
        </section>

        {/* What We're Doing Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-what-we-do-title">
              What We're Doing
            </h2>
          </div>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed" data-testid="text-what-we-do-content">
                We're delivering information in a way that's easy to understand and straight to the point. We 
                summarize articles, research, and news into concise, digestible insights that matter to you 
                today. Our goal is to make sure you get relevant updates without any fluff, so you can stay 
                informed quickly and efficiently.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Why We're Doing It Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-why-we-do-title">
              Why We're Doing It
            </h2>
          </div>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <CardContent className="p-8">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed" data-testid="text-why-we-do-content">
                At The Digital Ledger, we believe that corporate finance and accounting professionals need a 
                dedicated, insightful space to stay informed. We're motivated by the idea of empowering you 
                with knowledge that helps you anticipate industry changes and grow in your profession. We're 
                also here to build a supportive community that thrives on shared insights and collaboration.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Who It's For Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Handshake className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-who-its-for-title">
              Who It's For
            </h2>
          </div>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed" data-testid="text-who-its-for-content">
                This platform is for corporate finance and accounting professionals working in corporations who 
                want to keep a pulse on industry trends and best practices. If you're looking to connect with 
                peers, share knowledge, and gain fresh insights, The Digital Ledger is for you.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Our Values Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-10" data-testid="text-values-title">
            Our Core Values
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="text-center hover:shadow-lg transition-shadow duration-300" data-testid="card-value-curiosity">
              <CardContent className="p-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                  <Compass className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Curiosity</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Always learning, always questioning, always growing.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300" data-testid="card-value-collaboration">
              <CardContent className="p-6">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Collaboration</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Working together to share insights and grow.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300" data-testid="card-value-excellence">
              <CardContent className="p-6">
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Excellence</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Delivering quality insights that help you excel.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300" data-testid="card-value-community">
              <CardContent className="p-6">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Community</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Building a supportive network of professionals.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300" data-testid="card-value-integrity">
              <CardContent className="p-6">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Integrity</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Upholding honesty, ethics, and trust in all we do.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gradient-to-r from-primary to-secondary rounded-2xl p-12 text-white" data-testid="cta-section">
          <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Connect with over 10,000 finance and accounting professionals who are shaping the future of the industry.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/news" className="inline-flex items-center justify-center gap-2 bg-white text-primary hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors" data-testid="link-explore-news">
              <BookOpen className="h-5 w-5" />
              Explore News
            </a>
            <a href="/podcasts" className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-8 py-3 rounded-lg font-semibold transition-colors border border-white/30" data-testid="link-listen-podcasts">
              Listen to Podcasts
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
}
