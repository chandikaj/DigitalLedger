import { db } from "./db";
import {
  newsArticles,
  podcastEpisodes,
  forumCategories,
  forumDiscussions,
  forumReplies,
  resources,
  users,
} from "@shared/schema";
import { sql, notInArray } from "drizzle-orm";

export async function clearSeedData() {
  console.log("Clearing seed data from database...");
  
  try {
    // Delete seed data in correct order to respect foreign key constraints
    const adminEmails = ['admin@admin.com', 'admin@example.com', 'testuser@example.com'];
    
    // Delete forum data (child tables first)
    await db.delete(forumReplies);
    console.log("✓ Cleared forum replies");
    
    await db.delete(forumDiscussions);
    console.log("✓ Cleared forum discussions");
    
    await db.delete(forumCategories);
    console.log("✓ Cleared forum categories");
    
    // Delete news and content
    await db.delete(newsArticles);
    console.log("✓ Cleared news articles");
    
    await db.delete(podcastEpisodes);
    console.log("✓ Cleared podcast episodes");
    
    await db.delete(resources);
    console.log("✓ Cleared resources");
    
    // Delete non-admin users last
    await db.delete(users).where(notInArray(users.email, adminEmails));
    console.log("✓ Cleared seed users (kept admin accounts)");
    
    return { success: true, message: "Seed data cleared successfully" };
  } catch (error) {
    console.error("Error clearing seed data:", error);
    throw error;
  }
}

