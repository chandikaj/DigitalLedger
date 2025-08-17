import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  BookOpen, 
  Video, 
  ClipboardList, 
  Award,
  Clock,
  Star,
  Download,
  Filter
} from "lucide-react";

export default function Resources() {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: resources, isLoading } = useQuery({
    queryKey: ["/api/resources", selectedType, selectedCategory],
    queryFn: () => {
      let url = "/api/resources?limit=50";
      if (selectedType !== "all") url += `&type=${selectedType}`;
      if (selectedCategory !== "all") url += `&category=${selectedCategory}`;
      return fetch(url).then(res => res.json());
    },
  });

  const resourceTypes = [
    { id: "all", label: "All Resources", icon: <Filter className="h-4 w-4" /> },
    { id: "ebook", label: "eBooks & Guides", icon: <BookOpen className="h-4 w-4" /> },
    { id: "webinar", label: "Webinars", icon: <Video className="h-4 w-4" /> },
    { id: "case-study", label: "Case Studies", icon: <ClipboardList className="h-4 w-4" /> },
    { id: "certification", label: "Certifications", icon: <Award className="h-4 w-4" /> },
  ];

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "taxation", label: "Taxation" },
    { id: "financial-reporting", label: "Financial Reporting" },
    { id: "audit-automation", label: "Audit Automation" },
    { id: "ethical-ai", label: "Ethical AI" },
  ];

  const filteredResources = resources?.filter((resource: any) =>
    resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getTypeIcon = (type: string) => {
    const typeObj = resourceTypes.find(t => t.id === type);
    return typeObj?.icon || <BookOpen className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ebook":
        return "bg-primary/10 text-primary dark:bg-ai-teal/10 dark:text-ai-teal";
      case "webinar":
        return "bg-secondary/10 text-secondary dark:bg-ai-teal/10 dark:text-ai-teal";
      case "case-study":
        return "bg-accent/10 text-accent";
      case "certification":
        return "bg-ai-teal/10 text-ai-teal";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
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
        <div className="text-center mb-12" data-testid="resources-header">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Educational Resources
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
            Access comprehensive learning materials, case studies, and certification paths to advance your AI accounting expertise
          </p>
        </div>

        {/* Resource Type Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" data-testid="resource-stats">
          {resourceTypes.slice(1).map((type, index) => {
            const count = resources?.filter((r: any) => r.type === type.id).length || 0;
            return (
              <div key={type.id} className="text-center" data-testid={`stat-${type.id}`}>
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 ${getTypeColor(type.id)}`}>
                  {type.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{type.label}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                  Comprehensive {type.label.toLowerCase()} collection
                </p>
                <span className="text-primary dark:text-ai-teal font-medium text-sm">
                  {count} resources
                </span>
              </div>
            );
          })}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
          {/* Type Filters */}
          <div className="flex flex-wrap gap-2" data-testid="type-filters">
            {resourceTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type.id)}
                data-testid={`filter-type-${type.id}`}
                className="flex items-center space-x-2"
              >
                {type.icon}
                <span>{type.label}</span>
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-64">
            <Input
              type="search"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-resources"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8" data-testid="category-filters">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              data-testid={`filter-category-${category.id}`}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-16" data-testid="no-resources">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No resources found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="resources-grid">
            {filteredResources.map((resource: any) => (
              <Card key={resource.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300" data-testid={`resource-card-${resource.id}`}>
                <div className="aspect-video w-full overflow-hidden">
                  <img 
                    src={resource.imageUrl || `https://images.unsplash.com/photo-${
                      resource.type === 'ebook' ? '1481627834876-b7833e8f5570' :
                      resource.type === 'webinar' ? '1560472355-536de3962603' :
                      resource.type === 'certification' ? '1434030216411-0b793f4b4173' :
                      '1507003211169-0a1dd7228f2d'
                    }?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400`}
                    alt={resource.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge 
                      className={`capitalize ${getTypeColor(resource.type)}`}
                      data-testid={`type-${resource.id}`}
                    >
                      <span className="mr-1">{getTypeIcon(resource.type)}</span>
                      {resource.type?.replace('-', ' ') || 'Resource'}
                    </Badge>
                    {resource.isFree ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Free
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        Premium
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2" data-testid={`title-${resource.id}`}>
                    {resource.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3" data-testid={`description-${resource.id}`}>
                    {resource.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      {resource.duration && (
                        <span className="flex items-center space-x-1" data-testid={`duration-${resource.id}`}>
                          <Clock className="h-4 w-4" />
                          <span>{resource.duration}</span>
                        </span>
                      )}
                      {resource.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {resource.difficulty}
                        </Badge>
                      )}
                    </div>
                    
                    {resource.rating && resource.ratingCount > 0 && (
                      <div className="flex items-center space-x-1" data-testid={`rating-${resource.id}`}>
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">{resource.rating}</span>
                        <span className="text-sm text-gray-500">({resource.ratingCount})</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {resource.downloadCount > 0 && (
                        <span className="flex items-center space-x-1" data-testid={`downloads-${resource.id}`}>
                          <Download className="h-4 w-4" />
                          <span>{resource.downloadCount} downloads</span>
                        </span>
                      )}
                    </div>
                    
                    <Button 
                      className="text-primary dark:text-ai-teal hover:bg-primary/10 dark:hover:bg-ai-teal/10"
                      variant="ghost"
                      size="sm"
                      data-testid={`access-${resource.id}`}
                    >
                      {resource.type === 'webinar' ? 'Register' : 
                       resource.type === 'certification' ? 'Enroll' : 'Access'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredResources.length > 0 && filteredResources.length % 12 === 0 && (
          <div className="text-center mt-12">
            <Button 
              size="lg"
              variant="outline"
              data-testid="button-load-more-resources"
            >
              Load More Resources
            </Button>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 text-center bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white" data-testid="resources-cta">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Advance Your AI Accounting Skills
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Access our complete library of resources and start your journey towards becoming an AI accounting expert
          </p>
          <Button 
            size="lg"
            className="bg-white text-primary hover:bg-gray-100"
            data-testid="button-explore-certifications"
          >
            Explore Certification Programs
          </Button>
        </div>
      </div>
    </Layout>
  );
}
