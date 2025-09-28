import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  PlayCircle, 
  Pause,
  Download, 
  Share,
  Heart,
  Headphones,
  Clock,
  Mic,
  Calendar
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

export default function Podcasts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(100);

  const { data: episodes, isLoading } = useQuery({
    queryKey: ["/api/podcasts"],
    queryFn: () => fetch("/api/podcasts?limit=50").then(res => res.json()),
  });

  const { data: featuredEpisode } = useQuery({
    queryKey: ["/api/podcasts/featured"],
    queryFn: () => fetch("/api/podcasts/featured").then(res => res.json()),
  });

  const filteredEpisodes = episodes?.filter((episode: any) =>
    episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    episode.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    episode.guestName?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handlePlayPause = (episodeId: string) => {
    if (currentlyPlaying === episodeId) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentlyPlaying(episodeId);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  const formatDuration = (minutes: string) => {
    const num = parseInt(minutes);
    if (isNaN(num)) return minutes;
    const hours = Math.floor(num / 60);
    const mins = num % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12" data-testid="podcast-header">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Gigital Ledger Podcast Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
            Listen to expert interviews, industry insights, and practical discussions about the future of AI in accounting
          </p>
        </div>

        {/* Featured Episode Player */}
        {featuredEpisode && (
          <Card className="mb-12" data-testid="featured-episode">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-8">
                <img 
                  src={featuredEpisode.imageUrl || "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"}
                  alt={featuredEpisode.title}
                  className="w-full lg:w-80 h-64 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="default" data-testid="featured-badge">Featured Episode</Badge>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      Episode {featuredEpisode.episodeNumber} • {formatDuration(featuredEpisode.duration || "45")}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4" data-testid="featured-title">
                    {featuredEpisode.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6" data-testid="featured-description">
                    {featuredEpisode.description}
                  </p>
                  
                  {/* Audio Player */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-4">
                      <Button 
                        size="icon" 
                        className="w-12 h-12 rounded-full"
                        onClick={() => handlePlayPause(featuredEpisode.id)}
                        data-testid="button-play-featured"
                      >
                        {currentlyPlaying === featuredEpisode.id && isPlaying ? (
                          <Pause className="h-6 w-6" />
                        ) : (
                          <PlayCircle className="h-6 w-6" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <Slider
                          value={[currentTime]}
                          max={duration}
                          step={1}
                          className="w-full mb-2"
                          onValueChange={(value) => setCurrentTime(value[0])}
                          data-testid="audio-progress"
                        />
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" data-testid="button-download-featured">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" data-testid="button-share-featured">
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Published {new Date(featuredEpisode.publishedAt).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Headphones className="h-4 w-4" />
                      <span>{featuredEpisode.playCount?.toLocaleString() || 0} plays</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span>{featuredEpisode.likes || 0} likes</span>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="flex justify-center mb-8">
          <div className="relative w-full max-w-md">
            <Input
              type="search"
              placeholder="Search episodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-episodes"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Recent Episodes */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {searchQuery ? `Search Results (${filteredEpisodes.length})` : "Recent Episodes"}
          </h2>
        </div>

        {filteredEpisodes.length === 0 ? (
          <div className="text-center py-16" data-testid="no-episodes">
            <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery ? "No episodes found matching your search." : "No episodes available yet."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="episodes-grid">
            {filteredEpisodes.map((episode: any) => (
              <Card key={episode.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300" data-testid={`episode-card-${episode.id}`}>
                <div className="aspect-video w-full overflow-hidden">
                  <img 
                    src={episode.imageUrl || "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"}
                    alt={episode.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" data-testid={`episode-number-${episode.id}`}>
                      Episode {episode.episodeNumber}
                    </Badge>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {formatDuration(episode.duration || "30")}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2" data-testid={`episode-title-${episode.id}`}>
                    {episode.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3" data-testid={`episode-description-${episode.id}`}>
                    {episode.description}
                  </p>
                  
                  {(episode.guestName || episode.hostName) && (
                    <div className="mb-4">
                      {episode.hostName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Host: {episode.hostName}
                        </p>
                      )}
                      {episode.guestName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Guest: {episode.guestName}
                          {episode.guestTitle && `, ${episode.guestTitle}`}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Headphones className="h-4 w-4" />
                        <span>{episode.playCount?.toLocaleString() || 0}</span>
                      </span>
                      <span>{new Date(episode.publishedAt).toLocaleDateString()}</span>
                    </div>
                    
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlayPause(episode.id)}
                      className="text-primary dark:text-ai-teal hover:bg-primary/10 dark:hover:bg-ai-teal/10"
                      data-testid={`listen-${episode.id}`}
                    >
                      {currentlyPlaying === episode.id && isPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Listen
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredEpisodes.length > 0 && filteredEpisodes.length % 12 === 0 && (
          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              size="lg"
              data-testid="button-load-more-episodes"
            >
              Load More Episodes
            </Button>
          </div>
        )}

        {/* Subscription CTA */}
        <div className="mt-16 bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white text-center" data-testid="subscription-cta">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Never Miss an Episode</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Subscribe to stay updated with the latest insights from industry leaders and AI accounting experts
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Button 
              className="bg-white text-primary hover:bg-gray-100 flex items-center justify-center space-x-2"
              data-testid="button-spotify"
            >
              <span>🎵</span>
              <span>Spotify</span>
            </Button>
            <Button 
              className="bg-white text-primary hover:bg-gray-100 flex items-center justify-center space-x-2"
              data-testid="button-apple"
            >
              <span>🍎</span>
              <span>Apple Podcasts</span>
            </Button>
            <Button 
              className="bg-white text-primary hover:bg-gray-100 flex items-center justify-center space-x-2"
              data-testid="button-google"
            >
              <span>🎧</span>
              <span>Google Podcasts</span>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