export async function seedDatabase(force: boolean = false) {
  console.log("Starting database seeding...");
  
  try {
    if (force) {
      console.log("Force flag enabled. Clearing existing seed data...");
      await clearSeedData();
    } else {
      // Check if database already has seed data
      const existingUsers = await db.select().from(users).limit(15);
      const existingNews = await db.select().from(newsArticles).limit(5);
      const existingPodcasts = await db.select().from(podcastEpisodes).limit(5);
      const existingResources = await db.select().from(resources).limit(5);
      const existingCategories = await db.select().from(forumCategories).limit(3);
      const existingDiscussions = await db.select().from(forumDiscussions).limit(5);

      if (existingUsers.length > 5 || existingNews.length > 3 || existingPodcasts.length > 3 || existingDiscussions.length > 3) {
        console.log("Database already contains significant seed data. Skipping seeding to avoid duplicates.");
        return { 
          success: true, 
          message: "Database already contains seed data. Use force option to rebuild.", 
          alreadySeeded: true 
        };
      }
    }

    console.log("Proceeding with fresh seeding...");

    const contributorUsers = [
      {
        id: sql`gen_random_uuid()`,
        email: "sarah.mitchell@example.com",
        firstName: "Sarah",
        lastName: "Mitchell",
        role: "user",
        title: "Senior Tax Manager",
        company: "Deloitte",
        profileImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Tax Automation', 'AI Integration']`,
        bio: "Leading AI-powered tax automation initiatives at Deloitte. 15+ years in tax consulting.",
        points: 2847,
        badges: sql`ARRAY['AI Pioneer', 'Top Contributor']`,
        isActive: true,
      },
      {
        id: sql`gen_random_uuid()`,
        email: "james.rodriguez@example.com",
        firstName: "James",
        lastName: "Rodriguez",
        role: "user",
        title: "Chief Audit Technology Officer",
        company: "KPMG",
        profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Audit Analytics', 'Machine Learning']`,
        bio: "Championing ML-driven audit procedures across KPMG's global network.",
        points: 2654,
        badges: sql`ARRAY['Innovator', 'Expert Badge']`,
        isActive: true,
      },
      {
        id: sql`gen_random_uuid()`,
        email: "emily.chen@example.com",
        firstName: "Emily",
        lastName: "Chen",
        role: "user",
        title: "AI Research Director",
        company: "PwC",
        profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Natural Language Processing', 'Financial Analysis']`,
        bio: "Developing NLP solutions for financial document analysis and compliance checking.",
        points: 2531,
        badges: sql`ARRAY['Research Leader', 'AI Champion']`,
        isActive: true,
      },
      {
        id: sql`gen_random_uuid()`,
        email: "michael.oconnor@example.com",
        firstName: "Michael",
        lastName: "O'Connor",
        role: "user",
        title: "Partner, Advisory Services",
        company: "EY",
        profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Blockchain', 'Smart Contracts']`,
        bio: "Blockchain and smart contract specialist advising on audit automation and transparency.",
        points: 2398,
        badges: sql`ARRAY['Blockchain Expert']`,
        isActive: true,
      },
      {
        id: sql`gen_random_uuid()`,
        email: "priya.sharma@example.com",
        firstName: "Priya",
        lastName: "Sharma",
        role: "user",
        title: "Forensic Accounting Lead",
        company: "Grant Thornton",
        profileImageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Fraud Detection', 'Data Analytics']`,
        bio: "Using AI to detect sophisticated fraud patterns in financial transactions.",
        points: 2276,
        badges: sql`ARRAY['Fraud Fighter', 'Data Wizard']`,
        isActive: true,
      },
      {
        id: sql`gen_random_uuid()`,
        email: "david.kim@example.com",
        firstName: "David",
        lastName: "Kim",
        role: "user",
        title: "Technology Risk Manager",
        company: "BDO",
        profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Cybersecurity', 'Risk Management']`,
        bio: "Implementing AI-driven risk assessment frameworks for emerging technologies.",
        points: 2103,
        badges: sql`ARRAY['Security Pro']`,
        isActive: true,
      },
      {
        id: sql`gen_random_uuid()`,
        email: "lisa.thompson@example.com",
        firstName: "Lisa",
        lastName: "Thompson",
        role: "user",
        title: "Controller",
        company: "Tesla",
        profileImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Financial Reporting', 'Process Automation']`,
        bio: "Transforming month-end close processes with AI automation at a Fortune 500 company.",
        points: 1987,
        badges: sql`ARRAY['Process Master']`,
        isActive: true,
      },
      {
        id: sql`gen_random_uuid()`,
        email: "robert.williams@example.com",
        firstName: "Robert",
        lastName: "Williams",
        role: "user",
        title: "AI Solutions Architect",
        company: "Accenture",
        profileImageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Cloud Computing', 'AI Architecture']`,
        bio: "Designing scalable AI solutions for finance and accounting transformations.",
        points: 1845,
        badges: sql`ARRAY['Cloud Expert', 'Architect']`,
        isActive: true,
      },
      {
        id: sql`gen_random_uuid()`,
        email: "angela.martinez@example.com",
        firstName: "Angela",
        lastName: "Martinez",
        role: "user",
        title: "VP of Finance Technology",
        company: "Amazon",
        profileImageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Digital Transformation', 'Change Management']`,
        bio: "Leading finance tech initiatives and AI adoption strategies at scale.",
        points: 1723,
        badges: sql`ARRAY['Transformation Leader']`,
        isActive: true,
      },
      {
        id: sql`gen_random_uuid()`,
        email: "thomas.anderson@example.com",
        firstName: "Thomas",
        lastName: "Anderson",
        role: "user",
        title: "Managing Director",
        company: "RSM",
        profileImageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        expertiseTags: sql`ARRAY['Strategic Planning', 'AI Ethics']`,
        bio: "Guiding mid-market firms through ethical AI adoption in accounting practices.",
        points: 1598,
        badges: sql`ARRAY['Ethics Champion']`,
        isActive: true,
      },
    ];

    await db.insert(users).values(contributorUsers);
    console.log("✓ Seeded community contributors");

    const newsData = [
      {
        title: "How Machine Learning is Revolutionizing Audit Procedures in 2024",
        content: "New AI-powered audit tools are showing 94% accuracy in detecting financial anomalies, transforming traditional audit methodologies across major accounting firms. Machine learning algorithms are now capable of analyzing thousands of transactions in minutes, identifying patterns that would take human auditors weeks to discover.",
        excerpt: "New AI-powered audit tools are showing 94% accuracy in detecting financial anomalies, transforming traditional audit methodologies across major accounting firms.",
        category: "Automation",
        imageUrl: "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/ml-audit-revolution",
        authorName: "Jennifer Lawrence",
        isPublished: true,
        isFeatured: true,
      },
      {
        title: "New FASB Guidelines for AI-Generated Financial Reports",
        content: "The Financial Accounting Standards Board releases new guidance on transparency requirements for AI-assisted financial reporting and disclosure obligations. These guidelines aim to ensure stakeholders understand when and how AI is used in preparing financial statements.",
        excerpt: "The Financial Accounting Standards Board releases new guidance on transparency requirements for AI-assisted financial reporting and disclosure obligations.",
        category: "Regulatory",
        imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/fasb-ai-guidelines",
        authorName: "Michael Chen",
        isPublished: true,
        isFeatured: true,
      },
      {
        title: "AI Fraud Detection Prevents $2.3B in Losses for Fortune 500 Companies",
        content: "Latest industry report shows advanced AI algorithms successfully identified and prevented fraudulent transactions with 99.2% accuracy rate. The technology combines behavioral analytics, pattern recognition, and real-time monitoring to detect anomalies.",
        excerpt: "Latest industry report shows advanced AI algorithms successfully identified and prevented fraudulent transactions with 99.2% accuracy rate.",
        category: "Fraud Detection",
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/ai-fraud-prevention",
        authorName: "Sarah Johnson",
        isPublished: true,
        isFeatured: false,
      },
      {
        title: "GPT-4 Integration in Tax Software Reduces Prep Time by 60%",
        content: "Major tax preparation platforms report dramatic efficiency gains after integrating OpenAI's GPT-4 for document analysis and tax code interpretation. Early adopters are seeing significant reductions in time spent on routine tax filings.",
        excerpt: "Major tax preparation platforms report dramatic efficiency gains after integrating OpenAI's GPT-4 for document analysis and tax code interpretation.",
        category: "Generative AI",
        imageUrl: "https://images.unsplash.com/photo-1633265486064-086b219458ec?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/gpt4-tax-software",
        authorName: "David Martinez",
        isPublished: true,
        isFeatured: false,
      },
      {
        title: "Automated Reconciliation Systems Save Big Four Firms 100,000 Hours Annually",
        content: "Industry analysis reveals that AI-powered reconciliation systems deployed across the Big Four accounting firms are saving approximately 100,000 collective hours per year, allowing accountants to focus on higher-value advisory work.",
        excerpt: "Industry analysis reveals that AI-powered reconciliation systems deployed across the Big Four accounting firms are saving approximately 100,000 collective hours per year.",
        category: "Automation",
        imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/automated-reconciliation",
        authorName: "Emily Rodriguez",
        isPublished: true,
        isFeatured: false,
      },
      {
        title: "SEC Proposes New Rules for AI Use in Financial Disclosures",
        content: "The Securities and Exchange Commission has announced proposed regulations requiring companies to disclose their use of artificial intelligence in preparing financial statements and conducting internal audits.",
        excerpt: "The Securities and Exchange Commission has announced proposed regulations requiring companies to disclose their use of artificial intelligence in preparing financial statements.",
        category: "Regulatory",
        imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/sec-ai-rules",
        authorName: "Robert Thompson",
        isPublished: true,
        isFeatured: false,
      },
      {
        title: "Neural Networks Detect Complex Money Laundering Schemes",
        content: "Advanced neural network systems are now capable of identifying sophisticated money laundering patterns across multiple jurisdictions, helping financial institutions comply with AML regulations more effectively.",
        excerpt: "Advanced neural network systems are now capable of identifying sophisticated money laundering patterns across multiple jurisdictions.",
        category: "Fraud Detection",
        imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/neural-aml",
        authorName: "Lisa Wang",
        isPublished: true,
        isFeatured: false,
      },
      {
        title: "ChatGPT Plugins Transform Client Communication for Small CPA Firms",
        content: "Small to mid-size CPA firms are leveraging ChatGPT plugins to automate routine client inquiries, schedule meetings, and provide instant answers to common tax questions, improving client satisfaction scores by 45%.",
        excerpt: "Small to mid-size CPA firms are leveraging ChatGPT plugins to automate routine client inquiries and provide instant answers to common tax questions.",
        category: "Generative AI",
        imageUrl: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/chatgpt-cpa-firms",
        authorName: "Amanda Foster",
        isPublished: true,
        isFeatured: false,
      },
      {
        title: "Robotic Process Automation Handles 80% of Accounts Payable Tasks",
        content: "New data shows that RPA bots are now handling the majority of routine accounts payable processes, including invoice processing, payment authorization, and vendor communications, with error rates below 0.1%.",
        excerpt: "New data shows that RPA bots are now handling the majority of routine accounts payable processes with error rates below 0.1%.",
        category: "Automation",
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/rpa-accounts-payable",
        authorName: "Christopher Lee",
        isPublished: true,
        isFeatured: false,
      },
      {
        title: "PCAOB Issues Guidance on AI Auditor Independence Requirements",
        content: "The Public Company Accounting Oversight Board has released comprehensive guidance on maintaining auditor independence when using AI tools, addressing concerns about algorithmic bias and data privacy.",
        excerpt: "The Public Company Accounting Oversight Board has released comprehensive guidance on maintaining auditor independence when using AI tools.",
        category: "Regulatory",
        imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/pcaob-ai-guidance",
        authorName: "Patricia O'Brien",
        isPublished: true,
        isFeatured: false,
      },
      {
        title: "Predictive Analytics Identify High-Risk Audit Areas with 91% Accuracy",
        content: "Cutting-edge predictive analytics platforms are helping auditors identify high-risk areas before fieldwork begins, significantly improving audit efficiency and effectiveness while reducing overall costs.",
        excerpt: "Cutting-edge predictive analytics platforms are helping auditors identify high-risk areas before fieldwork begins with 91% accuracy.",
        category: "Fraud Detection",
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        sourceUrl: "https://example.com/predictive-audit-analytics",
        authorName: "Mark Stevens",
        isPublished: true,
        isFeatured: false,
      },
    ];

    await db.insert(newsArticles).values(newsData);
    console.log("✓ Seeded news articles");

    const podcastData = [
      {
        episodeNumber: 3,
        title: "The Future of AI in Tax Compliance",
        description: "Dr. Michael Roberts from Deloitte discusses how AI is transforming tax compliance, from automated return preparation to real-time tax position analysis.",
        duration: "42:18",
        audioUrl: "https://example.com/podcast-3.mp3",
        imageUrl: "https://images.unsplash.com/photo-1590650153855-d9e808231d41?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "Dr. Michael Roberts",
        guestTitle: "Director of Tax Innovation, Deloitte",
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        playCount: 1247,
        likes: 89,
        isFeatured: true,
      },
      {
        episodeNumber: 4,
        title: "Blockchain Auditing: AI-Powered Verification",
        description: "Jennifer Wu, Chief Blockchain Officer at PwC, shares insights on using AI to audit blockchain transactions and smart contracts.",
        duration: "38:45",
        audioUrl: "https://example.com/podcast-4.mp3",
        imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "Jennifer Wu",
        guestTitle: "Chief Blockchain Officer, PwC",
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        playCount: 892,
        likes: 67,
        isFeatured: false,
      },
      {
        episodeNumber: 5,
        title: "ChatGPT in the Accounting Firm: Real Stories",
        description: "Managing Partner David Martinez shares practical experiences implementing ChatGPT and GPT-4 in a mid-sized accounting firm.",
        duration: "51:22",
        audioUrl: "https://example.com/podcast-5.mp3",
        imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "David Martinez",
        guestTitle: "Managing Partner, Martinez & Associates",
        publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        playCount: 1534,
        likes: 112,
        isFeatured: false,
      },
      {
        episodeNumber: 6,
        title: "Fraud Detection 2.0: Machine Learning in Action",
        description: "Forensic accountant Lisa Morgan demonstrates how machine learning models are catching fraud that traditional methods miss.",
        duration: "44:15",
        audioUrl: "https://example.com/podcast-6.mp3",
        imageUrl: "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "Lisa Morgan",
        guestTitle: "Lead Forensic Accountant, Grant Thornton",
        publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        playCount: 1109,
        likes: 78,
        isFeatured: false,
      },
      {
        episodeNumber: 7,
        title: "AI Ethics in Accounting: Drawing the Line",
        description: "Professor Amanda Foster discusses the ethical implications of AI in accounting and where we should draw boundaries.",
        duration: "47:30",
        audioUrl: "https://example.com/podcast-7.mp3",
        imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "Prof. Amanda Foster",
        guestTitle: "Chair of Accounting Ethics, MIT",
        publishedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
        playCount: 967,
        likes: 84,
        isFeatured: false,
      },
      {
        episodeNumber: 8,
        title: "Natural Language Processing for Financial Documents",
        description: "AI researcher Dr. Kevin Park explains how NLP is revolutionizing financial document analysis and contract review.",
        duration: "40:55",
        audioUrl: "https://example.com/podcast-8.mp3",
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "Dr. Kevin Park",
        guestTitle: "AI Research Lead, KPMG Labs",
        publishedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        playCount: 834,
        likes: 61,
        isFeatured: false,
      },
      {
        episodeNumber: 9,
        title: "Automating Month-End Close: Best Practices",
        description: "Controller Rachel Green shares her journey automating the month-end close process using AI and RPA.",
        duration: "36:42",
        audioUrl: "https://example.com/podcast-9.mp3",
        imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "Rachel Green",
        guestTitle: "Corporate Controller, Microsoft",
        publishedAt: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000),
        playCount: 1223,
        likes: 95,
        isFeatured: false,
      },
      {
        episodeNumber: 10,
        title: "Will AI Replace Accountants? The Real Answer",
        description: "Industry leaders debate the future of the accounting profession in an AI-driven world.",
        duration: "53:18",
        audioUrl: "https://example.com/podcast-10.mp3",
        imageUrl: "https://images.unsplash.com/photo-1560472355-109703aa3edc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "Panel Discussion",
        guestTitle: "Industry Leaders from Big Four",
        publishedAt: new Date(Date.now() - 49 * 24 * 60 * 60 * 1000),
        playCount: 2156,
        likes: 187,
        isFeatured: false,
      },
      {
        episodeNumber: 11,
        title: "Real-Time Financial Reporting with AI",
        description: "CFO James Patterson discusses implementing AI for continuous accounting and real-time financial insights.",
        duration: "45:27",
        audioUrl: "https://example.com/podcast-11.mp3",
        imageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "James Patterson",
        guestTitle: "CFO, Shopify",
        publishedAt: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000),
        playCount: 1378,
        likes: 103,
        isFeatured: false,
      },
      {
        episodeNumber: 12,
        title: "AI for Small Accounting Practices",
        description: "Solo practitioner Maria Gonzalez shares affordable AI tools and strategies for small firms to compete with larger practices.",
        duration: "39:12",
        audioUrl: "https://example.com/podcast-12.mp3",
        imageUrl: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        hostName: "Sarah Chen",
        guestName: "Maria Gonzalez",
        guestTitle: "CPA, Small Practice Owner",
        publishedAt: new Date(Date.now() - 63 * 24 * 60 * 60 * 1000),
        playCount: 1645,
        likes: 134,
        isFeatured: false,
      },
    ];

    await db.insert(podcastEpisodes).values(podcastData);
    console.log("✓ Seeded podcast episodes");

    const resourcesData = [
      {
        title: "Complete Guide to AI in Financial Reporting",
        description: "Comprehensive 120-page guide covering AI applications in financial reporting, from automation to predictive analytics.",
        type: "Guide",
        category: "Financial Reporting",
        fileUrl: "https://example.com/resources/ai-financial-reporting-guide.pdf",
        thumbnailUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Digital Ledger Team",
        downloadCount: 2347,
        rating: 5,
        isPublished: true,
      },
      {
        title: "Machine Learning for Auditors Video Course",
        description: "8-hour video course teaching auditors how to leverage machine learning in audit procedures.",
        type: "Video",
        category: "Audit",
        fileUrl: "https://example.com/resources/ml-auditors-course",
        thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Prof. James Wilson",
        downloadCount: 1876,
        rating: 5,
        isPublished: true,
      },
      {
        title: "Tax Automation Templates and Scripts",
        description: "Ready-to-use Python scripts and templates for automating common tax preparation tasks.",
        type: "Template",
        category: "Tax",
        fileUrl: "https://example.com/resources/tax-automation-templates.zip",
        thumbnailUrl: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Michael Chen",
        downloadCount: 1654,
        rating: 5,
        isPublished: true,
      },
      {
        title: "AI Ethics Framework for Accountants",
        description: "Ethical guidelines and decision-making framework for implementing AI in accounting practices.",
        type: "Guide",
        category: "Ethics",
        fileUrl: "https://example.com/resources/ai-ethics-framework.pdf",
        thumbnailUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Ethics Committee",
        downloadCount: 1432,
        rating: 5,
        isPublished: true,
      },
      {
        title: "Fraud Detection Algorithm Case Studies",
        description: "Real-world case studies of successful AI fraud detection implementations.",
        type: "Case Study",
        category: "Fraud Detection",
        fileUrl: "https://example.com/resources/fraud-detection-cases.pdf",
        thumbnailUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Lisa Morgan",
        downloadCount: 1287,
        rating: 5,
        isPublished: true,
      },
      {
        title: "ChatGPT Prompts for Accountants",
        description: "Collection of 200+ optimized ChatGPT prompts for accounting tasks and client communication.",
        type: "Template",
        category: "AI Tools",
        fileUrl: "https://example.com/resources/chatgpt-prompts.pdf",
        thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Digital Ledger Community",
        downloadCount: 2156,
        rating: 5,
        isPublished: true,
      },
      {
        title: "RPA Implementation Roadmap",
        description: "Step-by-step guide to implementing robotic process automation in accounting workflows.",
        type: "Guide",
        category: "Automation",
        fileUrl: "https://example.com/resources/rpa-roadmap.pdf",
        thumbnailUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Robert Williams",
        downloadCount: 1543,
        rating: 5,
        isPublished: true,
      },
      {
        title: "AI Regulatory Compliance Checklist",
        description: "Comprehensive checklist for ensuring AI implementations meet regulatory requirements.",
        type: "Tool",
        category: "Compliance",
        fileUrl: "https://example.com/resources/ai-compliance-checklist.pdf",
        thumbnailUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Compliance Team",
        downloadCount: 1398,
        rating: 5,
        isPublished: true,
      },
      {
        title: "Webinar: AI in Month-End Close",
        description: "Recorded webinar on automating month-end close processes with AI and best practices.",
        type: "Video",
        category: "Financial Reporting",
        fileUrl: "https://example.com/resources/month-end-webinar",
        thumbnailUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Rachel Green",
        downloadCount: 987,
        rating: 5,
        isPublished: true,
      },
      {
        title: "Natural Language Processing Toolkit",
        description: "Open-source toolkit for analyzing financial documents using NLP.",
        type: "Tool",
        category: "AI Tools",
        fileUrl: "https://example.com/resources/nlp-toolkit.zip",
        thumbnailUrl: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Dr. Kevin Park",
        downloadCount: 743,
        rating: 5,
        isPublished: true,
      },
      {
        title: "Blockchain Audit Procedures Manual",
        description: "Detailed manual covering audit procedures for blockchain-based transactions.",
        type: "Guide",
        category: "Blockchain",
        fileUrl: "https://example.com/resources/blockchain-audit-manual.pdf",
        thumbnailUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Jennifer Wu",
        downloadCount: 856,
        rating: 5,
        isPublished: true,
      },
      {
        title: "Small Firm AI Adoption Strategy",
        description: "Practical strategies and affordable tools for small accounting firms to adopt AI.",
        type: "Guide",
        category: "Practice Management",
        fileUrl: "https://example.com/resources/small-firm-ai-strategy.pdf",
        thumbnailUrl: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        authorName: "Maria Gonzalez",
        downloadCount: 1234,
        rating: 5,
        isPublished: true,
      },
    ];

    await db.insert(resources).values(resourcesData);
    console.log("✓ Seeded resources");

    const categoriesData = [
      {
        name: "AI Implementation",
        description: "Share experiences and best practices for implementing AI solutions in accounting workflows.",
        slug: "ai-implementation",
        color: "#3B82F6",
      },
      {
        name: "Regulatory Compliance",
        description: "Navigate evolving regulations and compliance requirements for AI in financial reporting.",
        slug: "regulatory-compliance",
        color: "#8B5CF6",
      },
      {
        name: "Learning & Development",
        description: "Career growth, certification paths, and skill development in AI accounting technologies.",
        slug: "learning-development",
        color: "#06B6D4",
      },
    ];

    await db.insert(forumCategories).values(categoriesData);
    console.log("✓ Seeded forum categories");

    // Get created users and categories for foreign keys
    const seededUsers = await db.select().from(users).limit(15);
    const seededCategories = await db.select().from(forumCategories);

    // Create forum discussions
    const discussionsData = [
      {
        title: "Best practices for implementing GPT-4 in tax preparation workflows",
        content: "Our firm is considering integrating GPT-4 into our tax preparation process, specifically for document analysis and initial review. Has anyone successfully implemented this? What challenges did you face, and what safeguards did you put in place to ensure accuracy?\n\nI'm particularly interested in:\n- How you handle client data privacy\n- What types of tasks you've automated\n- How you validate AI-generated outputs\n- Any compliance considerations we should be aware of\n\nWould love to hear real-world experiences!",
        categoryId: seededCategories[0]?.id,
        authorId: seededUsers[0]?.id,
        isPinned: true,
        replyCount: 8,
        likes: 24,
        lastReplyAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Machine Learning model accuracy: How much is enough for audit sampling?",
        content: "I've been working on a ML model for selecting audit samples based on risk factors. Currently achieving 87% accuracy in identifying high-risk transactions. Is this acceptable for production use, or should I be aiming higher?\n\nContext: Mid-sized manufacturing clients, testing population of ~50K transactions annually.\n\nWhat accuracy rates are others seeing in similar applications?",
        categoryId: seededCategories[0]?.id,
        authorId: seededUsers[1]?.id,
        replyCount: 12,
        likes: 31,
        lastReplyAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: "RPA vs. AI: When to use which for AP automation?",
        content: "I'm mapping out an automation strategy for our accounts payable department. Trying to decide between traditional RPA tools and newer AI-powered solutions.\n\nFrom what I understand:\n- RPA is great for structured, repetitive tasks\n- AI handles unstructured data and decision-making better\n\nBut what about the cost-benefit analysis? AI seems more expensive upfront. Has anyone done a comparison?",
        categoryId: seededCategories[0]?.id,
        authorId: seededUsers[2]?.id,
        replyCount: 6,
        likes: 18,
        lastReplyAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        title: "SEC's new AI disclosure requirements - Implementation timeline?",
        content: "With the SEC's proposed rules on AI disclosure in financial statements, I'm trying to get ahead of compliance. The rules seem to require disclosure of:\n\n1. Which AI systems are used in financial reporting\n2. Level of human oversight\n3. Risk assessments\n\nHas anyone started documenting their AI usage for this purpose? What format are you using?",
        categoryId: seededCategories[1]?.id,
        authorId: seededUsers[3]?.id,
        isPinned: true,
        replyCount: 15,
        likes: 42,
        lastReplyAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        title: "PCAOB guidance on AI and auditor independence",
        content: "The recent PCAOB guidance has me concerned about our firm's AI tools. Specifically, there's a section about ensuring the AI doesn't compromise auditor independence.\n\nKey concern: If we use a client's data to train our AI models, does that create an independence issue?\n\nAnyone else navigating this?",
        categoryId: seededCategories[1]?.id,
        authorId: seededUsers[4]?.id,
        replyCount: 9,
        likes: 27,
        lastReplyAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        title: "International AI regulations: GDPR vs. US approach",
        content: "Our firm has clients in both the EU and US. The regulatory approaches to AI seem very different. GDPR has strict requirements around algorithmic decision-making and data processing.\n\nHow are you handling cross-border compliance? Do you use different AI tools for EU vs. US clients?",
        categoryId: seededCategories[1]?.id,
        authorId: seededUsers[5]?.id,
        replyCount: 7,
        likes: 19,
        lastReplyAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Recommended certifications for AI in Accounting?",
        content: "Looking to upskill my team in AI technologies. What certifications or training programs have you found most valuable?\n\nI've seen:\n- AI+ Accounting certification\n- Various Coursera/edX courses\n- Vendor-specific training (UiPath, Alteryx, etc.)\n\nWhat's actually worth the investment?",
        categoryId: seededCategories[2]?.id,
        authorId: seededUsers[6]?.id,
        isPinned: false,
        replyCount: 14,
        likes: 38,
        lastReplyAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Career pivot: Traditional auditor to AI specialist?",
        content: "I've been a financial statement auditor for 8 years. Seeing the writing on the wall with AI automation, I want to pivot into an AI-focused role.\n\nWhat skills should I prioritize learning? Python? Statistics? Machine learning?\n\nAlso, is it realistic to make this transition, or should I just focus on becoming an expert in using AI tools rather than building them?",
        categoryId: seededCategories[2]?.id,
        authorId: seededUsers[7]?.id,
        replyCount: 11,
        likes: 33,
        lastReplyAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Python for accountants: Best resources for beginners?",
        content: "Complete Python newbie here. I understand it's becoming essential for data analysis and AI implementation in accounting.\n\nWhat learning resources do you recommend for someone with zero programming background? Prefer practical, accounting-focused tutorials over general programming courses.\n\nAlso, how long did it take you to become proficient enough to use it in your daily work?",
        categoryId: seededCategories[2]?.id,
        authorId: seededUsers[8]?.id,
        replyCount: 10,
        likes: 29,
        lastReplyAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    ];

    const insertedDiscussions = await db.insert(forumDiscussions).values(discussionsData).returning();
    console.log("✓ Seeded forum discussions");

    // Create forum replies
    const repliesData = [
      // Replies for first discussion (GPT-4 in tax prep)
      {
        content: "We implemented GPT-4 last quarter for initial document review. Key lesson: ALWAYS have human verification. We use it to flag potential issues and summarize complex documents, but a CPA reviews every output.\n\nFor privacy, we use Azure OpenAI with our own dedicated instance - no data leaves our environment.",
        discussionId: insertedDiscussions[0]?.id,
        authorId: seededUsers[1]?.id,
        likes: 12,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        content: "This is exactly what we're looking for! Do you mind sharing which document types you've had the most success with? I'm thinking W-2s, 1099s, and K-1s would be good candidates.",
        discussionId: insertedDiscussions[0]?.id,
        authorId: seededUsers[0]?.id,
        likes: 5,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3600000),
      },
      {
        content: "We've had great results with 1099s and mortgage interest statements. K-1s are trickier - the format varies too much between issuers. GPT-4 sometimes misinterprets the line items.\n\nW-2s work well but honestly, those are already so standardized that traditional OCR is just as effective and cheaper.",
        discussionId: insertedDiscussions[0]?.id,
        authorId: seededUsers[1]?.id,
        likes: 8,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        content: "Important compliance note: Make sure you update your engagement letters to disclose AI usage. Some clients may have concerns about their data being processed by AI systems.\n\nWe also added a section to our data security policy specifically addressing AI tools.",
        discussionId: insertedDiscussions[0]?.id,
        authorId: seededUsers[3]?.id,
        likes: 15,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 7200000),
      },
      {
        content: "Great point about engagement letters. We added similar language and surprisingly, clients have been very receptive. Many see it as a sign that we're staying current with technology.",
        discussionId: insertedDiscussions[0]?.id,
        authorId: seededUsers[0]?.id,
        likes: 6,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },

      // Replies for second discussion (ML model accuracy)
      {
        content: "87% is actually quite good, but the real question is: what's the cost of your false negatives vs. false positives?\n\nIf your model misses high-risk transactions (false negatives), that's a bigger problem than flagging low-risk ones for review (false positives).\n\nI'd focus on optimizing your recall metric specifically for high-risk transactions, even if it means lower overall accuracy.",
        discussionId: insertedDiscussions[1]?.id,
        authorId: seededUsers[2]?.id,
        likes: 18,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        content: "This is a great perspective. You're right - I've been too focused on overall accuracy. Let me check our confusion matrix for the high-risk class specifically.\n\nCurrent recall for high-risk transactions is 92%, precision is 81%. Does that sound more reasonable?",
        discussionId: insertedDiscussions[1]?.id,
        authorId: seededUsers[1]?.id,
        likes: 9,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 5400000),
      },
      {
        content: "92% recall is solid! I'd be comfortable deploying that. Just make sure you're monitoring performance over time - models can drift as transaction patterns change.\n\nWe retrain quarterly and have seen performance degrade by 3-5% between retraining cycles.",
        discussionId: insertedDiscussions[1]?.id,
        authorId: seededUsers[2]?.id,
        likes: 13,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },

      // Replies for third discussion (RPA vs AI)
      {
        content: "We did a pilot with both. For straightforward AP tasks (invoice entry, payment processing), RPA won on cost and reliability. We're using UiPath and it's been rock solid.\n\nAI came out ahead for exception handling and vendor communication. Those unstructured scenarios are where AI shines.\n\nOur hybrid approach: RPA for the 80% of routine cases, AI for the 20% of exceptions.",
        discussionId: insertedDiscussions[2]?.id,
        authorId: seededUsers[4]?.id,
        likes: 14,
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        content: "Hybrid approach makes sense. What AI platform are you using for exception handling?",
        discussionId: insertedDiscussions[2]?.id,
        authorId: seededUsers[2]?.id,
        likes: 4,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        content: "We're using a combination of Azure Document Intelligence for invoice extraction and GPT-4 for interpreting non-standard formats and vendor queries. Works well together.",
        discussionId: insertedDiscussions[2]?.id,
        authorId: seededUsers[4]?.id,
        likes: 10,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 3600000),
      },

      // Replies for fourth discussion (SEC AI disclosure)
      {
        content: "We've started maintaining an \"AI Register\" that documents:\n- Each AI system used\n- What it's used for\n- Who oversees it\n- How outputs are validated\n- Risk assessment\n\nBasically treating it like a controls documentation exercise. Our external auditors have reviewed it and think it's a solid approach for the eventual SEC requirements.",
        discussionId: insertedDiscussions[3]?.id,
        authorId: seededUsers[5]?.id,
        likes: 22,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        content: "This is incredibly helpful! Would you be willing to share a template (even with redactions)? I'd love to see the structure you're using.",
        discussionId: insertedDiscussions[3]?.id,
        authorId: seededUsers[3]?.id,
        likes: 11,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 7200000),
      },
      {
        content: "I can put together a sanitized template. Will post it in the Resources section this week!",
        discussionId: insertedDiscussions[3]?.id,
        authorId: seededUsers[5]?.id,
        likes: 19,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },

      // Replies for seventh discussion (certifications)
      {
        content: "I completed the AI+ Accounting certification last year. Honestly, it was pretty high-level and theoretical. Useful for understanding concepts but not very practical.\n\nI got more value from vendor-specific training. If you're using specific tools (UiPath, Alteryx, Power BI), invest in their certification programs. Much more applicable to daily work.",
        discussionId: insertedDiscussions[6]?.id,
        authorId: seededUsers[8]?.id,
        likes: 16,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        content: "For my team, we did a combination approach:\n1. General AI literacy training (free Coursera courses)\n2. Vendor certifications for the tools we actually use\n3. Internal workshops where team members share what they've learned\n\nThe internal workshops have been surprisingly valuable - real examples from our own work.",
        discussionId: insertedDiscussions[6]?.id,
        authorId: seededUsers[9]?.id,
        likes: 13,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 14400000),
      },

      // Replies for eighth discussion (career pivot)
      {
        content: "I made this exact transition 3 years ago. Here's my honest take:\n\nYou don't need to become a data scientist. Focus on being a bridge between technical teams and accounting/audit teams. Your domain expertise is MORE valuable than deep technical skills.\n\nLearn enough Python to understand what's possible and communicate with developers. Take a basic stats course. But spend most of your energy on understanding how AI can solve accounting problems.\n\nThat combination - deep accounting knowledge + basic AI literacy - is actually more rare and valuable than pure technical skills.",
        discussionId: insertedDiscussions[7]?.id,
        authorId: seededUsers[2]?.id,
        likes: 25,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        content: "This is really encouraging! I've been stressing about becoming a Python expert. What you're describing sounds much more achievable and honestly more interesting to me.\n\nDid you find it hard to convince employers that this skillset was valuable?",
        discussionId: insertedDiscussions[7]?.id,
        authorId: seededUsers[7]?.id,
        likes: 8,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        content: "Not at all. Firms are desperate for people who understand both worlds. I had multiple offers. Your audit experience is a huge asset - you understand controls, risk, accuracy requirements. That's gold when implementing AI in audit workflows.",
        discussionId: insertedDiscussions[7]?.id,
        authorId: seededUsers[2]?.id,
        likes: 14,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 10800000),
      },

      // Replies for ninth discussion (Python for accountants)
      {
        content: "I recommend \"Automate the Boring Stuff with Python\" as a starting point. Not accounting-specific, but teaches practical automation which is exactly what you need.\n\nThen move to \"Python for Data Analysis\" by Wes McKinney. That's where it gets useful for accounting work.\n\nTook me about 6 months of occasional practice to feel comfortable, another 6 months to use it regularly in my work.",
        discussionId: insertedDiscussions[8]?.id,
        authorId: seededUsers[6]?.id,
        likes: 17,
        createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      },
      {
        content: "For accounting-specific Python, check out the tutorials on the Digital Ledger Resources page! There are some great templates for common tasks like reconciliations, ratio analysis, and financial statement formatting.\n\nStart with those - seeing Python solve actual accounting problems made it click for me way faster than abstract tutorials.",
        discussionId: insertedDiscussions[8]?.id,
        authorId: seededUsers[9]?.id,
        likes: 21,
        createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000 + 7200000),
      },
    ];

    await db.insert(forumReplies).values(repliesData);
    console.log("✓ Seeded forum replies");

    // Update discussion count in categories
    await db
      .update(forumCategories)
      .set({ discussionCount: 3 })
      .where(sql`${forumCategories.id} = ${seededCategories[0]?.id}`);
    
    await db
      .update(forumCategories)
      .set({ discussionCount: 3 })
      .where(sql`${forumCategories.id} = ${seededCategories[1]?.id}`);
    
    await db
      .update(forumCategories)
      .set({ discussionCount: 3 })
      .where(sql`${forumCategories.id} = ${seededCategories[2]?.id}`);
    
    console.log("✓ Updated category discussion counts");

    console.log("Database seeding completed successfully!");
    return { success: true, message: "Database seeded successfully" };
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
